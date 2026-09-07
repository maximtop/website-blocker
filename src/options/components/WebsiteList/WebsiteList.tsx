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
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    useEffect(() => {
        const unsubscribe = settingsStore.observeWebsites();
        settingsStore.loadWebsites().catch((ex) => {
            setError(getErrorMessage(ex));
        });
        return unsubscribe;
    }, [settingsStore]);

    const handleNewWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewWebsite(e.target.value);
    };

    const saveChanges = async (update: () => Promise<void>) => {
        if (isSavingRef.current) {
            return;
        }
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            await update();
            setError('');
        } catch (ex) {
            setError(getErrorMessage(ex));
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    };

    const handleAddNewWebsite = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await saveChanges(async () => {
            await settingsStore.addNewWebsite(newWebsite);
            setNewWebsite('');
        });
    };

    const handleDeleteWebsite = async (websiteToDelete: string) => {
        await saveChanges(() => settingsStore.deleteWebsite(websiteToDelete));
    };

    const handleToggleWebsite = async (hostname: string, enabled: boolean) => {
        await saveChanges(() => settingsStore.setWebsiteEnabled(hostname, enabled));
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
                    disabled={isSaving}
                    placeholder="Enter website to block"
                    aria-label="Enter website to block"
                />
                <button type="submit" className="btn btn-primary" disabled={isSaving}>Add</button>
            </form>
            {websitesList.length > 0 ? (
                <ul className="list-group">
                    {websitesList.map(({ hostname, enabled }) => (
                        <li
                            key={hostname}
                            className="list-group-item d-flex justify-content-between align-items-center gap-3"
                        >
                            <div className="form-check form-switch mb-0">
                                <input
                                    id={`block-${hostname}`}
                                    className="form-check-input"
                                    type="checkbox"
                                    role="switch"
                                    checked={enabled !== false}
                                    disabled={isSaving}
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
                            <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                disabled={isSaving}
                                onClick={() => handleDeleteWebsite(hostname)}
                            >
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-muted">No websites added.</p>
            )}
        </div>
    );
});
