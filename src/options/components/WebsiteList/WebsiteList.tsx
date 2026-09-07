import React, {
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { observer } from 'mobx-react-lite';

import { RootStoreContext } from '../../stores/root-store';
import { getErrorMessage } from '../../../common/utils/error';

/**
 * Displays saved websites with controls to add, edit, remove, and toggle blocking.
 */
export const WebsiteList = observer(() => {
    const { settingsStore } = useContext(RootStoreContext);
    const { websitesList } = settingsStore;

    const [newWebsite, setNewWebsite] = useState('');
    const [error, setError] = useState('');
    const [editingWebsite, setEditingWebsite] = useState<string | null>(null);
    const [editedWebsite, setEditedWebsite] = useState('');
    const [editError, setEditError] = useState('');
    const [isPending, setIsPending] = useState(false);
    const editInput = useRef<HTMLInputElement>(null);
    const isPendingRef = useRef(false);

    useEffect(() => {
        settingsStore.loadWebsites().catch((ex) => {
            setError(getErrorMessage(ex));
        });
    }, [settingsStore]);

    useEffect(() => {
        if (editingWebsite !== null && !isPending) {
            editInput.current?.focus();
            editInput.current?.select();
        }
    }, [editingWebsite, isPending]);

    useEffect(() => {
        if (editingWebsite !== null && !websitesList.some((website) => website.hostname === editingWebsite)) {
            setEditingWebsite(null);
            setEditedWebsite('');
            setEditError('');
        }
    }, [editingWebsite, websitesList]);

    /**
     * Updates the draft address in the add form.
     *
     * @param e - Change event containing the user's current input.
     */
    const handleNewWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewWebsite(e.target.value);
    };

    /**
     * Saves the add-form draft and reports any failure without clearing the input.
     *
     * @param e - Submit event from the add form.
     * @returns Resolves after the save attempt and pending-state cleanup.
     */
    const handleAddNewWebsite = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isPendingRef.current) {
            return;
        }
        isPendingRef.current = true;
        setIsPending(true);
        try {
            await settingsStore.addNewWebsite(newWebsite);
            setNewWebsite('');
            setError('');
        } catch (ex) {
            setError(getErrorMessage(ex));
        } finally {
            isPendingRef.current = false;
            setIsPending(false);
        }
    };

    /**
     * Removes an entry while preventing overlapping list changes.
     *
     * @param websiteToDelete - Normalized hostname of the entry to remove.
     * @returns Resolves after the deletion attempt and pending-state cleanup.
     */
    const handleDeleteWebsite = async (websiteToDelete: string) => {
        if (isPendingRef.current) {
            return;
        }
        isPendingRef.current = true;
        setIsPending(true);
        try {
            await settingsStore.deleteWebsite(websiteToDelete);
            setError('');
        } catch (ex) {
            setError(getErrorMessage(ex));
        } finally {
            isPendingRef.current = false;
            setIsPending(false);
        }
    };

    /**
     * Saves an entry's blocking state while preventing overlapping list changes.
     *
     * @param hostname - Normalized hostname of the entry to update.
     * @param enabled - Whether the switch should enable blocking.
     * @returns Resolves after the save attempt and pending-state cleanup.
     */
    const handleToggleWebsite = async (hostname: string, enabled: boolean) => {
        if (isPendingRef.current) {
            return;
        }
        isPendingRef.current = true;
        setIsPending(true);
        try {
            await settingsStore.setWebsiteEnabled(hostname, enabled);
            setError('');
        } catch (ex) {
            setError(getErrorMessage(ex));
        } finally {
            isPendingRef.current = false;
            setIsPending(false);
        }
    };

    /**
     * Opens an inline editor with the selected entry's current hostname.
     *
     * @param website - Normalized hostname of the entry to edit.
     */
    const handleEditWebsite = (website: string) => {
        setEditingWebsite(website);
        setEditedWebsite(website);
        setEditError('');
    };

    /**
     * Discards the edit draft and closes the inline editor.
     */
    const handleCancelEdit = () => {
        setEditingWebsite(null);
        setEditedWebsite('');
        setEditError('');
    };

    /**
     * Saves an edited address, preserving the draft when saving fails.
     *
     * @param e - Submit event from the inline edit form.
     * @returns Resolves after the save attempt and pending-state cleanup.
     */
    const handleSaveWebsite = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (editingWebsite === null || isPendingRef.current) {
            return;
        }
        isPendingRef.current = true;
        setIsPending(true);
        try {
            await settingsStore.updateWebsite(editingWebsite, editedWebsite);
            handleCancelEdit();
        } catch (ex) {
            setEditError(getErrorMessage(ex));
        } finally {
            isPendingRef.current = false;
            setIsPending(false);
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
                                            onChange={(e) => {
                                                setEditedWebsite(e.target.value);
                                                setEditError('');
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape' && !isPending) {
                                                    e.preventDefault();
                                                    handleCancelEdit();
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
                                            onClick={handleCancelEdit}
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
                                            onChange={(event) => handleToggleWebsite(hostname, event.target.checked)}
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
                                            onClick={() => handleEditWebsite(hostname)}
                                            aria-label={`Edit ${hostname}`}
                                            disabled={isPending || editingWebsite !== null}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleDeleteWebsite(hostname)}
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
