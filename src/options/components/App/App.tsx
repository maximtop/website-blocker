import React from 'react';
import { WebsiteList } from '../WebsiteList';
import { t } from '../../../common/i18n';

/**
 * Renders the options page for managing blocked websites.
 *
 * @returns The settings heading and editable website list.
 */
export function App() {
    return (
        <div className="container mt-5">
            <h1 className="mb-4">{t('blockedWebsites')}</h1>
            <WebsiteList />
        </div>
    );
}
