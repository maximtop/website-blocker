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
import { WEBSITE_ERROR_CODE } from '../../src/common/website-error';

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
    persistedWebsites = {
        'first.com': { hostname: 'first.com' },
        'old.com': { hostname: 'old.com' },
        'last.com': { hostname: 'last.com' },
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
});

describe('Websites.updateWebsite', () => {
    it('replaces the selected website in one write, preserving other entries and list order', async () => {
        const originalWebsites = persistedWebsites;

        const savedWebsites = await Websites.updateWebsite('old.com', 'new.com');

        expect(Storage.setMany).toHaveBeenCalledExactlyOnceWith({
            'website:old.com': null,
            'website:new.com': { hostname: 'new.com', position: 1 },
        });
        expect(Storage.getAll).toHaveBeenCalledTimes(1);
        const reloaded = await Websites.getWebsites();
        expect(Object.keys(reloaded)).toEqual(['first.com', 'new.com', 'last.com']);
        expect(savedWebsites).toEqual(reloaded);
        expect(originalWebsites['old.com']).toEqual({ hostname: 'old.com' });
        expect(originalWebsites['new.com']).toBeUndefined();
    });

    it.each([true, false])('preserves the enabled flag %s when renaming a website', async (enabled) => {
        persistedWebsites['old.com'].enabled = enabled;

        await Websites.updateWebsite('old.com', 'new.com');

        expect((await Websites.getWebsites())['new.com']).toEqual({ hostname: 'new.com', enabled });
        expect((await Websites.getWebsites())['old.com']).toBeUndefined();
    });

    it('normalizes a URL with a www prefix, uppercase hostname, path and query', async () => {
        await Websites.updateWebsite('old.com', 'https://WWW.New.COM/some/path?source=test');

        expect((await Websites.getWebsites())['new.com']).toEqual({ hostname: 'new.com' });
        expect((await Websites.getWebsites())['old.com']).toBeUndefined();
    });

    it.each(['', 'not-a-website', 'https://'])('rejects invalid input %j without changing storage', async (input) => {
        await expect(Websites.updateWebsite('old.com', input)).rejects.toMatchObject({
            code: WEBSITE_ERROR_CODE.Invalid, website: input,
        });

        expect(Storage.setMany).not.toHaveBeenCalled();
        expect(persistedWebsites['old.com']).toEqual({ hostname: 'old.com' });
    });

    it('rejects a duplicate normalized hostname and preserves both websites', async () => {
        await expect(Websites.updateWebsite('old.com', 'https://www.FIRST.com/path'))
            .rejects.toMatchObject({ code: WEBSITE_ERROR_CODE.Duplicate, website: 'first.com' });

        expect(Storage.setMany).not.toHaveBeenCalled();
        expect(persistedWebsites['old.com']).toEqual({ hostname: 'old.com' });
        expect(persistedWebsites['first.com']).toEqual({ hostname: 'first.com' });
    });

    it('accepts an unchanged normalized hostname without writing storage', async () => {
        await expect(Websites.updateWebsite('old.com', 'https://www.OLD.com/path')).resolves.toEqual(persistedWebsites);

        expect(Storage.setMany).not.toHaveBeenCalled();
        expect(persistedWebsites['old.com']).toEqual({ hostname: 'old.com' });
    });

    it.each(['new.com', 'missing.com'])('rejects a missing original when replacing it with %s', async (input) => {
        await expect(Websites.updateWebsite('missing.com', input))
            .rejects.toMatchObject({ code: WEBSITE_ERROR_CODE.Missing, website: 'missing.com' });

        expect(Storage.setMany).not.toHaveBeenCalled();
        expect(persistedWebsites['missing.com']).toBeUndefined();
    });

    it('rejects a missing original website when storage is empty', async () => {
        vi.mocked(Storage.getAll).mockResolvedValue({});

        await expect(Websites.updateWebsite('old.com', 'new.com'))
            .rejects.toMatchObject({ code: WEBSITE_ERROR_CODE.Missing, website: 'old.com' });

        expect(Storage.setMany).not.toHaveBeenCalled();
    });

    it('keeps the original persisted website when the storage write fails', async () => {
        const originalWebsites = structuredClone(persistedWebsites);
        vi.mocked(Storage.setMany).mockRejectedValue(new Error('Storage quota exceeded'));

        await expect(Websites.updateWebsite('old.com', 'new.com')).rejects.toThrow('Storage quota exceeded');

        expect(Storage.setMany).toHaveBeenCalledTimes(1);
        expect(await Websites.getWebsites()).toEqual(originalWebsites);
        expect((await Websites.getWebsites())['new.com']).toBeUndefined();
    });
});

describe('timed entries with existing website editing', () => {
    it('retains deadline and order across repeated renames, a neighboring deletion, and a new addition', async () => {
        const deadline = Date.now() + 60_000;
        persistedWebsites['old.com'] = { hostname: 'old.com', enabled: false, blockedUntil: deadline };
        await Websites.updateWebsite('old.com', 'new.com');
        await Websites.deleteWebsite('first.com');
        await Websites.updateWebsite('new.com', 'renamed.com');
        await Websites.addWebsite('added.com', 30);

        const reloaded = await Websites.getWebsites();
        expect(Object.keys(reloaded)).toEqual(['renamed.com', 'last.com', 'added.com']);
        expect(reloaded['renamed.com']).toEqual({
            hostname: 'renamed.com', enabled: false, blockedUntil: deadline,
        });
    });

    it('does not extend the deadline when disabling and re-enabling a timed entry', async () => {
        const deadline = Date.now() + 60_000;
        persistedWebsites['old.com'].blockedUntil = deadline;
        await Websites.setWebsiteEnabled('old.com', false);
        await Websites.setWebsiteEnabled('old.com', true);
        expect((await Websites.getWebsites())['old.com']).toEqual({
            hostname: 'old.com', enabled: true, blockedUntil: deadline,
        });
    });
});
