// @vitest-environment node

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { Storage } from '../../src/common/storage';
import { Websites, WebsitesMap } from '../../src/common/websites';

vi.mock('../../src/common/storage', () => ({
    Storage: {
        get: vi.fn(),
        set: vi.fn(),
        onChanged: { addListener: vi.fn() },
    },
}));

let persistedWebsites: WebsitesMap;

beforeEach(() => {
    vi.resetAllMocks();
    persistedWebsites = {};
    vi.mocked(Storage.get).mockImplementation(async () => structuredClone(persistedWebsites));
    vi.mocked(Storage.set).mockImplementation(async (_key, websites) => {
        persistedWebsites = structuredClone(websites);
    });
});

describe('website blocking preferences', () => {
    it('enables newly added websites', async () => {
        await Websites.addWebsite('https://www.example.com/some-page');

        expect(await Websites.getWebsites()).toEqual({
            'example.com': { hostname: 'example.com', enabled: true },
        });
    });

    it('persists disabling and re-enabling without removing websites or changing other entries', async () => {
        persistedWebsites = {
            'example.com': { hostname: 'example.com', enabled: true },
            'other.com': { hostname: 'other.com', enabled: false },
            'legacy.com': { hostname: 'legacy.com' },
        };

        await Websites.setWebsiteEnabled('example.com', false);

        expect(await Websites.getWebsites()).toEqual({
            'example.com': { hostname: 'example.com', enabled: false },
            'other.com': { hostname: 'other.com', enabled: false },
            'legacy.com': { hostname: 'legacy.com' },
        });

        await Websites.setWebsiteEnabled('example.com', true);

        expect(await Websites.getWebsites()).toEqual({
            'example.com': { hostname: 'example.com', enabled: true },
            'other.com': { hostname: 'other.com', enabled: false },
            'legacy.com': { hostname: 'legacy.com' },
        });
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
});
