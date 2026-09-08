import { createContext } from 'react';

import { SettingsStore } from '../settings-store';

/**
 * Owns the stores shared by the extension popup.
 */
export class RootStore {
    public settingsStore: SettingsStore;

    /**
     * Creates the popup's settings store.
     */
    constructor() {
        this.settingsStore = new SettingsStore(this);
    }
}

/**
 * Provides popup stores to React components.
 */
export const RootStoreContext = createContext<RootStore>(new RootStore());
