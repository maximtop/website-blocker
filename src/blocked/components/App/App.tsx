import React from 'react';
import { t } from '../../../common/i18n';

export function App() {
    const handleCloseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        window.close();
    };

    return (
        <div
            className="d-flex align-items-center justify-content-center p-3"
            style={{
                minHeight: '100vh',
                textAlign: 'center',
            }}
        >
            <div>
                <h1 className="display-4 text-success">{t('blockedHeading')}</h1>
                <p>{t('blockedMessage')}</p>
                <button
                    type="button"
                    className="btn btn-primary mt-3"
                    onClick={handleCloseClick}
                >
                    {t('closeTab')}
                </button>
            </div>
        </div>
    );
}
