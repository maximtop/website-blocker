// @vitest-environment node

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { Storage } from '../../src/common/storage';
import { canEditWebsiteSettings } from '../../src/common/settings-context';
import { Websites, WebsitesMap } from '../../src/common/websites';

vi.mock('../../src/common/settings-context', () => ({ canEditWebsiteSettings: vi.fn() }));

vi.mock('../../src/common/storage', () => ({
    Storage: {
        get: vi.fn(),
        set: vi.fn(),
        onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
}));

let persistedWebsites: WebsitesMap;

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(canEditWebsiteSettings).mockReturnValue(true);
    persistedWebsites = {};
    vi.mocked(Storage.get).mockImplementation(async () => structuredClone(persistedWebsites));
    vi.mocked(Storage.set).mockImplementation(async (_key, websites) => {
        persistedWebsites = structuredClone(websites);
    });
});

describe('website blocking preferences', () => {
    it('rejects every mutation in private settings before accessing storage but still allows reading', async () => {
        vi.mocked(canEditWebsiteSettings).mockReturnValue(false);
        persistedWebsites = { 'example.com': { hostname: 'example.com', enabled: true } };

        const results = await Promise.allSettled([
            Websites.addWebsite('other.com'),
            Websites.deleteWebsite('example.com'),
            Websites.setWebsiteEnabled('example.com', false),
        ]);

        results.forEach((result) => {
            expect(result).toEqual({
                status: 'rejected',
                reason: new Error('Open settings in a regular window to edit your website list.'),
            });
        });
        expect(Storage.get).not.toHaveBeenCalled();
        expect(Storage.set).not.toHaveBeenCalled();
        expect(await Websites.getWebsites()).toEqual(persistedWebsites);
    });

    it('enables newly added websites', async () => {
        const committed = await Websites.addWebsite('https://www.example.com/some-page');

        expect(committed).toEqual({
            'example.com': { hostname: 'example.com', enabled: true },
        });
        expect(persistedWebsites).toEqual(committed);
        expect(Storage.get).toHaveBeenCalledTimes(1);
    });

    it('persists disabling and re-enabling without removing websites or changing other entries', async () => {
        persistedWebsites = {
            'example.com': { hostname: 'example.com', enabled: true },
            'other.com': { hostname: 'other.com', enabled: false },
            'legacy.com': { hostname: 'legacy.com' },
        };

        const disabled = await Websites.setWebsiteEnabled('example.com', false);

        expect(disabled).toEqual({
            'example.com': { hostname: 'example.com', enabled: false },
            'other.com': { hostname: 'other.com', enabled: false },
            'legacy.com': { hostname: 'legacy.com' },
        });
        expect(persistedWebsites).toEqual(disabled);

        const enabled = await Websites.setWebsiteEnabled('example.com', true);

        expect(enabled).toEqual({
            'example.com': { hostname: 'example.com', enabled: true },
            'other.com': { hostname: 'other.com', enabled: false },
            'legacy.com': { hostname: 'legacy.com' },
        });
        expect(persistedWebsites).toEqual(enabled);
        expect(Storage.get).toHaveBeenCalledTimes(2);
        expect(Storage.set).toHaveBeenCalledTimes(2);
        expect(Storage.set).toHaveBeenLastCalledWith('websites', persistedWebsites);
    });

    it('can disable and re-enable an existing entry without an enabled flag', async () => {
        persistedWebsites = { 'legacy.com': { hostname: 'legacy.com' } };

        await Websites.setWebsiteEnabled('legacy.com', false);
        expect(await Websites.getWebsites()).toEqual({
            'legacy.com': { hostname: 'legacy.com', enabled: false },
        });

        await Websites.setWebsiteEnabled('legacy.com', true);
        expect(await Websites.getWebsites()).toEqual({
            'legacy.com': { hostname: 'legacy.com', enabled: true },
        });
    });

    it('does not recreate a deleted website when a stale toggle is applied', async () => {
        persistedWebsites = { 'other.com': { hostname: 'other.com', enabled: true } };

        await expect(Websites.setWebsiteEnabled('missing.com', false)).rejects.toThrow();

        expect(Storage.set).not.toHaveBeenCalled();
        expect(await Websites.getWebsites()).toEqual({
            'other.com': { hostname: 'other.com', enabled: true },
        });
    });

    it('returns the committed map after deleting a website without another read', async () => {
        persistedWebsites = {
            'example.com': { hostname: 'example.com', enabled: false },
            'other.com': { hostname: 'other.com', enabled: true },
        };

        const committed = await Websites.deleteWebsite('example.com');

        expect(committed).toEqual({ 'other.com': { hostname: 'other.com', enabled: true } });
        expect(persistedWebsites).toEqual(committed);
        expect(Storage.get).toHaveBeenCalledTimes(1);
    });

    it('preserves simultaneous toggles made through independently loaded modules', async () => {
        persistedWebsites = {
            'example.com': { hostname: 'example.com', enabled: true },
            'other.com': { hostname: 'other.com', enabled: true },
        };
        vi.resetModules();
        const { Websites: OtherPageWebsites } = await import('../../src/common/websites');

        await Promise.all([
            Websites.setWebsiteEnabled('example.com', false),
            OtherPageWebsites.setWebsiteEnabled('other.com', false),
        ]);

        expect(persistedWebsites).toEqual({
            'example.com': { hostname: 'example.com', enabled: false },
            'other.com': { hostname: 'other.com', enabled: false },
        });
    });

    it('preserves concurrent additions and toggle changes', async () => {
        persistedWebsites = { 'example.com': { hostname: 'example.com', enabled: true } };

        await Promise.all([
            Websites.setWebsiteEnabled('example.com', false),
            Websites.addWebsite('other.com'),
        ]);

        expect(persistedWebsites).toEqual({
            'example.com': { hostname: 'example.com', enabled: false },
            'other.com': { hostname: 'other.com', enabled: true },
        });
    });

    it('does not let an overlapping toggle recreate a deleted website', async () => {
        persistedWebsites = { 'example.com': { hostname: 'example.com', enabled: true } };
        let finishWrite!: () => void;
        let notifyWriteStarted!: () => void;
        const writeStarted = new Promise<void>((resolve) => { notifyWriteStarted = resolve; });
        const writeAllowed = new Promise<void>((resolve) => { finishWrite = resolve; });
        vi.mocked(Storage.set).mockImplementationOnce(async (_key, websites) => {
            notifyWriteStarted();
            await writeAllowed;
            persistedWebsites = structuredClone(websites);
        });

        const toggle = Websites.setWebsiteEnabled('example.com', false);
        await writeStarted;
        const deletion = Websites.deleteWebsite('example.com');
        try {
            await new Promise<void>((resolve) => { setImmediate(resolve); });
            expect(Storage.get).toHaveBeenCalledTimes(1);
        } finally {
            finishWrite();
            await Promise.all([toggle, deletion]);
        }

        expect(persistedWebsites).toEqual({});
    });

    it('rejects a toggle queued after deletion without recreating the website', async () => {
        persistedWebsites = { 'example.com': { hostname: 'example.com', enabled: true } };

        const results = await Promise.allSettled([
            Websites.deleteWebsite('example.com'),
            Websites.setWebsiteEnabled('example.com', false),
        ]);

        expect(results[0]).toEqual({ status: 'fulfilled', value: {} });
        expect(results[1].status).toBe('rejected');
        expect(persistedWebsites).toEqual({});
        expect(Storage.set).toHaveBeenCalledTimes(1);
    });

    it('releases the lock after a failed write so queued mutations can succeed', async () => {
        persistedWebsites = { 'example.com': { hostname: 'example.com', enabled: true } };
        vi.mocked(Storage.set).mockRejectedValueOnce(new Error('Write failed'));

        const results = await Promise.allSettled([
            Websites.setWebsiteEnabled('example.com', false),
            Websites.addWebsite('other.com'),
        ]);

        expect(results[0]).toEqual({ status: 'rejected', reason: new Error('Write failed') });
        expect(results[1].status).toBe('fulfilled');
        expect(persistedWebsites).toEqual({
            'example.com': { hostname: 'example.com', enabled: true },
            'other.com': { hostname: 'other.com', enabled: true },
        });
    });
});

describe('website storage subscriptions', () => {
    it('delivers website changes and key deletion while ignoring unrelated storage keys', () => {
        const listener = vi.fn();
        const unsubscribe = Websites.subscribe(listener);
        const storageListener = vi.mocked(Storage.onChanged.addListener).mock.calls[0][0];
        const websites = { 'example.com': { hostname: 'example.com', enabled: false } };

        storageListener({ unrelated: { newValue: true } });
        expect(listener).not.toHaveBeenCalled();

        storageListener({ websites: { newValue: websites } });
        expect(listener).toHaveBeenLastCalledWith(websites);

        storageListener({ websites: { oldValue: websites } });
        expect(listener).toHaveBeenLastCalledWith({});
        expect(listener).toHaveBeenCalledTimes(2);

        unsubscribe();
        expect(Storage.onChanged.removeListener).toHaveBeenCalledExactlyOnceWith(storageListener);
    });
});
