import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './components/App';

import 'bootstrap/dist/css/bootstrap.min.css';

/**
 * Mounts the page shown after navigation to a blocked website.
 */
export const blocked = {
    init: () => {
        document.title = 'Blocked Page';
        const container = document.getElementById('root');
        if (!container) {
            throw new Error('Blocked page root is missing');
        }
        const root = createRoot(container);
        root.render(<App />);
    },
};
