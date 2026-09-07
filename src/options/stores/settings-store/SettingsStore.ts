import {
    action,
    computed,
    makeObservable,
    observable,
    runInAction,
} from 'mobx';

import { type RootStore } from '../root-store';
import { Websites, WebsitesMap, Website } from '../../../common/websites';
import { getErrorMessage } from '../../../common/utils/error';

/**
 * Owns the blocked website list, form drafts, validation errors and pending changes.
 */
export class SettingsStore {
    private rootStore: RootStore;

    @observable websites: WebsitesMap = {};

    @observable newWebsite: string = '';

    @observable error: string = '';

    @observable editingWebsite: string | null = null;

    @observable editedWebsite: string = '';

    @observable editError: string = '';

    @observable isPending: boolean = false;

    /**
     * Registers observable form state and actions with MobX.
     *
     * @param rootStore - Parent store for the options page.
     */
    constructor(rootStore: RootStore) {
        this.rootStore = rootStore;
        makeObservable(this);
    }

    /**
     * Reloads blocked websites and closes an editor whose original website disappeared.
     *
     * @returns Resolves after the observable list and editor have been synchronized.
     * @throws If reading persisted websites fails.
     */
    async loadWebsites() {
        const websites = await Websites.getWebsites();
        runInAction(() => {
            this.websites = websites;
            if (this.editingWebsite !== null
                && !Object.prototype.hasOwnProperty.call(websites, this.editingWebsite)) {
                this.resetEditor();
            }
        });
    }

    /**
     * Reports a loading or storage failure above the website list.
     *
     * @param error - Failure whose message should be displayed to the user.
     */
    @action
    reportError(error: unknown) {
        this.error = getErrorMessage(error);
    }

    /**
     * Changes the address to add when no storage operation is pending.
     *
     * @param value - Address entered in the add form.
     */
    @action
    setNewWebsite(value: string) {
        if (!this.isPending) {
            this.newWebsite = value;
        }
    }

    /**
     * Adds the current draft and reports validation or storage errors in the add form.
     *
     * @returns Resolves after the attempt finishes, or immediately when another change is pending.
     */
    @action
    async addNewWebsite() {
        if (this.isPending) {
            return;
        }
        this.isPending = true;
        try {
            await Websites.addWebsite(this.newWebsite);
            await this.loadWebsites();
            runInAction(() => {
                this.newWebsite = '';
                this.error = '';
            });
        } catch (ex) {
            runInAction(() => {
                this.error = getErrorMessage(ex);
            });
        } finally {
            runInAction(() => {
                this.isPending = false;
            });
        }
    }

    /**
     * Deletes a blocked website and reports storage errors above the list.
     *
     * @param hostname - Normalized hostname to remove.
     * @returns Resolves after the attempt finishes, or immediately when another change is pending.
     */
    @action
    async deleteWebsite(hostname: string) {
        if (this.isPending) {
            return;
        }
        this.isPending = true;
        try {
            await Websites.deleteWebsite(hostname);
            await this.loadWebsites();
            runInAction(() => {
                this.error = '';
            });
        } catch (ex) {
            runInAction(() => {
                this.error = getErrorMessage(ex);
            });
        } finally {
            runInAction(() => {
                this.isPending = false;
            });
        }
    }

    /**
     * Changes whether a website is blocked and reports storage failures above the list.
     *
     * @param hostname - Normalized hostname whose blocking state should change.
     * @param enabled - Whether blocking should be enabled for the website.
     * @returns Resolves after the attempt finishes, or immediately when another change is pending.
     */
    @action
    async setWebsiteEnabled(hostname: string, enabled: boolean) {
        if (this.isPending) {
            return;
        }
        this.isPending = true;
        try {
            await Websites.setWebsiteEnabled(hostname, enabled);
            await this.loadWebsites();
            runInAction(() => {
                this.error = '';
            });
        } catch (ex) {
            runInAction(() => {
                this.error = getErrorMessage(ex);
            });
        } finally {
            runInAction(() => {
                this.isPending = false;
            });
        }
    }

    /**
     * Opens an existing website for editing when no other editor or change is active.
     *
     * @param hostname - Normalized hostname whose address should be edited.
     */
    @action
    editWebsite(hostname: string) {
        if (this.isPending || this.editingWebsite !== null
            || !Object.prototype.hasOwnProperty.call(this.websites, hostname)) {
            return;
        }
        this.editingWebsite = hostname;
        this.editedWebsite = hostname;
        this.editError = '';
    }

    /**
     * Updates the active edit draft and clears its previous validation error.
     *
     * @param value - Address entered in the edit form.
     */
    @action
    setEditedWebsite(value: string) {
        if (this.editingWebsite !== null && !this.isPending) {
            this.editedWebsite = value;
            this.editError = '';
        }
    }

    /**
     * Discards the edit draft without writing storage when no change is pending.
     */
    @action
    cancelEdit() {
        if (!this.isPending) {
            this.resetEditor();
        }
    }

    /**
     * Saves the edited address and retains its draft and error if the attempt fails.
     *
     * @returns Resolves after the attempt finishes, or immediately when there is nothing to save.
     */
    @action
    async updateWebsite() {
        if (this.editingWebsite === null || this.isPending) {
            return;
        }
        this.isPending = true;
        try {
            await Websites.updateWebsite(this.editingWebsite, this.editedWebsite);
            await this.loadWebsites();
            runInAction(() => {
                this.resetEditor();
            });
        } catch (ex) {
            runInAction(() => {
                this.editError = getErrorMessage(ex);
            });
        } finally {
            runInAction(() => {
                this.isPending = false;
            });
        }
    }

    /**
     * Clears the editor after cancellation, a successful save or removal of its original website.
     */
    @action
    private resetEditor() {
        this.editingWebsite = null;
        this.editedWebsite = '';
        this.editError = '';
    }

    /**
     * Lists saved websites and their blocking states in persisted order.
     *
     * @returns Websites currently displayed on the options page.
     */
    @computed
    get websitesList(): Website[] {
        return Object.values(this.websites);
    }
}
