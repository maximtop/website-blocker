import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './components/App';
import { applyDocumentLocale, PAGE_TITLE } from '../common/i18n';

import 'bootstrap/dist/css/bootstrap.min.css';
import '../common/styles.css';

/**
 * Mounts the page shown after navigation to a blocked website.
 */
export const blocked = {
    /**
     * Renders the blocked page in its root element.
     */
    init: () => {
        applyDocumentLocale(PAGE_TITLE.Blocked);
        const container = document.getElementById('root');
        if (!container) {
            throw new Error('Blocked page root is missing');
        }
        const root = createRoot(container);
        root.render(<App />);
    },
};
