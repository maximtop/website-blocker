import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './components/App';

import 'bootstrap/dist/css/bootstrap.min.css';

export const blocked = {
    init: () => {
        document.title = 'Blocked Page';
        const container = document.getElementById('root');
        const root = createRoot(container);
        root.render(<App />);
    },
};
