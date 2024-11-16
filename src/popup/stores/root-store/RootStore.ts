import { createContext } from 'react';

import { SettingsStore } from '../settings-store';

export class RootStore {
    public settingsStore: SettingsStore;

    constructor() {
        this.settingsStore = new SettingsStore(this);
    }
}

export const RootStoreContext = createContext<RootStore>(new RootStore());
