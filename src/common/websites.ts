import { Storage } from './storage';
import { getHostname } from './utils/url';

export type Website = {
    hostname: string;
    /** Absolute expiry time in milliseconds. Omitted for permanent blocks. */
    blockedUntil?: number;
};
export type WebsitesMap = Record<string, Website>;

export function isWebsiteBlocked(website: Website | null | undefined, now = Date.now()): boolean {
    return !!website && (website.blockedUntil === undefined || website.blockedUntil > now);
}

export class Websites {
    private static LEGACY_STORAGE_KEY = 'websites';

    private static STORAGE_PREFIX = 'website:';

    public static async addWebsite(rawWebsite: string, durationMinutes?: number): Promise<void> {
        const hostname = getHostname(rawWebsite);
        if (!hostname) {
            throw new Error(`Invalid website: ${rawWebsite}`);
        }

        if (durationMinutes !== undefined && (!Number.isSafeInteger(durationMinutes) || durationMinutes <= 0)) {
            throw new Error('Duration must be a positive whole number of minutes.');
        }

        const websites = await Websites.getWebsites();
        if (websites[hostname]) {
            throw new Error(`Website already exists in the list: ${websites[hostname].hostname}`);
        }

        const website: Website = { hostname };
        if (durationMinutes !== undefined) {
            const blockedUntil = Date.now() + durationMinutes * 60_000;
            if (!Number.isSafeInteger(blockedUntil) || Number.isNaN(new Date(blockedUntil).getTime())) {
                throw new Error('Duration is too long.');
            }
            website.blockedUntil = blockedUntil;
        }

        // Independent keys preserve concurrent changes to different hosts, including across incognito workers.
        await Storage.set(`${Websites.STORAGE_PREFIX}${hostname}`, website);
    }

    public static async deleteWebsite(hostname: string): Promise<void> {
        const legacyWebsites = await Storage.get(Websites.LEGACY_STORAGE_KEY) as WebsitesMap || {};
        const key = `${Websites.STORAGE_PREFIX}${hostname}`;
        if (Object.hasOwn(legacyWebsites, hostname)) {
            // Keep the legacy map read-only; the tombstone prevents its entry from reappearing on future reads.
            await Storage.set(key, null);
        } else {
            await Storage.remove(key);
        }
    }

    /**
     * Returns active blocks without writing to synchronized storage on reads.
     * Per-host values (including expiry and deletion) override the legacy map.
     * Expired values remain until the same host is added again or deleted, so cleanup cannot race with other edits.
     */
    public static async getWebsites(): Promise<WebsitesMap> {
        const stored = await Storage.getAll();
        const websites: Record<string, Website | null> = {
            ...(stored[Websites.LEGACY_STORAGE_KEY] as WebsitesMap || {}),
        };
        Object.entries(stored).forEach(([key, value]) => {
            if (key.startsWith(Websites.STORAGE_PREFIX)) {
                websites[key.slice(Websites.STORAGE_PREFIX.length)] = value as Website | null;
            }
        });
        const now = Date.now();
        return Object.fromEntries(Object.entries(websites)
            .filter(([, website]) => isWebsiteBlocked(website, now)));
    }

    public static isWebsiteChange(changes: Record<string, unknown>): boolean {
        return Object.keys(changes).some((key) => {
            return key === Websites.LEGACY_STORAGE_KEY || key.startsWith(Websites.STORAGE_PREFIX);
        });
    }

    public static onChanged = Storage.onChanged;
}
