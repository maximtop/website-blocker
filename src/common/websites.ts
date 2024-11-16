import { Storage } from './storage';
import { getHostname } from './utils/url';

export type Website = {
    hostname: string;
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
        websites[hostname] = { hostname };

        await Storage.set(Websites.STORAGE_KEY, websites);
    }

    public static async deleteWebsite(hostname: string): Promise<void> {
        const websites = await Storage.get(Websites.STORAGE_KEY) as WebsitesMap || {};
        delete websites[hostname];
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
