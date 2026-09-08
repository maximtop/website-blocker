import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { Storage } from '../../src/common/storage';
import {
    isWebsiteBlocked,
    Website,
    Websites,
    WebsitesMap,
} from '../../src/common/websites';

vi.mock('../../src/common/storage', () => ({
    Storage: {
        get: vi.fn(),
        getAll: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
        onChanged: { addListener: vi.fn() },
    },
}));

const NOW = Date.UTC(2026, 8, 7, 12);
const MINUTE = 60_000;
let persisted: WebsitesMap | undefined;
let overrides: Record<string, Website | null>;

beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    persisted = undefined;
    overrides = {};
    vi.mocked(Storage.get).mockImplementation(async () => structuredClone(persisted));
    vi.mocked(Storage.getAll).mockImplementation(async () => structuredClone({ websites: persisted, ...overrides }));
    vi.mocked(Storage.set).mockImplementation(async (key, value) => {
        overrides[key] = structuredClone(value);
    });
    vi.mocked(Storage.remove).mockImplementation(async (key) => {
        delete overrides[key];
    });
});

afterEach(() => {
    vi.useRealTimers();
});

describe('isWebsiteBlocked', () => {
    it('keeps legacy entries permanently blocked and treats absent entries as unblocked', () => {
        expect(isWebsiteBlocked({ hostname: 'example.com' }, NOW)).toBe(true);
        expect(isWebsiteBlocked(undefined, NOW)).toBe(false);
    });

    it('stops blocking exactly at the stored expiration time', () => {
        const website: Website = { hostname: 'example.com', blockedUntil: NOW + MINUTE };
        expect(isWebsiteBlocked(website, NOW + MINUTE - 1)).toBe(true);
        expect(isWebsiteBlocked(website, NOW + MINUTE)).toBe(false);
        expect(isWebsiteBlocked(website, NOW + MINUTE + 1)).toBe(false);
    });

    it('uses the current wall clock when no time is supplied', () => {
        const website: Website = { hostname: 'example.com', blockedUntil: NOW + MINUTE };
        expect(isWebsiteBlocked(website)).toBe(true);
        vi.setSystemTime(NOW + MINUTE);
        expect(isWebsiteBlocked(website)).toBe(false);
    });
});

describe('Websites', () => {
    it('returns an empty map when no websites have been saved', async () => {
        expect(await Websites.getWebsites()).toEqual({});
    });

    it('filters expired entries without changing storage or losing legacy permanent entries', async () => {
        persisted = {
            'permanent.com': { hostname: 'permanent.com' },
            'future.com': { hostname: 'future.com', blockedUntil: NOW + MINUTE },
            'expired.com': { hostname: 'expired.com', blockedUntil: NOW - 1 },
            'boundary.com': { hostname: 'boundary.com', blockedUntil: NOW },
        };
        const original = structuredClone(persisted);

        expect(await Websites.getWebsites()).toEqual({
            'permanent.com': original['permanent.com'],
            'future.com': original['future.com'],
        });
        expect(persisted).toEqual(original);
        expect(Storage.set).not.toHaveBeenCalled();
    });

    it('saves a normalized hostname permanently when no duration is supplied', async () => {
        await Websites.addWebsite('https://www.example.com/articles');

        expect(Storage.set).toHaveBeenCalledWith('website:example.com', {
            hostname: 'example.com', enabled: true, position: NOW,
        });
    });

    it('persists the absolute expiration for a 30 minute block and preserves active entries', async () => {
        persisted = {
            'permanent.com': { hostname: 'permanent.com' },
            'future.com': { hostname: 'future.com', blockedUntil: NOW + MINUTE },
        };

        await Websites.addWebsite('https://www.example.com/articles', 30);

        expect(await Websites.getWebsites()).toEqual({
            'permanent.com': { hostname: 'permanent.com' },
            'future.com': { hostname: 'future.com', blockedUntil: NOW + MINUTE },
            'example.com': { hostname: 'example.com', enabled: true, blockedUntil: NOW + 30 * MINUTE },
        });
    });

    it.each([undefined, NOW + MINUTE])('rejects a duplicate active block expiring at %s', async (blockedUntil) => {
        persisted = { 'example.com': { hostname: 'example.com', blockedUntil } };

        await expect(Websites.addWebsite('https://www.example.com/', 30)).rejects.toThrow('already exists');

        expect(Storage.set).not.toHaveBeenCalled();
        expect(persisted['example.com'].blockedUntil).toBe(blockedUntil);
    });

    it.each([undefined, 30])('allows an expired website to be blocked again for %s minutes', async (duration) => {
        persisted = { 'example.com': { hostname: 'example.com', blockedUntil: NOW } };

        await Websites.addWebsite('example.com', duration);

        expect(await Websites.getWebsites()).toEqual({
            'example.com': duration === undefined
                ? { hostname: 'example.com', enabled: true }
                : { hostname: 'example.com', enabled: true, blockedUntil: NOW + duration * MINUTE },
        });
    });

    it.each([0, -1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER])(
        'rejects invalid duration %s without writing storage',
        async (duration) => {
            persisted = { 'permanent.com': { hostname: 'permanent.com' } };

            await expect(Websites.addWebsite('example.com', duration)).rejects.toThrow();

            expect(Storage.set).not.toHaveBeenCalled();
            expect(persisted).toEqual({ 'permanent.com': { hostname: 'permanent.com' } });
        },
    );

    it('rejects an expiration beyond the supported Date range', async () => {
        const excessiveDuration = Math.ceil((8.64e15 - NOW) / MINUTE) + 1;

        await expect(Websites.addWebsite('example.com', excessiveDuration)).rejects.toThrow();

        expect(Storage.set).not.toHaveBeenCalled();
    });

    it('rejects an invalid hostname without writing storage', async () => {
        await expect(Websites.addWebsite('not a hostname', 30)).rejects.toThrow('Invalid website');
        expect(Storage.set).not.toHaveBeenCalled();
    });

    it('deletes only the requested entry and retains expiration data for the others', async () => {
        persisted = {
            'example.com': { hostname: 'example.com', enabled: true, blockedUntil: NOW + 30 * MINUTE },
            'future.com': { hostname: 'future.com', blockedUntil: NOW + MINUTE },
            'expired.com': { hostname: 'expired.com', blockedUntil: NOW - 1 },
            'permanent.com': { hostname: 'permanent.com' },
        };

        await Websites.deleteWebsite('example.com');

        expect(await Websites.getWebsites()).toEqual({
            'future.com': { hostname: 'future.com', blockedUntil: NOW + MINUTE },
            'permanent.com': { hostname: 'permanent.com' },
        });
        expect(Storage.set).toHaveBeenCalledWith('website:example.com', null);
        expect(persisted['example.com']).toEqual({
            hostname: 'example.com', enabled: true, blockedUntil: NOW + 30 * MINUTE,
        });
    });

    it('overlays per-host entries without falling back to a legacy block after expiry or deletion', async () => {
        persisted = {
            'updated.com': { hostname: 'updated.com' },
            'deleted.com': { hostname: 'deleted.com' },
            'expired.com': { hostname: 'expired.com' },
        };
        overrides = {
            'website:updated.com': { hostname: 'updated.com', blockedUntil: NOW + MINUTE },
            'website:deleted.com': null,
            'website:expired.com': { hostname: 'expired.com', blockedUntil: NOW },
            'website:new.com': { hostname: 'new.com' },
        };

        expect(await Websites.getWebsites()).toEqual({
            'updated.com': { hostname: 'updated.com', blockedUntil: NOW + MINUTE },
            'new.com': { hostname: 'new.com' },
        });
        vi.setSystemTime(NOW + MINUTE);
        expect(await Websites.getWebsites()).toEqual({ 'new.com': { hostname: 'new.com' } });
        expect(Storage.set).not.toHaveBeenCalled();
        expect(Storage.remove).not.toHaveBeenCalled();
    });

    it('deletes a new-format hostname with an independent tombstone', async () => {
        overrides = {
            'website:example.com': { hostname: 'example.com', blockedUntil: NOW + MINUTE },
            'website:other.com': { hostname: 'other.com' },
        };

        await Websites.deleteWebsite('example.com');

        expect(Storage.set).toHaveBeenCalledExactlyOnceWith('website:example.com', null);
        expect(Storage.remove).not.toHaveBeenCalled();
        expect(await Websites.getWebsites()).toEqual({ 'other.com': { hostname: 'other.com' } });
    });

    it.each([null, { hostname: 'example.com', blockedUntil: NOW }])(
        're-adds a deleted or expired override without reviving other legacy entries',
        async (override) => {
            persisted = { 'example.com': { hostname: 'example.com' }, 'other.com': { hostname: 'other.com' } };
            overrides = { 'website:example.com': override, 'website:other.com': null };

            await Websites.addWebsite('example.com', 30);

            expect(await Websites.getWebsites()).toEqual({
                'example.com': { hostname: 'example.com', enabled: true, blockedUntil: NOW + 30 * MINUTE },
            });
            expect(overrides['website:other.com']).toBeNull();
            expect(Storage.set).toHaveBeenCalledExactlyOnceWith('website:example.com', {
                hostname: 'example.com',
                enabled: true,
                position: NOW,
                blockedUntil: NOW + 30 * MINUTE,
            });
        },
    );

    it('rejects a duplicate active per-host block without overwriting its deadline', async () => {
        overrides = { 'website:example.com': { hostname: 'example.com', blockedUntil: NOW + MINUTE } };

        await expect(Websites.addWebsite('example.com', 30)).rejects.toThrow('already exists');

        expect(Storage.set).not.toHaveBeenCalled();
    });

    it('propagates storage read and write failures and permits a later retry', async () => {
        vi.mocked(Storage.getAll).mockRejectedValueOnce(new Error('read failed'));
        await expect(Websites.addWebsite('example.com', 30)).rejects.toThrow('read failed');
        expect(Storage.set).not.toHaveBeenCalled();

        vi.mocked(Storage.set).mockRejectedValueOnce(new Error('write failed'));
        await expect(Websites.addWebsite('example.com', 30)).rejects.toThrow('write failed');
        expect(overrides).toEqual({});

        await Websites.addWebsite('example.com', 30);
        vi.mocked(Storage.set).mockRejectedValueOnce(new Error('delete failed'));
        await expect(Websites.deleteWebsite('example.com')).rejects.toThrow('delete failed');
        expect(await Websites.getWebsites()).toHaveProperty(['example.com']);

        await Websites.deleteWebsite('example.com');
        expect(await Websites.getWebsites()).toEqual({});
    });

    it('keeps legacy entries until a deletion is saved successfully and permits retry', async () => {
        persisted = { 'example.com': { hostname: 'example.com' } };
        vi.mocked(Storage.getAll).mockRejectedValueOnce(new Error('legacy read failed'));

        await expect(Websites.deleteWebsite('example.com')).rejects.toThrow('legacy read failed');
        expect(Storage.set).not.toHaveBeenCalled();
        expect(Storage.remove).not.toHaveBeenCalled();

        vi.mocked(Storage.set).mockRejectedValueOnce(new Error('tombstone write failed'));
        await expect(Websites.deleteWebsite('example.com')).rejects.toThrow('tombstone write failed');
        expect(await Websites.getWebsites()).toEqual(persisted);

        await Websites.deleteWebsite('example.com');
        expect(await Websites.getWebsites()).toEqual({});
        expect(persisted).toEqual({ 'example.com': { hostname: 'example.com' } });
    });

    it('recognizes legacy and per-host changes while ignoring unrelated settings', () => {
        expect(Websites.isWebsiteChange({ websites: { newValue: {} } })).toBe(true);
        expect(Websites.isWebsiteChange({ 'website:example.com': { newValue: null } })).toBe(true);
        expect(Websites.isWebsiteChange({
            'website:example.com': { oldValue: { hostname: 'example.com' } },
        })).toBe(true);
        expect(Websites.isWebsiteChange({ theme: { newValue: 'dark' } })).toBe(false);
        expect(Websites.isWebsiteChange({})).toBe(false);
    });
});
