import { createContext } from 'react';

import { configure } from 'mobx';

import { SettingsStore } from '../settings-store';

configure({
    enforceActions: 'always',
    computedRequiresReaction: true,
    reactionRequiresObservable: true,
    observableRequiresReaction: true,
});

/**
 * Owns the stores shared by the options page.
 */
export class RootStore {
    public settingsStore: SettingsStore;

    /**
     * Creates the settings store for this options page.
     */
    constructor() {
        this.settingsStore = new SettingsStore(this);
    }
}

/**
 * Provides options-page stores to React components.
 */
export const RootStoreContext = createContext<RootStore>(new RootStore());
