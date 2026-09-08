import { BlockDurationError } from './block-duration-error';
import { Storage } from './storage';
import { getHostname } from './utils/url';
import { WEBSITE_ERROR_CODE, WebsiteError } from './website-error';

/**
 * A saved website with independent blocking preferences and an optional deadline.
 */
export type Website = {
    /**
     * Normalized hostname used for navigation matching.
     */
    hostname: string;
    /**
     * Whether blocking is enabled; missing flags in older entries mean enabled.
     */
    enabled?: boolean;
    /**
     * Absolute expiration in milliseconds, omitted for permanent entries.
     */
    blockedUntil?: number;
};
/**
 * Visible saved entries indexed by normalized hostname.
 */
export type WebsitesMap = Record<string, Website>;
/**
 * Persisted entry metadata that keeps a renamed site in its original list position.
 */
type StoredWebsite = Website & {
    /**
     * Stable ordering value; legacy entries derive their position from the old map.
     */
    position?: number;
};

/**
 * Checks whether an entry currently blocks navigation.
 *
 * @param website - Saved entry, if one exists.
 * @param now - Wall-clock time to compare with the deadline.
 * @returns Whether blocking is enabled and the deadline has not elapsed.
 */
export function isWebsiteBlocked(website: Website | null | undefined, now = Date.now()): boolean {
    return !!website && website.enabled !== false
        && (website.blockedUntil === undefined || website.blockedUntil > now);
}

/**
 * Stores independent website records while reading the legacy map without rewriting it.
 */
export class Websites {
    private static LEGACY_STORAGE_KEY = 'websites';

    private static STORAGE_PREFIX = 'website:';

    /**
     * Serializes changes to overlapping hostnames in this browsing session.
     * Independent hosts remain concurrent; sorted locks also protect both sides of a rename.
     *
     * @param hostnames - Normalized hosts affected by the mutation.
     * @param operation - Read and write to perform while all affected hosts are locked.
     * @returns The confirmed website list returned by the mutation.
     */
    private static withWebsiteLocks(hostnames: string[], operation: () => Promise<WebsitesMap>): Promise<WebsitesMap> {
        const hosts = Array.from(new Set(hostnames)).sort();
        /**
         * Acquires each host in stable order before starting the storage operation.
         *
         * @param index - Next host to lock.
         * @returns The mutation result after releasing every acquired lock.
         */
        const acquire = (index: number): Promise<WebsitesMap> => {
            if (index === hosts.length) {
                return operation();
            }
            return navigator.locks.request(`website-blocker:website:${hosts[index]}`, () => acquire(index + 1));
        };
        return acquire(0);
    }

    /**
     * Reads and orders unexpired records, including disabled entries and internal positions.
     *
     * @returns The merged records, with per-host tombstones and deadlines overriding legacy values.
     */
    private static async readEntries(): Promise<Record<string, StoredWebsite>> {
        const stored = await Storage.getAll();
        const websites: Record<string, StoredWebsite | null> = {
            ...(stored[Websites.LEGACY_STORAGE_KEY] as WebsitesMap || {}),
        };
        Object.entries(stored).forEach(([key, value]) => {
            if (key.startsWith(Websites.STORAGE_PREFIX)) {
                websites[key.slice(Websites.STORAGE_PREFIX.length)] = value as StoredWebsite | null;
            }
        });
        const now = Date.now();
        return Object.fromEntries(Object.entries(websites)
            .flatMap(([hostname, website], index) => {
                if (!website || (website.blockedUntil !== undefined && website.blockedUntil <= now)) {
                    return [];
                }
                return [[hostname, { ...website, position: website.position ?? index }] as const];
            })
            .sort(([, first], [, second]) => first.position - second.position));
    }

    /**
     * Removes internal ordering metadata from the public list.
     *
     * @param websites - Ordered stored entries to present to callers.
     * @returns Entries containing only user-visible website preferences.
     */
    private static visibleEntries(websites: Record<string, StoredWebsite>): WebsitesMap {
        return Object.fromEntries(Object.entries(websites).map(([hostname, { position, ...website }]) => {
            return [hostname, website];
        }));
    }

    /**
     * Adds a website for a positive number of whole minutes or indefinitely.
     *
     * @param rawWebsite - Hostname or URL to normalize.
     * @param durationMinutes - Optional positive whole-minute duration.
     * @returns The confirmed list after the write, without a fallible read after saving.
     * @throws If input is invalid, an unexpired entry exists, or storage fails.
     */
    public static async addWebsite(rawWebsite: string, durationMinutes?: number): Promise<WebsitesMap> {
        const hostname = getHostname(rawWebsite);
        if (!hostname) {
            throw new WebsiteError(WEBSITE_ERROR_CODE.Invalid, rawWebsite);
        }
        if (durationMinutes !== undefined && (!Number.isSafeInteger(durationMinutes) || durationMinutes <= 0)) {
            throw new BlockDurationError('Duration must be a positive whole number of minutes.');
        }
        return Websites.withWebsiteLocks([hostname], async () => {
            const websites = await Websites.readEntries();
            if (websites[hostname]) {
                throw new WebsiteError(WEBSITE_ERROR_CODE.Duplicate, hostname);
            }
            const position = Math.max(
                Date.now(),
                ...Object.values(websites).map((website) => (website.position ?? 0) + 1),
            );
            const website: StoredWebsite = { hostname, enabled: true, position };
            if (durationMinutes !== undefined) {
                const blockedUntil = Date.now() + durationMinutes * 60_000;
                if (!Number.isSafeInteger(blockedUntil) || Number.isNaN(new Date(blockedUntil).getTime())) {
                    throw new BlockDurationError('Duration is too long.');
                }
                website.blockedUntil = blockedUntil;
            }
            await Storage.set(`${Websites.STORAGE_PREFIX}${hostname}`, website);
            return Websites.visibleEntries({ ...websites, [hostname]: website });
        });
    }

    /**
     * Renames one entry with a single multi-key write, preserving its deadline, enabled flag and order.
     *
     * @param originalHostname - Existing normalized hostname to rename.
     * @param rawWebsite - New hostname or URL to normalize.
     * @returns The confirmed list, or the current list when the normalized address is unchanged.
     * @throws If input is invalid, the original is absent, a duplicate exists, or storage fails.
     */
    public static async updateWebsite(originalHostname: string, rawWebsite: string): Promise<WebsitesMap> {
        const hostname = getHostname(rawWebsite);
        if (!hostname) {
            throw new WebsiteError(WEBSITE_ERROR_CODE.Invalid, rawWebsite);
        }
        return Websites.withWebsiteLocks([originalHostname, hostname], async () => {
            const websites = await Websites.readEntries();
            const original = websites[originalHostname];
            if (!original) {
                throw new WebsiteError(WEBSITE_ERROR_CODE.Missing, originalHostname);
            }
            if (hostname === originalHostname) {
                return Websites.visibleEntries(websites);
            }
            if (websites[hostname]) {
                throw new WebsiteError(WEBSITE_ERROR_CODE.Duplicate, hostname);
            }
            const renamed = { ...original, hostname };
            await Storage.setMany({
                [`${Websites.STORAGE_PREFIX}${originalHostname}`]: null,
                [`${Websites.STORAGE_PREFIX}${hostname}`]: renamed,
            });
            return Websites.visibleEntries(Object.fromEntries(Object.entries(websites).map(([key, website]) => {
                return key === originalHostname ? [hostname, renamed] : [key, website];
            })));
        });
    }

    /**
     * Deletes one website without overwriting other hosts, including across independent contexts.
     *
     * @param hostname - Normalized hostname to delete.
     * @returns The confirmed remaining list.
     */
    public static async deleteWebsite(hostname: string): Promise<WebsitesMap> {
        return Websites.withWebsiteLocks([hostname], async () => {
            const websites = await Websites.readEntries();
            // A tombstone also prevents a legacy entry from reappearing and keeps ordering metadata stable.
            await Storage.set(`${Websites.STORAGE_PREFIX}${hostname}`, null);
            delete websites[hostname];
            return Websites.visibleEntries(websites);
        });
    }

    /**
     * Updates blocking without changing the saved deadline or position.
     *
     * @param hostname - Normalized hostname to change.
     * @param enabled - Whether navigation should be blocked until the existing deadline.
     * @returns The confirmed updated list.
     * @throws If the website no longer exists or storage fails.
     */
    public static async setWebsiteEnabled(hostname: string, enabled: boolean): Promise<WebsitesMap> {
        return Websites.withWebsiteLocks([hostname], async () => {
            const websites = await Websites.readEntries();
            const website = websites[hostname];
            if (!website) {
                throw new WebsiteError(WEBSITE_ERROR_CODE.Missing, hostname);
            }
            const updated = { ...website, enabled };
            await Storage.set(`${Websites.STORAGE_PREFIX}${hostname}`, updated);
            return Websites.visibleEntries({ ...websites, [hostname]: updated });
        });
    }

    /**
     * Loads unexpired entries without changing persisted data; disabled entries remain visible.
     *
     * @returns Saved entries in list order, including enabled and disabled websites.
     */
    public static async getWebsites(): Promise<WebsitesMap> {
        return Websites.visibleEntries(await Websites.readEntries());
    }

    /**
     * Recognizes legacy and per-host updates in browser storage events.
     *
     * @param changes - Changed storage keys received from the browser.
     * @returns Whether the visible website list may have changed.
     */
    public static isWebsiteChange(changes: Record<string, unknown>): boolean {
        return Object.keys(changes).some((key) => {
            return key === Websites.LEGACY_STORAGE_KEY || key.startsWith(Websites.STORAGE_PREFIX);
        });
    }

    public static onChanged = Storage.onChanged;
}
