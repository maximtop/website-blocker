import { createContext } from 'react';

import { configure } from 'mobx';

import { SettingsStore } from '../settings-store';
import { MOBX_ACTION_MODE } from '../mobx-config';

configure({
    enforceActions: MOBX_ACTION_MODE.ALWAYS,
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
