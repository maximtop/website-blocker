import { Storage } from './storage';
import { getHostname } from './utils/url';

export type Website = {
    hostname: string;
    // Websites saved before the toggle was added are enabled by default.
    enabled?: boolean;
};
export type WebsitesMap = Record<string, Website>;

export class Websites {
    private static STORAGE_KEY = 'websites';

    public static async addWebsite(rawWebsite: string): Promise<void> {
        const hostname = getHostname(rawWebsite);
        if (!hostname) {
            throw new Error(`Invalid website: ${rawWebsite}`);
        }

        const websites = await Storage.get(Websites.STORAGE_KEY) as WebsitesMap || {};
        if (websites[hostname]) {
            throw new Error(`Website already exists in the list: ${websites[hostname].hostname}`);
        }
        websites[hostname] = { hostname, enabled: true };

        await Storage.set(Websites.STORAGE_KEY, websites);
    }

    /**
     * Replaces a blocked website in one storage write while preserving the list order.
     *
     * @param originalHostname - Existing normalized hostname to replace.
     * @param rawWebsite - New hostname or URL to normalize and save.
     * @returns The saved map, or the current map without writing when the hostname is unchanged.
     * @throws If the address is invalid, the original is missing, a duplicate exists, or storage fails.
     */
    public static async updateWebsite(originalHostname: string, rawWebsite: string): Promise<WebsitesMap> {
        const hostname = getHostname(rawWebsite);
        if (!hostname) {
            throw new Error(`Invalid website: ${rawWebsite}`);
        }

        const websites = await Storage.get(Websites.STORAGE_KEY) as WebsitesMap || {};
        if (!Object.prototype.hasOwnProperty.call(websites, originalHostname)) {
            throw new Error(`Website no longer exists in the list: ${originalHostname}`);
        }
        if (hostname === originalHostname) {
            return websites;
        }
        if (Object.prototype.hasOwnProperty.call(websites, hostname)) {
            throw new Error(`Website already exists in the list: ${hostname}`);
        }

        const updatedWebsites: WebsitesMap = Object.fromEntries(
            Object.entries(websites).map(([key, website]) => {
                return key === originalHostname
                    ? [hostname, { ...website, hostname }]
                    : [key, website];
            }),
        );
        await Storage.set(Websites.STORAGE_KEY, updatedWebsites);
        return updatedWebsites;
    }

    public static async deleteWebsite(hostname: string): Promise<void> {
        const websites = await Storage.get(Websites.STORAGE_KEY) as WebsitesMap || {};
        delete websites[hostname];
        await Storage.set(Websites.STORAGE_KEY, websites);
    }

    public static async setWebsiteEnabled(hostname: string, enabled: boolean): Promise<void> {
        const websites = await Websites.getWebsites();
        const website = websites[hostname];
        if (!website) {
            throw new Error(`Website does not exist in the list: ${hostname}`);
        }

        websites[hostname] = { ...website, enabled };
        await Storage.set(Websites.STORAGE_KEY, websites);
    }

    /**
     * Returns a map of websites
     */
    public static async getWebsites(): Promise<WebsitesMap> {
        const websites = await Storage.get(Websites.STORAGE_KEY) as WebsitesMap || {};
        return websites;
    }

    public static onChanged = Storage.onChanged;
}
