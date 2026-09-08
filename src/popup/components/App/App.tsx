import React from 'react';
import browser from 'webextension-polyfill';
import { t } from '../../../common/i18n';

// TODO change the content of the popup depending on whether the site is blocked or not.
/**
 * Renders the extension popup with a link to website settings.
 *
 * @returns The popup content.
 */
export function App() {
    /**
     * Opens the options page in response to the settings button.
     */
    const handleClick = () => {
        browser.runtime.openOptionsPage();
    };

    return (
        <div className="container text-center" style={{ padding: '30px' }}>
            <h1 className="h5 text-danger">{t('extensionName')}</h1>
            <p className="mt-2">{t('popupPrompt')}</p>
            <button onClick={handleClick} type="button" className="btn btn-link p-0">
                {t('openSettings')}
            </button>
        </div>
    );
}
