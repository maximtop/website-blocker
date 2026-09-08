import { type RootStore } from '../root-store';

/**
 * Keeps the popup settings connected to their root store.
 */
export class SettingsStore {
    private rootStore: RootStore;

    /**
     * Connects popup settings to their owning store.
     *
     * @param rootStore - Store that owns the popup's state.
     */
    constructor(rootStore: RootStore) {
        this.rootStore = rootStore;
    }
}
