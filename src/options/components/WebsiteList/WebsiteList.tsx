import React, { useContext, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { RootStoreContext } from '../../stores/root-store';
import { getErrorMessage } from '../../../common/utils/error';

export const WebsiteList = observer(() => {
    const { settingsStore } = useContext(RootStoreContext);
    const { websitesList, isLoading } = settingsStore;

    const [newWebsite, setNewWebsite] = useState('');
    const [duration, setDuration] = useState('indefinitely');
    const [customMinutes, setCustomMinutes] = useState('30');
    const [error, setError] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [deletingWebsite, setDeletingWebsite] = useState<string | null>(null);
    const isUpdating = isLoading || isAdding || deletingWebsite !== null;

    useEffect(() => {
        return settingsStore.watchWebsites((ex) => setError(getErrorMessage(ex)));
    }, [settingsStore]);

    const handleNewWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewWebsite(e.target.value);
    };

    const handleAddNewWebsite = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsAdding(true);
        try {
            const minutes = duration === 'indefinitely'
                ? undefined
                : Number(duration === 'custom' ? customMinutes : duration);
            if (minutes !== undefined && (!Number.isSafeInteger(minutes) || minutes <= 0)) {
                throw new Error('Enter a positive whole number of minutes.');
            }
            await settingsStore.addNewWebsite(newWebsite, minutes);
            setNewWebsite('');
            setError('');
        } catch (ex) {
            setError(getErrorMessage(ex));
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteWebsite = async (websiteToDelete: string) => {
        setDeletingWebsite(websiteToDelete);
        try {
            await settingsStore.deleteWebsite(websiteToDelete);
            setError('');
        } catch (ex) {
            setError(getErrorMessage(ex));
        } finally {
            setDeletingWebsite(null);
        }
    };

    return (
        <div>
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            <form className="row g-2 align-items-end mb-3" onSubmit={handleAddNewWebsite}>
                <div className="col-12 col-md">
                    <label htmlFor="new-website" className="form-label d-block mb-0">
                        Website
                        <input
                            id="new-website"
                            type="text"
                            className="form-control mt-2"
                            value={newWebsite}
                            onChange={handleNewWebsiteChange}
                            placeholder="Enter website to block"
                            required
                            disabled={isUpdating}
                        />
                    </label>
                </div>
                <div className="col-12 col-sm">
                    <label htmlFor="block-duration" className="form-label d-block mb-0">
                        Block for
                        <select
                            id="block-duration"
                            className="form-select mt-2"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            disabled={isUpdating}
                        >
                            <option value="indefinitely">Indefinitely</option>
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="60">60 minutes</option>
                            <option value="custom">Custom duration</option>
                        </select>
                    </label>
                </div>
                {duration === 'custom' && (
                    <div className="col-12 col-sm">
                        <label htmlFor="custom-minutes" className="form-label d-block mb-0">
                            Minutes
                            <input
                                id="custom-minutes"
                                type="number"
                                className="form-control mt-2"
                                value={customMinutes}
                                onChange={(e) => setCustomMinutes(e.target.value)}
                                min="1"
                                step="1"
                                required
                                disabled={isUpdating}
                            />
                        </label>
                    </div>
                )}
                <div className="col-auto">
                    <button type="submit" className="btn btn-primary" disabled={isUpdating}>
                        {isAdding ? 'Adding...' : 'Add'}
                    </button>
                </div>
            </form>
            <p className="text-muted">Timed blocks end automatically, even if this page is closed.</p>
            {isLoading && <p className="text-muted" role="status">Loading blocked websites...</p>}
            {websitesList.length > 0 ? (
                <ul className="list-group">
                    {websitesList.map(({ hostname, blockedUntil }) => (
                        <li
                            key={hostname}
                            className="list-group-item d-flex justify-content-between align-items-center gap-3"
                        >
                            <div className="text-break">
                                <div>{hostname}</div>
                                <small className="text-muted">
                                    {blockedUntil === undefined ? 'Blocked indefinitely' : (
                                        <>
                                            Blocked until
                                            {' '}
                                            <time dateTime={new Date(blockedUntil).toISOString()}>
                                                {new Date(blockedUntil).toLocaleString()}
                                            </time>
                                        </>
                                    )}
                                </small>
                            </div>
                            <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteWebsite(hostname)}
                                disabled={isUpdating}
                                aria-label={`Delete ${hostname}`}
                            >
                                {deletingWebsite === hostname ? 'Deleting...' : 'Delete'}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                !isLoading && <p className="text-muted">No websites blocked.</p>
            )}
        </div>
    );
});
