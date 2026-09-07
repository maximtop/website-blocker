import React from 'react';
import { WebsiteList } from '../WebsiteList';
import { t } from '../../../common/i18n';

export function App() {
    return (
        <div className="container mt-5">
            <h1 className="mb-4">{t('blockedWebsites')}</h1>
            <WebsiteList />
        </div>
    );
}
