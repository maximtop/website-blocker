import React, { useContext, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';

import { RootStoreContext } from '../../stores/root-store';
import { t } from '../../../common/i18n';

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
            <form className="d-flex gap-2 mb-3" onSubmit={handleAddNewWebsite}>
                <input
                    type="text"
                    className="form-control website-input"
                    value={newWebsite}
                    onChange={(event) => settingsStore.setNewWebsite(event.target.value)}
                    placeholder={t('websiteInputPlaceholder')}
                    aria-label={t('websiteInputPlaceholder')}
                    dir="auto"
                    disabled={isPending}
                />
                <button type="submit" className="btn btn-primary flex-shrink-0" disabled={isPending}>
                    {t('addWebsite')}
                </button>
            </form>
            {websitesList.length > 0 ? (
                <ul className="list-group">
                    {websitesList.map(({ hostname, enabled }) => (
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
                                    <div className="d-flex flex-wrap gap-2">
                                        <input
                                            ref={editInput}
                                            type="text"
                                            className={`form-control website-input${editError ? ' is-invalid' : ''}`}
                                            dir="auto"
                                            value={editedWebsite}
                                            onChange={(event) => settingsStore.setEditedWebsite(event.target.value)}
                                            aria-label={t('editWebsiteLabel', hostname)}
                                            aria-invalid={!!editError}
                                            aria-describedby={editError ? 'website-edit-error' : undefined}
                                            disabled={isPending}
                                        />
                                        <button type="submit" className="btn btn-primary" disabled={isPending}>
                                            {t('saveWebsite')}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => settingsStore.cancelEdit()}
                                            disabled={isPending}
                                        >
                                            {t('cancelEdit')}
                                        </button>
                                    </div>
                                    {editError && (
                                        <div id="website-edit-error" className="text-danger mt-2" role="alert">
                                            {editError}
                                        </div>
                                    )}
                                </form>
                            ) : (
                                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                                    <div className="form-check form-switch mb-0 website-toggle">
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
                                            {t('blockWebsiteLabel', hostname)}
                                        </label>
                                        <span className="d-block small text-muted">
                                            {enabled !== false ? t('blockingOn') : t('blockingOff')}
                                        </span>
                                    </div>
                                    <div className="d-flex gap-2 flex-shrink-0">
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => settingsStore.editWebsite(hostname)}
                                            aria-label={t('editWebsiteLabel', hostname)}
                                            disabled={isPending || editingWebsite !== null}
                                        >
                                            {t('editWebsite')}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={() => settingsStore.deleteWebsite(hostname)}
                                            aria-label={t('deleteWebsiteLabel', hostname)}
                                            disabled={isPending}
                                        >
                                            {t('deleteWebsite')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-muted">{t('emptyList')}</p>
            )}
        </div>
    );
});
