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

    private websitesRevision = 0;

    websites: WebsitesMap = {};

    newWebsite: string = '';

    constructor(rootStore: RootStore) {
        this.rootStore = rootStore;
        makeObservable(this, {
            websites: observable,
            newWebsite: observable,
            websitesList: computed,
        });
    }

    private updateWebsites(websites: WebsitesMap) {
        this.websitesRevision += 1;
        runInAction(() => {
            this.websites = websites;
        });
    }

    observeWebsites(): () => void {
        return Websites.subscribe((websites) => this.updateWebsites(websites));
    }

    async loadWebsites() {
        this.websitesRevision += 1;
        const revision = this.websitesRevision;
        try {
            const websites = await Websites.getWebsites();
            if (revision === this.websitesRevision) {
                this.updateWebsites(websites);
            }
        } catch (error) {
            if (revision === this.websitesRevision) {
                throw error;
            }
        }
    }

    async addNewWebsite(value: string) {
        this.updateWebsites(await Websites.addWebsite(value));
    }

    async deleteWebsite(value: string) {
        this.updateWebsites(await Websites.deleteWebsite(value));
    }

    async setWebsiteEnabled(hostname: string, enabled: boolean) {
        this.updateWebsites(await Websites.setWebsiteEnabled(hostname, enabled));
    }

    get websitesList(): Website[] {
        return Object.values(this.websites);
    }
}
