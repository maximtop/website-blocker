import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { RootStore, RootStoreContext } from './stores/root-store';
import { applyDocumentLocale } from '../common/i18n';

import 'bootstrap/dist/css/bootstrap.min.css';
import '../common/styles.css';
import './styles.css';

export const popup = {
    init: () => {
        applyDocumentLocale('extensionName');
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
