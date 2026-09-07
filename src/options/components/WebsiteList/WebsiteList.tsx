import React, {
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { observer } from 'mobx-react-lite';

import { RootStoreContext } from '../../stores/root-store';
import { getErrorMessage } from '../../../common/utils/error';

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

    const handleNewWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewWebsite(e.target.value);
    };

    /**
     * Runs one mutation at a time and reports failures to the relevant form.
     *
     * @param save Mutation and its operation-specific success handling.
     * @param onError Receives the failure message; defaults to the list error.
     * @returns Resolves after the mutation is handled or immediately when one is already pending.
     */
    const saveChanges = async (save: () => Promise<void>, onError: (message: string) => void = setError) => {
        if (isPendingRef.current) {
            return;
        }
        isPendingRef.current = true;
        setIsPending(true);
        try {
            await save();
        } catch (ex) {
            onError(getErrorMessage(ex));
        } finally {
            isPendingRef.current = false;
            setIsPending(false);
        }
    };

    /**
     * Adds the draft domain and clears the form only after it is saved.
     *
     * @param e Add form submission event.
     * @returns Resolves after the add attempt is handled.
     */
    const handleAddNewWebsite = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await saveChanges(async () => {
            await settingsStore.addNewWebsite(newWebsite);
            setNewWebsite('');
            setError('');
        });
    };

    /**
     * Deletes the selected domain and clears an earlier list error on success.
     *
     * @param websiteToDelete Domain to remove from the blocklist.
     * @returns Resolves after the delete attempt is handled.
     */
    const handleDeleteWebsite = async (websiteToDelete: string) => {
        await saveChanges(async () => {
            await settingsStore.deleteWebsite(websiteToDelete);
            setError('');
        });
    };

    /**
     * Persists the selected domain's blocking state.
     *
     * @param hostname Domain whose blocking state should change.
     * @param enabled Whether the domain should be blocked.
     * @returns Resolves after the toggle attempt is handled.
     */
    const handleToggleWebsite = async (hostname: string, enabled: boolean) => {
        await saveChanges(async () => {
            await settingsStore.setWebsiteEnabled(hostname, enabled);
            setError('');
        });
    };

    const handleEditWebsite = (website: string) => {
        setEditingWebsite(website);
        setEditedWebsite(website);
        setEditError('');
    };

    const handleCancelEdit = () => {
        setEditingWebsite(null);
        setEditedWebsite('');
        setEditError('');
    };

    /**
     * Cancels editing from any form control unless a mutation is pending.
     *
     * @param e Keyboard event bubbling from an edit form control.
     * @returns Nothing.
     */
    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Escape' && !isPendingRef.current) {
            e.preventDefault();
            handleCancelEdit();
        }
    };

    /**
     * Saves the edited domain, keeping the draft visible if the update fails.
     *
     * @param e Edit form submission event.
     * @returns Resolves after the save attempt is handled, or immediately if no entry is being edited.
     */
    const handleSaveWebsite = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (editingWebsite === null) {
            return;
        }
        await saveChanges(async () => {
            await settingsStore.updateWebsite(editingWebsite, editedWebsite);
            handleCancelEdit();
        }, setEditError);
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
                                // Delegate Escape from the native controls without changing the form's semantics.
                                // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                                <form
                                    onSubmit={handleSaveWebsite}
                                    onKeyDown={handleEditKeyDown}
                                    aria-busy={isPending}
                                >
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
