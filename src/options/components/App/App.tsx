import React from 'react';
import { WebsiteList } from '../WebsiteList';

export function App() {
    return (
        <div className="container mt-5">
            <h1 className="mb-4">Blocked Websites</h1>
            <WebsiteList />
        </div>
    );
}
