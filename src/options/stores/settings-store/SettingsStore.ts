import {
    computed,
    makeObservable,
    observable,
    runInAction,
} from 'mobx';

import { type RootStore } from '../root-store';
import { Websites, WebsitesMap, Website } from '../../../common/websites';

export class SettingsStore {
    private rootStore: RootStore;

    @observable websites: WebsitesMap = {};

    @observable newWebsite: string = '';

    constructor(rootStore: RootStore) {
        this.rootStore = rootStore;
        makeObservable(this);
    }

    async loadWebsites() {
        const websites = await Websites.getWebsites();
        runInAction(() => {
            this.websites = websites;
        });
    }

    async addNewWebsite(value: string) {
        await Websites.addWebsite(value);
        await this.loadWebsites();
    }

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

    async setWebsiteEnabled(hostname: string, enabled: boolean) {
        await Websites.setWebsiteEnabled(hostname, enabled);
        await this.loadWebsites();
    }

    @computed
    get websitesList(): Website[] {
        return Object.values(this.websites);
    }
}
