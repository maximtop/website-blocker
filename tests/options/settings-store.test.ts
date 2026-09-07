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

import { Storage } from '../../src/common/storage';
import { WebsitesMap } from '../../src/common/websites';
import { SettingsStore } from '../../src/options/stores/settings-store/SettingsStore';
import { type RootStore } from '../../src/options/stores/root-store';
import { MOBX_ACTION_MODE } from '../../src/options/stores/mobx-config';

vi.mock('../../src/common/storage', () => ({
    Storage: {
        get: vi.fn(),
        set: vi.fn(),
        onChanged: { addListener: vi.fn() },
    },
}));

let persistedWebsites: WebsitesMap;
let store: SettingsStore;
let warnings: MockInstance;

beforeEach(async () => {
    vi.resetAllMocks();
    configure({ enforceActions: MOBX_ACTION_MODE.ALWAYS });
    warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
    persistedWebsites = {
        'old.com': { hostname: 'old.com' },
        'other.com': { hostname: 'other.com' },
    };
    vi.mocked(Storage.get).mockImplementation(async () => structuredClone(persistedWebsites));
    vi.mocked(Storage.set).mockImplementation(async (_key, value) => {
        persistedWebsites = structuredClone(value);
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
    it('notifies observers when editing begins and cancelling discards the draft without storage writes', () => {
        const editingStates: Array<string | null> = [];
        const stop = autorun(() => editingStates.push(store.editingWebsite));

        store.editWebsite('old.com');
        store.setEditedWebsite('new.com');
        store.cancelEdit();

        expect(editingStates).toEqual([null, 'old.com', null]);
        expect(store.editedWebsite).toBe('');
        expect(store.editError).toBe('');
        expect(Storage.set).not.toHaveBeenCalled();
        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['old.com', 'other.com']);
        stop();
    });

    it('saves a normalized edit once, refreshes the list and closes the editor', async () => {
        store.editWebsite('old.com');
        store.setEditedWebsite('https://www.NEW.com/path');

        await store.updateWebsite();

        expect(Storage.set).toHaveBeenCalledTimes(1);
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

        expect(Storage.set).not.toHaveBeenCalled();
        expect(store.editingWebsite).toBeNull();
        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['old.com', 'other.com']);
    });

    it.each([
        ['', 'Invalid website'],
        ['https://www.OTHER.com/path', 'Website already exists'],
    ])('keeps the original and draft after rejecting %j, and clears the error on input', async (draft, message) => {
        store.editWebsite('old.com');
        store.setEditedWebsite(draft);

        await store.updateWebsite();

        expect(store.editingWebsite).toBe('old.com');
        expect(store.editedWebsite).toBe(draft);
        expect(store.editError).toContain(message);
        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['old.com', 'other.com']);
        expect(store.isPending).toBe(false);
        expect(Storage.set).not.toHaveBeenCalled();

        store.setEditedWebsite('new.com');
        expect(store.editError).toBe('');
    });

    it('retains the original website and edit draft after a failed write and allows retrying', async () => {
        vi.mocked(Storage.set).mockRejectedValueOnce(new Error('Storage unavailable'));
        store.editWebsite('old.com');
        store.setEditedWebsite('new.com');

        await store.updateWebsite();

        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['old.com', 'other.com']);
        expect(store.editingWebsite).toBe('old.com');
        expect(store.editedWebsite).toBe('new.com');
        expect(store.editError).toBe('Storage unavailable');
        expect(store.isPending).toBe(false);

        await store.updateWebsite();

        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['new.com', 'other.com']);
        expect(store.editingWebsite).toBeNull();
        expect(store.editError).toBe('');
    });

    it('prevents overlapping writes or changes to the draft while saving', async () => {
        let finishWrite: () => void;
        vi.mocked(Storage.set).mockImplementationOnce((_key, value) => new Promise<void>((resolve) => {
            finishWrite = () => {
                persistedWebsites = structuredClone(value);
                resolve();
            };
        }));
        store.setNewWebsite('added.com');
        store.editWebsite('old.com');
        store.setEditedWebsite('new.com');

        const saving = store.updateWebsite();
        await vi.waitFor(() => expect(Storage.set).toHaveBeenCalledTimes(1));
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
        expect(Storage.set).toHaveBeenCalledTimes(1);

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
        vi.mocked(Storage.get).mockRejectedValueOnce(new Error('Cannot load websites'));

        await store.updateWebsite();

        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['old.com', 'other.com']);
        expect(store.editingWebsite).toBe('old.com');
        expect(store.editedWebsite).toBe('new.com');
        expect(store.editError).toBe('Cannot load websites');
        expect(store.isPending).toBe(false);
        expect(Storage.set).not.toHaveBeenCalled();
    });

    it('closes the editor with the committed list even when subsequent storage reads fail', async () => {
        store.editWebsite('old.com');
        store.setEditedWebsite('new.com');
        vi.mocked(Storage.get)
            .mockClear()
            .mockResolvedValueOnce(structuredClone(persistedWebsites))
            .mockRejectedValue(new Error('Cannot reload'));

        await store.updateWebsite();

        expect(Storage.set).toHaveBeenCalledTimes(1);
        expect(Storage.get).toHaveBeenCalledTimes(1);
        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['new.com', 'other.com']);
        expect(persistedWebsites).toEqual(store.websites);
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
        expect(persistedWebsites['new.com'].enabled).toBe(false);
    });

    it('updates blocking state and keeps an unrelated edit draft', async () => {
        store.editWebsite('old.com');
        store.setEditedWebsite('new.com');

        await store.setWebsiteEnabled('other.com', false);

        expect(store.websites['other.com'].enabled).toBe(false);
        expect(persistedWebsites['other.com'].enabled).toBe(false);
        expect(store.editingWebsite).toBe('old.com');
        expect(store.editedWebsite).toBe('new.com');
        expect(store.isPending).toBe(false);
    });

    it('retains blocking state on failure and clears the reported error after retrying', async () => {
        vi.mocked(Storage.set).mockRejectedValueOnce(new Error('Cannot toggle'));

        await store.setWebsiteEnabled('other.com', false);

        expect(store.websites['other.com'].enabled).not.toBe(false);
        expect(store.error).toBe('Cannot toggle');
        expect(store.isPending).toBe(false);

        await store.setWebsiteEnabled('other.com', false);

        expect(store.websites['other.com'].enabled).toBe(false);
        expect(store.error).toBe('');
        expect(store.isPending).toBe(false);
    });

    it('reports an initial list loading failure through the observable form error', async () => {
        vi.mocked(Storage.get).mockRejectedValueOnce(new Error('Cannot load websites'));

        await store.loadWebsites().catch((error) => store.reportError(error));

        expect(store.error).toBe('Cannot load websites');
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
        expect(store.error).toBe('Cannot delete');
        expect(store.isPending).toBe(false);

        await store.deleteWebsite('other.com');

        expect(store.websitesList.map(({ hostname }) => hostname)).toEqual(['old.com']);
        expect(store.error).toBe('');
        expect(store.isPending).toBe(false);
    });
});
