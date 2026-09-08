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
import { BLOCK_DURATION } from '../../block-duration';

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

    @observable isLoading = true;

    @observable duration: string = BLOCK_DURATION.INDEFINITELY;

    @observable customMinutes: string = BLOCK_DURATION.THIRTY_MINUTES;

    @observable private currentTime = Date.now();

    private loadRequest = 0;

    private refreshAfterOperation = false;

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
        this.loadRequest += 1;
        const request = this.loadRequest;
        try {
            const websites = await Websites.getWebsites();
            runInAction(() => {
                if (request === this.loadRequest) {
                    this.applyWebsites(websites);
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

    /**
     * Applies a confirmed snapshot and closes an editor whose entry disappeared.
     *
     * @param websites - Saved unexpired website preferences.
     */
    @action
    private applyWebsites(websites: WebsitesMap) {
        this.websites = websites;
        this.currentTime = Date.now();
        if (this.editingWebsite !== null && !Object.hasOwn(websites, this.editingWebsite)) {
            this.resetEditor();
        }
    }

    /**
     * Watches storage and advances the local display clock without polling storage.
     *
     * @returns Cleanup for the listener and interval when options closes.
     */
    watchWebsites() {
        let disposed = false;
        /**
         * Reloads the current list and reports errors while the page remains mounted.
         */
        const reload = () => {
            this.loadWebsites().catch((error: unknown) => {
                if (!disposed) {
                    this.reportError(error);
                }
            });
        };
        /**
         * Refreshes website changes immediately or after a pending local mutation.
         *
         * @param changes - Changed browser storage keys.
         */
        const onChanged = action((changes: Record<string, unknown>) => {
            if (Websites.isWebsiteChange(changes)) {
                if (this.isPending) {
                    this.refreshAfterOperation = true;
                } else {
                    reload();
                }
            }
        });
        Websites.onChanged.addListener(onChanged);
        const timer = setInterval(action(() => {
            this.currentTime = Date.now();
            const edited = this.editingWebsite === null ? undefined : this.websites[this.editingWebsite];
            if (edited?.blockedUntil !== undefined && edited.blockedUntil <= this.currentTime && !this.isPending) {
                this.resetEditor();
            }
        }), 1000);
        reload();
        return () => {
            disposed = true;
            this.loadRequest += 1;
            clearInterval(timer);
            Websites.onChanged.removeListener(onChanged);
        };
    }

    /**
     * Selects the duration for the next website without changing existing deadlines.
     *
     * @param value - Preset minutes, custom, or indefinitely.
     */
    @action
    setDuration(value: string) {
        if (!this.isPending) {
            this.duration = value;
        }
    }

    /**
     * Updates the custom minute draft.
     *
     * @param value - User-entered number of minutes.
     */
    @action
    setCustomMinutes(value: string) {
        if (!this.isPending) {
            this.customMinutes = value;
        }
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
        await this.runOperation(async () => {
            const minutes = this.duration === BLOCK_DURATION.INDEFINITELY
                ? undefined : Number(this.duration === BLOCK_DURATION.CUSTOM ? this.customMinutes : this.duration);
            const websites = await Websites.addWebsite(this.newWebsite, minutes);
            this.loadRequest += 1;
            this.applyWebsites(websites);
            runInAction(() => {
                this.newWebsite = '';
                this.error = '';
            });
        });
    }

    /**
     * Deletes a blocked website and reports storage errors above the list.
     *
     * @param hostname - Normalized hostname to remove.
     * @returns Resolves after the attempt finishes, or immediately when another change is pending.
     */
    @action
    async deleteWebsite(hostname: string) {
        await this.runOperation(async () => {
            const websites = await Websites.deleteWebsite(hostname);
            this.loadRequest += 1;
            this.applyWebsites(websites);
            runInAction(() => {
                this.error = '';
            });
        });
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
        await this.runOperation(async () => {
            const websites = await Websites.setWebsiteEnabled(hostname, enabled);
            this.loadRequest += 1;
            this.applyWebsites(websites);
            runInAction(() => {
                this.error = '';
            });
        });
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
        const hostname = this.editingWebsite;
        if (hostname === null) {
            return;
        }
        await this.runOperation(async () => {
            const websites = await Websites.updateWebsite(hostname, this.editedWebsite);
            runInAction(() => {
                this.loadRequest += 1;
                this.applyWebsites(websites);
                this.resetEditor();
            });
        }, (message) => {
            this.editError = message;
        });
    }

    /**
     * Prevents overlapping website changes and reports failures in the operation's form.
     *
     * @param operation - Storage change and success state updates to run.
     * @param onError - Form state update that receives a failure message inside an action.
     * @returns Resolves after pending state is cleared, or immediately when another change is pending.
     */
    @action
    private async runOperation(
        operation: () => Promise<void>,
        onError: (message: string) => void = (message) => {
            this.error = message;
        },
    ) {
        if (this.isPending || this.isLoading) {
            return;
        }
        this.loadRequest += 1;
        this.isPending = true;
        try {
            await operation();
        } catch (ex) {
            runInAction(() => {
                onError(getErrorMessage(ex));
            });
        } finally {
            runInAction(() => {
                this.isPending = false;
            });
            if (this.refreshAfterOperation) {
                this.refreshAfterOperation = false;
                await this.loadWebsites().catch((error) => this.reportError(error));
            }
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
        return Object.values(this.websites)
            .filter((website) => website.blockedUntil === undefined || website.blockedUntil > this.currentTime);
    }
}
