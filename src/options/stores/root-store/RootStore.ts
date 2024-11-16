import { createContext } from 'react';

import { configure } from 'mobx';

import { SettingsStore } from '../settings-store';

configure({
    enforceActions: 'always',
    computedRequiresReaction: true,
    reactionRequiresObservable: true,
    observableRequiresReaction: true,
});

export class RootStore {
    public settingsStore: SettingsStore;

    constructor() {
        this.settingsStore = new SettingsStore(this);
    }
}

export const RootStoreContext = createContext<RootStore>(new RootStore());
