import React, { useState } from 'react';
import { WebsiteList } from '../WebsiteList';
import { canEditWebsiteSettings, openRegularWebsiteSettings } from '../../../common/settings-context';
import { getErrorMessage } from '../../../common/utils/error';

function RegularWindowPrompt() {
    const [isOpening, setIsOpening] = useState(false);
    const [error, setError] = useState('');

    const handleOpenSettings = async () => {
        setIsOpening(true);
        try {
            await openRegularWebsiteSettings();
            setError('');
        } catch (ex) {
            setError(getErrorMessage(ex));
        } finally {
            setIsOpening(false);
        }
    };

    return (
        <div>
            <p>Your website list is shared between regular and private browsing. Edit it in a regular window.</p>
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            <button type="button" className="btn btn-primary" onClick={handleOpenSettings} disabled={isOpening}>
                Open settings in a regular window
            </button>
        </div>
    );
}

export function App() {
    return (
        <div className="container mt-5">
            <h1 className="mb-4">Website Blocking</h1>
            {canEditWebsiteSettings() ? <WebsiteList /> : <RegularWindowPrompt />}
        </div>
    );
}
