// @vitest-environment node

import { autorun, configure } from 'mobx';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
    type MockInstance,
} from 'vitest';

import english from '../../src/_locales/en/messages.json';
import russian from '../../src/_locales/ru/messages.json';
import { Storage } from '../../src/common/storage';
import { Websites, WebsitesMap } from '../../src/common/websites';
import { SettingsStore } from '../../src/options/stores/settings-store/SettingsStore';
import { type RootStore } from '../../src/options/stores/root-store';
import { MOBX_ACTION_MODE } from '../../src/options/stores/mobx-config';

vi.mock('../../src/common/storage', () => ({
    Storage: {
        get: vi.fn(),
        getAll: vi.fn(),
        setMany: vi.fn(),
        set: vi.fn(),
        onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
}));

const translations = vi.hoisted(() => ({ getMessage: vi.fn() }));
vi.mock('webextension-polyfill', () => ({ default: { i18n: { getMessage: translations.getMessage } } }));

let persistedWebsites: WebsitesMap;
let overrides: Record<string, unknown>;
let store: SettingsStore;
let warnings: MockInstance;
let diagnostics: MockInstance;

beforeEach(async () => {
    vi.resetAllMocks();
    configure({ enforceActions: MOBX_ACTION_MODE.ALWAYS });
    warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
    diagnostics = vi.spyOn(console, 'error').mockImplementation(() => {});
    persistedWebsites = {
        'old.com': { hostname: 'old.com' },
        'other.com': { hostname: 'other.com' },
    };
    overrides = {};
    vi.mocked(Storage.getAll).mockImplementation(async () => {
        return structuredClone({ websites: persistedWebsites, ...overrides });
    });
    vi.mocked(Storage.set).mockImplementation(async (key, value) => {
        overrides[key] = structuredClone(value);
    });
    vi.mocked(Storage.setMany).mockImplementation(async (values) => {
        Object.assign(overrides, structuredClone(values));
    });
    store = new SettingsStore({} as RootStore);
    await store.loadWebsites();
});

afterEach(() => {
    expect(warnings).not.toHaveBeenCalled();
    vi.restoreAllMocks();
    configure({ enforceActions: MOBX_ACTION_MODE.OBSERVED });
});

describe('SettingsStore website forms', () => {
    it('localizes edit validation without losing the draft or logging an expected input error', async () => {
        translations.getMessage.mockImplementation((key: keyof typeof russian, website?: string) => {
            return russian[key].message.replace('$WEBSITE$', website ?? '');
        });
        store.editWebsite('old.com');
        store.setEditedWebsite('other.com');

        await store.updateWebsite();

        expect(store.editError).toBe(russian.duplicateWebsite.message.replace('$WEBSITE$', '\u2068other.com\u2069'));
        expect(store.editedWebsite).toBe('other.com');
        expect(store.editingWebsite).toBe('old.com');
        expect(Storage.set).not.toHaveBeenCalled();
        expect(diagnostics).not.toHaveBeenCalled();
    });

    it('notifies observers when editing begins and cancelling discards the draft without storage writes', () => {
        const editingStates: Array<string | null> = [];
        const stop = autorun(() => editingStates.push(store.editingWebsite));

        store.editWebsite('old.com');
        store.setEditedWebsite('new.com');
        store.cancelEdit();

        expect(editingStates).toEqual([null, 'old.com', null]);
        expect(store.editedWebsite).toBe('');
        expect(store.editError).toBe('');
        expect(Storage.setMany).not.toHaveBeenCalled();
        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['old.com', 'other.com']);
        stop();
    });

    it('saves a normalized edit once, refreshes the list and closes the editor', async () => {
        store.editWebsite('old.com');
        store.setEditedWebsite('https://www.NEW.com/path');

        await store.updateWebsite();

        expect(Storage.setMany).toHaveBeenCalledTimes(1);
        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['new.com', 'other.com']);
        expect(store.editingWebsite).toBeNull();
        expect(store.editedWebsite).toBe('');
        expect(store.editError).toBe('');
        expect(store.isPending).toBe(false);
    });

    it('closes an unchanged normalized edit without a storage write', async () => {
        store.editWebsite('old.com');
        store.setEditedWebsite('https://WWW.OLD.com/path');

        await store.updateWebsite();

        expect(Storage.setMany).not.toHaveBeenCalled();
        expect(store.editingWebsite).toBeNull();
        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['old.com', 'other.com']);
    });

    it.each([
        ['', 'Invalid website'],
        ['https://www.OTHER.com/path', 'Website already in the list'],
    ])('keeps the original and draft after rejecting %j, and clears the error on input', async (draft, message) => {
        store.editWebsite('old.com');
        store.setEditedWebsite(draft);

        await store.updateWebsite();

        expect(store.editingWebsite).toBe('old.com');
        expect(store.editedWebsite).toBe(draft);
        expect(store.editError).toContain(message);
        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['old.com', 'other.com']);
        expect(store.isPending).toBe(false);
        expect(Storage.setMany).not.toHaveBeenCalled();

        store.setEditedWebsite('new.com');
        expect(store.editError).toBe('');
    });

    it('retains the original website and edit draft after a failed write and allows retrying', async () => {
        vi.mocked(Storage.setMany).mockRejectedValueOnce(new Error('Storage unavailable'));
        store.editWebsite('old.com');
        store.setEditedWebsite('new.com');

        await store.updateWebsite();

        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['old.com', 'other.com']);
        expect(store.editingWebsite).toBe('old.com');
        expect(store.editedWebsite).toBe('new.com');
        expect(store.editError).toBe(english.saveError.message);
        expect(diagnostics).toHaveBeenCalledWith('Failed to save websites', new Error('Storage unavailable'));
        expect(store.isPending).toBe(false);

        await store.updateWebsite();

        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['new.com', 'other.com']);
        expect(store.editingWebsite).toBeNull();
        expect(store.editError).toBe('');
    });

    it('prevents overlapping writes or changes to the draft while saving', async () => {
        let finishWrite: () => void;
        vi.mocked(Storage.setMany).mockImplementationOnce((value) => new Promise<void>((resolve) => {
            finishWrite = () => {
                Object.assign(overrides, structuredClone(value));
                resolve();
            };
        }));
        store.setNewWebsite('added.com');
        store.editWebsite('old.com');
        store.setEditedWebsite('new.com');

        const saving = store.updateWebsite();
        await vi.waitFor(() => expect(Storage.setMany).toHaveBeenCalledTimes(1));
        expect(store.isPending).toBe(true);

        await store.updateWebsite();
        await store.addNewWebsite();
        await store.deleteWebsite('other.com');
        await store.setWebsiteEnabled('other.com', false);
        store.cancelEdit();
        store.editWebsite('other.com');
        store.setEditedWebsite('ignored.com');
        store.setNewWebsite('ignored.com');
        expect(store.editingWebsite).toBe('old.com');
        expect(store.editedWebsite).toBe('new.com');
        expect(store.newWebsite).toBe('added.com');
        expect(Storage.setMany).toHaveBeenCalledTimes(1);

        finishWrite!();
        await saving;

        expect(store.isPending).toBe(false);
        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['new.com', 'other.com']);
    });

    it('resets a vanished editor on reload so another website can be edited', async () => {
        store.editWebsite('old.com');
        store.setEditedWebsite('');
        await store.updateWebsite();
        delete persistedWebsites['old.com'];

        await store.loadWebsites();

        expect(store.editingWebsite).toBeNull();
        expect(store.editedWebsite).toBe('');
        expect(store.editError).toBe('');
        expect(store.isPending).toBe(false);
        store.editWebsite('other.com');
        expect(store.editingWebsite).toBe('other.com');
    });

    it('keeps the edit draft when reading the original website fails', async () => {
        store.editWebsite('old.com');
        store.setEditedWebsite('new.com');
        vi.mocked(Storage.getAll).mockRejectedValueOnce(new Error('Cannot load websites'));

        await store.updateWebsite();

        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['old.com', 'other.com']);
        expect(store.editingWebsite).toBe('old.com');
        expect(store.editedWebsite).toBe('new.com');
        expect(store.editError).toBe(english.saveError.message);
        expect(store.isPending).toBe(false);
        expect(Storage.setMany).not.toHaveBeenCalled();
    });

    it('closes the editor with the committed list even when subsequent storage reads fail', async () => {
        store.editWebsite('old.com');
        store.setEditedWebsite('new.com');
        vi.mocked(Storage.getAll)
            .mockClear()
            .mockResolvedValueOnce({ websites: structuredClone(persistedWebsites) })
            .mockRejectedValue(new Error('Cannot reload'));

        await store.updateWebsite();

        expect(Storage.setMany).toHaveBeenCalledTimes(1);
        expect(Storage.getAll).toHaveBeenCalledTimes(1);
        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['new.com', 'other.com']);
        expect(overrides['website:old.com']).toBeNull();
        expect(overrides['website:new.com']).toMatchObject({ hostname: 'new.com' });
        expect(store.editingWebsite).toBeNull();
        expect(store.editedWebsite).toBe('');
        expect(store.editError).toBe('');
        expect(store.isPending).toBe(false);
    });

    it('preserves a disabled website when its address is edited', async () => {
        persistedWebsites['old.com'].enabled = false;
        await store.loadWebsites();
        store.editWebsite('old.com');
        store.setEditedWebsite('new.com');

        await store.updateWebsite();

        expect(store.websites['new.com']).toEqual({ hostname: 'new.com', enabled: false });
        expect((await Websites.getWebsites())['new.com'].enabled).toBe(false);
    });

    it('updates blocking state and keeps an unrelated edit draft', async () => {
        store.editWebsite('old.com');
        store.setEditedWebsite('new.com');

        await store.setWebsiteEnabled('other.com', false);

        expect(store.websites['other.com'].enabled).toBe(false);
        expect((await Websites.getWebsites())['other.com'].enabled).toBe(false);
        expect(store.editingWebsite).toBe('old.com');
        expect(store.editedWebsite).toBe('new.com');
        expect(store.isPending).toBe(false);
    });

    it('retains blocking state on failure and clears the reported error after retrying', async () => {
        vi.mocked(Storage.set).mockRejectedValueOnce(new Error('Cannot toggle'));

        await store.setWebsiteEnabled('other.com', false);

        expect(store.websites['other.com'].enabled).not.toBe(false);
        expect(store.error).toBe(english.saveError.message);
        expect(store.isPending).toBe(false);

        await store.setWebsiteEnabled('other.com', false);

        expect(store.websites['other.com'].enabled).toBe(false);
        expect(store.error).toBe('');
        expect(store.isPending).toBe(false);
    });

    it('reports an initial list loading failure through the observable form error', async () => {
        vi.mocked(Storage.getAll).mockRejectedValueOnce(new Error('Cannot load websites'));

        await store.loadWebsites().catch((error) => store.reportError(error));

        expect(store.error).toBe(english.loadError.message);
        expect(diagnostics).toHaveBeenCalledWith('Failed to load websites', expect.any(Error));
        expect(store.isPending).toBe(false);
    });

    it('ignores save requests without an active editor and attempts to open a missing website', async () => {
        store.editWebsite('missing.com');
        store.setEditedWebsite('new.com');
        await store.updateWebsite();

        expect(store.editingWebsite).toBeNull();
        expect(store.editedWebsite).toBe('');
        expect(Storage.set).not.toHaveBeenCalled();
    });

    it('adds the current draft, preserving it on validation failure and clearing it after success', async () => {
        store.setNewWebsite('invalid');
        await store.addNewWebsite();

        expect(store.newWebsite).toBe('invalid');
        expect(store.error).toContain('Invalid website');
        expect(store.isPending).toBe(false);

        store.setNewWebsite('https://WWW.ADDED.com/path');
        await store.addNewWebsite();

        expect(store.newWebsite).toBe('');
        expect(store.error).toBe('');
        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['old.com', 'other.com', 'added.com']);
        expect(store.isPending).toBe(false);
    });

    it('reports failed deletion and clears the error after a successful retry', async () => {
        vi.mocked(Storage.set).mockRejectedValueOnce(new Error('Cannot delete'));

        await store.deleteWebsite('other.com');

        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['old.com', 'other.com']);
        expect(store.error).toBe(english.saveError.message);
        expect(store.isPending).toBe(false);

        await store.deleteWebsite('other.com');

        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['old.com']);
        expect(store.error).toBe('');
        expect(store.isPending).toBe(false);
    });
});

describe('timed settings lifecycle', () => {
    it('ignores an obsolete load failure after a successful toggle', async () => {
        let rejectOld!: (error: Error) => void;
        vi.mocked(Storage.getAll).mockImplementationOnce(() => new Promise((_resolve, reject) => {
            rejectOld = reject;
        }));
        const oldLoad = store.loadWebsites();
        await store.setWebsiteEnabled('other.com', false);
        rejectOld(new Error('Obsolete read failed'));

        await expect(oldLoad).resolves.toBeUndefined();
        expect(store.websites['other.com'].enabled).toBe(false);
        expect(store.error).toBe('');
        expect(diagnostics).not.toHaveBeenCalled();
    });

    it('keeps a saved toggle visible when an event-triggered refresh fails', async () => {
        const stop = store.watchWebsites();
        try {
            await store.loadWebsites();
            vi.mocked(Storage.set).mockImplementationOnce(async (key, value) => {
                overrides[key] = structuredClone(value);
                const listener = vi.mocked(Storage.onChanged.addListener).mock.calls[0][0];
                listener({ [key]: { newValue: value } });
                vi.mocked(Storage.getAll).mockRejectedValueOnce(new Error('Refresh failed'));
            });

            await store.setWebsiteEnabled('other.com', false);

            expect(store.websites['other.com'].enabled).toBe(false);
            expect(overrides['website:other.com']).toMatchObject({ enabled: false });
            expect(store.error).toBe(english.loadError.message);
            expect(store.isPending).toBe(false);
        } finally {
            stop();
        }
    });

    it.each(['15', '30', '60', 'custom'])('saves the %s duration from observable form state', async (duration) => {
        const now = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(now);
        store.setNewWebsite('timed.com');
        store.setDuration(duration);
        store.setCustomMinutes('7');
        await store.addNewWebsite();
        expect(store.websites['timed.com'].blockedUntil).toBe(
            now + (duration === 'custom' ? 7 : Number(duration)) * 60_000,
        );
        expect(store.newWebsite).toBe('');
    });

    it.each(['', '0', '-1', '1.5'])('keeps the draft and reports invalid custom minutes %j', async (minutes) => {
        store.setNewWebsite('timed.com');
        store.setDuration('custom');
        store.setCustomMinutes(minutes);
        await store.addNewWebsite();
        expect(store.error).toContain('positive whole');
        expect(diagnostics).not.toHaveBeenCalled();
        expect(store.newWebsite).toBe('timed.com');
        expect(Storage.set).not.toHaveBeenCalled();
    });

    it('expires disabled entries and their editor locally, and disposes the watcher', async () => {
        vi.useFakeTimers();
        const now = Date.now();
        persistedWebsites['old.com'] = { hostname: 'old.com', enabled: false, blockedUntil: now + 1000 };
        const stop = store.watchWebsites();
        try {
            await store.loadWebsites();
            store.editWebsite('old.com');
            const reads = vi.mocked(Storage.getAll).mock.calls.length;
            await vi.advanceTimersByTimeAsync(1000);
            expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['other.com']);
            expect(store.editingWebsite).toBeNull();
            expect(Storage.getAll).toHaveBeenCalledTimes(reads);
        } finally {
            stop();
            expect(Storage.onChanged.removeListener).toHaveBeenCalledWith(
                vi.mocked(Storage.onChanged.addListener).mock.calls[0][0],
            );
            expect(vi.getTimerCount()).toBe(0);
            vi.useRealTimers();
        }
    });

    it('ignores an older options-page read completing after a successful mutation', async () => {
        let resolveOld!: (value: Record<string, unknown>) => void;
        vi.mocked(Storage.getAll).mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
        const oldLoad = store.loadWebsites();
        store.setNewWebsite('added.com');
        await store.addNewWebsite();
        resolveOld({ websites: persistedWebsites });
        await oldLoad;
        expect(store.websitesList.map(({ hostname }) => hostname)).toContain('added.com');
    });

    it('reloads another context change received during a pending local save', async () => {
        const stop = store.watchWebsites();
        try {
            await store.loadWebsites();
            let finishWrite!: () => void;
            vi.mocked(Storage.set).mockImplementationOnce((key, value) => new Promise((resolve) => {
                finishWrite = () => { overrides[key] = value; resolve(); };
            }));
            store.setNewWebsite('local.com');
            const saving = store.addNewWebsite();
            await vi.waitFor(() => expect(Storage.set).toHaveBeenCalledTimes(1));
            overrides['website:remote.com'] = { hostname: 'remote.com', enabled: true };
            const listener = vi.mocked(Storage.onChanged.addListener).mock.calls[0][0];
            listener({ 'website:remote.com': { newValue: overrides['website:remote.com'] } });
            finishWrite();
            await saving;
            expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(
                expect.arrayContaining(['local.com', 'remote.com']),
            );
        } finally {
            stop();
        }
    });
});
