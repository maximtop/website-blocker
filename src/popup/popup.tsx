import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { RootStore, RootStoreContext } from './stores/root-store';

import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';

/**
 * Mounts the extension popup with its store context.
 */
export const popup = {
    /**
     * Renders the popup with a fresh store context.
     */
    init: () => {
        const container = document.getElementById('root');
        if (!container) {
            throw new Error('Popup root is missing');
        }
        const root = createRoot(container);
        root.render(
            <RootStoreContext.Provider value={new RootStore()}>
                <App />
            </RootStoreContext.Provider>,
        );
    },
};
