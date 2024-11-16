import React, { useContext, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { RootStoreContext } from '../../stores/root-store';
import { getErrorMessage } from '../../../common/utils/error';

export const WebsiteList = observer(() => {
    const { settingsStore } = useContext(RootStoreContext);
    const { websitesList } = settingsStore;

    useEffect(() => {
        settingsStore.loadWebsites();
    }, []);

    const [newWebsite, setNewWebsite] = useState('');
    const [error, setError] = useState('');

    const handleNewWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewWebsite(e.target.value);
    };

    const handleAddNewWebsite = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await settingsStore.addNewWebsite(newWebsite);
            setNewWebsite('');
            setError('');
        } catch (ex) {
            setError(getErrorMessage(ex));
        }
    };

    const handleDeleteWebsite = async (websiteToDelete: string) => {
        try {
            await settingsStore.deleteWebsite(websiteToDelete);
            setError('');
        } catch (ex) {
            setError(getErrorMessage(ex));
        }
    };

    return (
        <div>
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            <form className="input-group mb-3" onSubmit={handleAddNewWebsite}>
                <input
                    type="text"
                    className="form-control"
                    value={newWebsite}
                    onChange={handleNewWebsiteChange}
                    placeholder="Enter website to block"
                    aria-label="Enter website to block"
                />
                <button type="submit" className="btn btn-primary">Add</button>
            </form>
            {websitesList.length > 0 ? (
                <ul className="list-group">
                    {websitesList.map((website) => (
                        <li key={website} className="list-group-item d-flex justify-content-between align-items-center">
                            {website}
                            <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteWebsite(website)}
                            >
                Delete
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-muted">No websites blocked.</p>
            )}
        </div>
    );
});
