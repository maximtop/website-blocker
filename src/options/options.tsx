import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { RootStore, RootStoreContext } from './stores/root-store';

import 'bootstrap/dist/css/bootstrap.min.css';

/**
 * Mounts the options page with its settings store.
 */
export const options = {
    /**
     * Renders the options page with a fresh settings store.
     */
    init: () => {
        document.title = 'Options Page';
        const container = document.getElementById('root');
        if (!container) {
            throw new Error('Options page root is missing');
        }
        const root = createRoot(container);
        root.render(
            <RootStoreContext.Provider value={new RootStore()}>
                <App />
            </RootStoreContext.Provider>,
        );
    },
};
