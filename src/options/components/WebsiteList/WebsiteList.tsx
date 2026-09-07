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
