import {
    computed,
    makeObservable,
    observable,
    runInAction,
} from 'mobx';

import { type RootStore } from '../root-store';
import { Websites, WebsitesMap, Website } from '../../../common/websites';

/**
 * Exposes persisted website settings as observable options-page state.
 */
export class SettingsStore {
    private rootStore: RootStore;

    @observable websites: WebsitesMap = {};

    @observable newWebsite: string = '';

    /**
     * Connects the options settings to their root store and enables observation.
     *
     * @param rootStore - Store that owns the options-page state.
     */
    constructor(rootStore: RootStore) {
        this.rootStore = rootStore;
        makeObservable(this);
    }

    /**
     * Replaces the observable list with the current stored entries.
     *
     * @returns Resolves after the loaded settings have been applied.
     */
    async loadWebsites() {
        const websites = await Websites.getWebsites();
        runInAction(() => {
            this.websites = websites;
        });
    }

    /**
     * Adds a website and refreshes the displayed list after saving.
     *
     * @param value - Hostname or URL entered by the user.
     * @returns Resolves after the saved list has loaded.
     */
    async addNewWebsite(value: string) {
        await Websites.addWebsite(value);
        await this.loadWebsites();
    }

    /**
     * Removes a blocked website and refreshes the displayed list.
     *
     * @param value - Normalized hostname of the entry to remove.
     * @returns Resolves after the remaining list has loaded.
     */
    async deleteWebsite(value: string) {
        await Websites.deleteWebsite(value);
        await this.loadWebsites();
    }

    /**
     * Updates a blocked website and applies the saved map directly to the observable list.
     *
     * @param originalHostname - Existing normalized hostname to replace.
     * @param rawWebsite - New hostname or URL to normalize and save.
     * @returns Resolves after the saved list is displayed without another storage read.
     * @throws If validation or saving fails.
     */
    async updateWebsite(originalHostname: string, rawWebsite: string) {
        const websites = await Websites.updateWebsite(originalHostname, rawWebsite);
        runInAction(() => {
            this.websites = websites;
        });
    }

    /**
     * Changes an entry's blocking state and refreshes the displayed list.
     *
     * @param hostname - Normalized hostname of the saved entry.
     * @param enabled - Whether navigation to this website should be blocked.
     * @returns Resolves after the updated list has loaded.
     */
    async setWebsiteEnabled(hostname: string, enabled: boolean) {
        await Websites.setWebsiteEnabled(hostname, enabled);
        await this.loadWebsites();
    }

    /**
     * Provides the saved entries and their blocking states for the website list.
     *
     * @returns Website entries in their stored order.
     */
    @computed
    get websitesList(): Website[] {
        return Object.values(this.websites);
    }
}
