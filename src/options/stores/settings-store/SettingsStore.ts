import {
    computed,
    makeObservable,
    observable,
    runInAction,
} from 'mobx';

import { type RootStore } from '../root-store';
import { isWebsiteBlocked, Websites, WebsitesMap } from '../../../common/websites';

export class SettingsStore {
    private rootStore: RootStore;

    @observable websites: WebsitesMap = {};

    @observable isLoading = true;

    @observable private currentTime = Date.now();

    private loadRequest = 0;

    constructor(rootStore: RootStore) {
        this.rootStore = rootStore;
        makeObservable(this);
    }

    async loadWebsites() {
        this.loadRequest += 1;
        const request = this.loadRequest;
        try {
            const websites = await Websites.getWebsites();
            runInAction(() => {
                if (request === this.loadRequest) {
                    this.websites = websites;
                    this.currentTime = Date.now();
                }
            });
        } finally {
            runInAction(() => {
                if (request === this.loadRequest) {
                    this.isLoading = false;
                }
            });
        }
    }

    watchWebsites(onError: (error: unknown) => void) {
        let disposed = false;
        const reload = () => {
            this.loadWebsites().catch((error: unknown) => {
                if (!disposed) {
                    onError(error);
                }
            });
        };
        const handleStorageChange = (changes: Record<string, unknown>) => {
            if (Websites.isWebsiteChange(changes)) {
                reload();
            }
        };

        Websites.onChanged.addListener(handleStorageChange);
        const timer = window.setInterval(() => {
            runInAction(() => {
                this.currentTime = Date.now();
            });
        }, 1000);
        reload();

        return () => {
            disposed = true;
            window.clearInterval(timer);
            Websites.onChanged.removeListener(handleStorageChange);
        };
    }

    async addNewWebsite(value: string, durationMinutes?: number) {
        await Websites.addWebsite(value, durationMinutes);
        await this.loadWebsites();
    }

    async deleteWebsite(value: string) {
        await Websites.deleteWebsite(value);
        await this.loadWebsites();
    }

    @computed
    get websitesList() {
        return Object.values(this.websites)
            .filter((website) => isWebsiteBlocked(website, this.currentTime));
    }
}
