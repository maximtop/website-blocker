import {
    computed,
    makeObservable,
    observable,
    runInAction,
} from 'mobx';

import { type RootStore } from '../root-store';
import { Websites, WebsitesMap } from '../../../common/websites';

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

    @computed
    get websitesList() {
        return Object.values(this.websites)
            .map((website) => website.hostname);
    }
}
