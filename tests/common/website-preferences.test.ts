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
        getAll: vi.fn(),
        setMany: vi.fn(),
        set: vi.fn(),
        onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
}));

let persistedWebsites: WebsitesMap;
let overrides: Record<string, unknown>;

beforeEach(() => {
    vi.resetAllMocks();
    persistedWebsites = {};
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
        expect(Storage.set).toHaveBeenLastCalledWith('website:example.com', {
            hostname: 'example.com', enabled: true, position: 0,
        });
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
