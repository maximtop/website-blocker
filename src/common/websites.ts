import { type Storage as BrowserStorage } from 'webextension-polyfill';

import { Storage } from './storage';
import { canEditWebsiteSettings } from './settings-context';
import { getHostname } from './utils/url';

export type Website = {
    hostname: string;
    // Websites saved before the toggle was added are enabled by default.
    enabled?: boolean;
};
export type WebsitesMap = Record<string, Website>;

export class Websites {
    private static STORAGE_KEY = 'websites';

    private static MUTATION_LOCK = 'website-blocker:websites';

    private static async mutateWebsites(update: (websites: WebsitesMap) => WebsitesMap): Promise<WebsitesMap> {
        if (!canEditWebsiteSettings()) {
            throw new Error('Open settings in a regular window to edit your website list.');
        }

        return navigator.locks.request(Websites.MUTATION_LOCK, async () => {
            const websites = update(await Websites.getWebsites());
            await Storage.set(Websites.STORAGE_KEY, websites);
            return websites;
        });
    }

    public static async addWebsite(rawWebsite: string): Promise<WebsitesMap> {
        const hostname = getHostname(rawWebsite);
        if (!hostname) {
            throw new Error(`Invalid website: ${rawWebsite}`);
        }

        return Websites.mutateWebsites((websites) => {
            if (websites[hostname]) {
                throw new Error(`Website already exists in the list: ${websites[hostname].hostname}`);
            }
            return { ...websites, [hostname]: { hostname, enabled: true } };
        });
    }

    public static async deleteWebsite(hostname: string): Promise<WebsitesMap> {
        return Websites.mutateWebsites((websites) => {
            const updatedWebsites = { ...websites };
            delete updatedWebsites[hostname];
            return updatedWebsites;
        });
    }

    public static async setWebsiteEnabled(hostname: string, enabled: boolean): Promise<WebsitesMap> {
        return Websites.mutateWebsites((websites) => {
            const website = websites[hostname];
            if (!website) {
                throw new Error(`Website does not exist in the list: ${hostname}`);
            }

            return { ...websites, [hostname]: { ...website, enabled } };
        });
    }

    /**
     * Returns a map of websites
     */
    public static async getWebsites(): Promise<WebsitesMap> {
        const websites = await Storage.get(Websites.STORAGE_KEY) as WebsitesMap || {};
        return websites;
    }

    public static subscribe(listener: (websites: WebsitesMap) => void): () => void {
        const handleChanged = (changes: BrowserStorage.StorageAreaSyncOnChangedChangesType) => {
            const change = changes[Websites.STORAGE_KEY];
            if (change) {
                listener(change.newValue as WebsitesMap || {});
            }
        };
        Storage.onChanged.addListener(handleChanged);
        return () => Storage.onChanged.removeListener(handleChanged);
    }

    public static onChanged = Storage.onChanged;
}
