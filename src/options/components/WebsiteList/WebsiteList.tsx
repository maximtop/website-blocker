import React, { useContext, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';

import { RootStoreContext } from '../../stores/root-store';
import { BLOCK_DURATION } from '../../block-duration';

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
        isPending: operationPending,
        isLoading,
        duration,
        customMinutes,
    } = settingsStore;
    const isPending = operationPending || isLoading;

    useEffect(() => {
        return settingsStore.watchWebsites();
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
            <form className="row g-2 align-items-end mb-3" onSubmit={handleAddNewWebsite}>
                <div className="col-12 col-md">
                    <label htmlFor="new-website" className="form-label d-block mb-0">
                        Website
                        <input
                            id="new-website"
                            type="text"
                            className="form-control mt-2"
                            value={newWebsite}
                            onChange={(event) => settingsStore.setNewWebsite(event.target.value)}
                            placeholder="Enter website to block"
                            required
                            disabled={isPending}
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
                            onChange={(event) => settingsStore.setDuration(event.target.value)}
                            disabled={isPending}
                        >
                            <option value={BLOCK_DURATION.INDEFINITELY}>Indefinitely</option>
                            <option value={BLOCK_DURATION.FIFTEEN_MINUTES}>15 minutes</option>
                            <option value={BLOCK_DURATION.THIRTY_MINUTES}>30 minutes</option>
                            <option value={BLOCK_DURATION.SIXTY_MINUTES}>60 minutes</option>
                            <option value={BLOCK_DURATION.CUSTOM}>Custom duration</option>
                        </select>
                    </label>
                </div>
                {duration === BLOCK_DURATION.CUSTOM && (
                    <div className="col-12 col-sm">
                        <label htmlFor="custom-minutes" className="form-label d-block mb-0">
                            Minutes
                            <input
                                id="custom-minutes"
                                type="number"
                                className="form-control mt-2"
                                value={customMinutes}
                                onChange={(event) => settingsStore.setCustomMinutes(event.target.value)}
                                min="1"
                                step="1"
                                required
                                disabled={isPending}
                            />
                        </label>
                    </div>
                )}
                <div className="col-auto">
                    <button type="submit" className="btn btn-primary" disabled={isPending}>Add</button>
                </div>
            </form>
            <p className="text-muted">
                Timed blocks expire automatically. Turning blocking off does not pause the timer.
            </p>
            {isLoading && <p className="text-muted" role="status">Loading websites...</p>}
            {websitesList.length > 0 ? (
                <ul className="list-group">
                    {websitesList.map(({ hostname, enabled, blockedUntil }) => (
                        <li key={hostname} className="list-group-item">
                            {editingWebsite === hostname ? (
                                // Escape from native controls bubbles here; the form keeps its native semantics.
                                // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                                <form
                                    onSubmit={handleSaveWebsite}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Escape') {
                                            event.preventDefault();
                                            settingsStore.cancelEdit();
                                        }
                                    }}
                                    aria-busy={isPending}
                                >
                                    <div className="input-group">
                                        <input
                                            ref={editInput}
                                            type="text"
                                            className={`form-control${editError ? ' is-invalid' : ''}`}
                                            value={editedWebsite}
                                            onChange={(event) => settingsStore.setEditedWebsite(event.target.value)}
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
                                        <small className="d-block text-muted">
                                            {blockedUntil === undefined ? 'Indefinitely' : (
                                                <>
                                                    Until
                                                    {' '}
                                                    <time dateTime={new Date(blockedUntil).toISOString()}>
                                                        {new Date(blockedUntil).toLocaleString()}
                                                    </time>
                                                </>
                                            )}
                                        </small>
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
                !isLoading && <p className="text-muted">No websites added.</p>
            )}
        </div>
    );
});
