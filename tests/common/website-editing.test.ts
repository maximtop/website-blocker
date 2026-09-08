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
        set: vi.fn(),
        onChanged: { addListener: vi.fn() },
    },
}));

let persistedWebsites: WebsitesMap;

beforeEach(() => {
    vi.resetAllMocks();
    persistedWebsites = {
        'first.com': { hostname: 'first.com' },
        'old.com': { hostname: 'old.com' },
        'last.com': { hostname: 'last.com' },
    };
    vi.mocked(Storage.get).mockImplementation(async () => persistedWebsites);
    vi.mocked(Storage.set).mockImplementation(async (_key, value) => {
        persistedWebsites = value;
    });
});

describe('Websites.updateWebsite', () => {
    it('replaces the selected website in one write, preserving other entries and list order', async () => {
        const originalWebsites = persistedWebsites;

        const savedWebsites = await Websites.updateWebsite('old.com', 'new.com');

        expect(Storage.set).toHaveBeenCalledExactlyOnceWith('websites', {
            'first.com': { hostname: 'first.com' },
            'new.com': { hostname: 'new.com' },
            'last.com': { hostname: 'last.com' },
        });
        expect(Object.keys(persistedWebsites)).toEqual(['first.com', 'new.com', 'last.com']);
        expect(savedWebsites).toEqual(persistedWebsites);
        expect(Storage.get).toHaveBeenCalledTimes(1);
        expect(originalWebsites['old.com']).toEqual({ hostname: 'old.com' });
        expect(originalWebsites['new.com']).toBeUndefined();
    });

    it.each([true, false])('preserves the enabled flag %s when renaming a website', async (enabled) => {
        persistedWebsites['old.com'].enabled = enabled;

        await Websites.updateWebsite('old.com', 'new.com');

        expect(persistedWebsites['new.com']).toEqual({ hostname: 'new.com', enabled });
        expect(persistedWebsites['old.com']).toBeUndefined();
    });

    it('normalizes a URL with a www prefix, uppercase hostname, path and query', async () => {
        await Websites.updateWebsite('old.com', 'https://WWW.New.COM/some/path?source=test');

        expect(persistedWebsites['new.com']).toEqual({ hostname: 'new.com' });
        expect(persistedWebsites['old.com']).toBeUndefined();
    });

    it.each(['', 'not-a-website', 'https://'])('rejects invalid input %j without changing storage', async (input) => {
        await expect(Websites.updateWebsite('old.com', input)).rejects.toMatchObject({
            code: WEBSITE_ERROR_CODE.Invalid, website: input,
        });

        expect(Storage.set).not.toHaveBeenCalled();
        expect(persistedWebsites['old.com']).toEqual({ hostname: 'old.com' });
    });

    it('rejects a duplicate normalized hostname and preserves both websites', async () => {
        await expect(Websites.updateWebsite('old.com', 'https://www.FIRST.com/path'))
            .rejects.toMatchObject({ code: WEBSITE_ERROR_CODE.Duplicate, website: 'first.com' });

        expect(Storage.set).not.toHaveBeenCalled();
        expect(persistedWebsites['old.com']).toEqual({ hostname: 'old.com' });
        expect(persistedWebsites['first.com']).toEqual({ hostname: 'first.com' });
    });

    it('accepts an unchanged normalized hostname without writing storage', async () => {
        await expect(Websites.updateWebsite('old.com', 'https://www.OLD.com/path')).resolves.toEqual(persistedWebsites);

        expect(Storage.set).not.toHaveBeenCalled();
        expect(persistedWebsites['old.com']).toEqual({ hostname: 'old.com' });
    });

    it.each(['new.com', 'missing.com'])('rejects a missing original when replacing it with %s', async (input) => {
        await expect(Websites.updateWebsite('missing.com', input))
            .rejects.toMatchObject({ code: WEBSITE_ERROR_CODE.Missing, website: 'missing.com' });

        expect(Storage.set).not.toHaveBeenCalled();
        expect(persistedWebsites['missing.com']).toBeUndefined();
    });

    it('rejects a missing original website when storage is empty', async () => {
        vi.mocked(Storage.get).mockResolvedValue(undefined);

        await expect(Websites.updateWebsite('old.com', 'new.com'))
            .rejects.toMatchObject({ code: WEBSITE_ERROR_CODE.Missing, website: 'old.com' });

        expect(Storage.set).not.toHaveBeenCalled();
    });

    it('keeps the original persisted website when the storage write fails', async () => {
        const originalWebsites = structuredClone(persistedWebsites);
        vi.mocked(Storage.set).mockRejectedValue(new Error('Storage quota exceeded'));

        await expect(Websites.updateWebsite('old.com', 'new.com')).rejects.toThrow('Storage quota exceeded');

        expect(Storage.set).toHaveBeenCalledTimes(1);
        expect(await Websites.getWebsites()).toEqual(originalWebsites);
        expect(persistedWebsites['new.com']).toBeUndefined();
    });
});
