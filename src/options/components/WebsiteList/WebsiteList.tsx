import React, { useContext, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';

import { RootStoreContext } from '../../stores/root-store';

/**
 * Renders the observable blocked website list with add and edit forms.
 *
 * @returns Website controls and their current validation feedback.
 */
export const WebsiteList = observer(() => {
    const { settingsStore } = useContext(RootStoreContext);
    const {
        websitesList,
        newWebsite,
        error,
        editingWebsite,
        editedWebsite,
        editError,
        isPending,
    } = settingsStore;

    useEffect(() => {
        settingsStore.loadWebsites().catch((ex) => settingsStore.reportError(ex));
    }, [settingsStore]);

    const editInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingWebsite !== null && !isPending) {
            editInput.current?.focus();
            editInput.current?.select();
        }
    }, [editingWebsite, isPending]);

    /**
     * Submits the add form through the settings store.
     *
     * @param event - Form submission to prevent from navigating the page.
     */
    const handleAddNewWebsite = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        settingsStore.addNewWebsite();
    };

    /**
     * Submits the edit form through the settings store.
     *
     * @param event - Form submission to prevent from navigating the page.
     */
    const handleSaveWebsite = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        settingsStore.updateWebsite();
    };

    return (
        <div>
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            <form className="input-group mb-3" onSubmit={handleAddNewWebsite}>
                <input
                    type="text"
                    className="form-control"
                    value={newWebsite}
                    onChange={(event) => settingsStore.setNewWebsite(event.target.value)}
                    placeholder="Enter website to block"
                    aria-label="Enter website to block"
                    disabled={isPending}
                />
                <button type="submit" className="btn btn-primary" disabled={isPending}>Add</button>
            </form>
            {websitesList.length > 0 ? (
                <ul className="list-group">
                    {websitesList.map(({ hostname, enabled }) => (
                        <li key={hostname} className="list-group-item">
                            {editingWebsite === hostname ? (
                                <form onSubmit={handleSaveWebsite} aria-busy={isPending}>
                                    <div className="input-group">
                                        <input
                                            ref={editInput}
                                            type="text"
                                            className={`form-control${editError ? ' is-invalid' : ''}`}
                                            value={editedWebsite}
                                            onChange={(event) => settingsStore.setEditedWebsite(event.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape' && !isPending) {
                                                    e.preventDefault();
                                                    settingsStore.cancelEdit();
                                                }
                                            }}
                                            aria-label={`Edit website ${hostname}`}
                                            aria-invalid={!!editError}
                                            aria-describedby={editError ? 'website-edit-error' : undefined}
                                            disabled={isPending}
                                        />
                                        <button type="submit" className="btn btn-primary" disabled={isPending}>
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => settingsStore.cancelEdit()}
                                            disabled={isPending}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    {editError && (
                                        <div id="website-edit-error" className="text-danger mt-2" role="alert">
                                            {editError}
                                        </div>
                                    )}
                                </form>
                            ) : (
                                <div className="d-flex justify-content-between align-items-center gap-2">
                                    <div className="form-check form-switch mb-0">
                                        <input
                                            id={`block-${hostname}`}
                                            className="form-check-input"
                                            type="checkbox"
                                            role="switch"
                                            checked={enabled !== false}
                                            disabled={isPending}
                                            onChange={(event) => {
                                                settingsStore.setWebsiteEnabled(hostname, event.target.checked);
                                            }}
                                        />
                                        <label className="form-check-label text-break" htmlFor={`block-${hostname}`}>
                                            Block
                                            {' '}
                                            {hostname}
                                        </label>
                                        <span className="d-block small text-muted">
                                            {enabled !== false ? 'Blocking on' : 'Blocking off'}
                                        </span>
                                    </div>
                                    <div className="d-flex gap-2 flex-shrink-0">
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => settingsStore.editWebsite(hostname)}
                                            aria-label={`Edit ${hostname}`}
                                            disabled={isPending || editingWebsite !== null}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={() => settingsStore.deleteWebsite(hostname)}
                                            aria-label={`Delete ${hostname}`}
                                            disabled={isPending}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-muted">No websites added.</p>
            )}
        </div>
    );
});
