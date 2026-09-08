import browser from 'webextension-polyfill';

/**
 * Reads and writes extension settings in synchronized browser storage.
 */
export class Storage {
    private static storage = browser.storage.sync;

    /**
     * Reads a stored value by its key.
     *
     * @param key - Name of the stored setting.
     * @returns The stored value, or undefined when the key is absent.
     */
    public static async get(key: string) {
        const response = await Storage.storage.get(key);
        return response[key];
    }

    /**
     * Saves a value without replacing unrelated settings.
     *
     * @param key - Name of the setting to write.
     * @param value - Serializable value to store.
     * @returns Resolves after browser storage accepts the change.
     */
    public static async set(key: string, value: any) {
        return Storage.storage.set({ [key]: value });
    }

    /**
     * Reads all settings for the legacy and per-host website merge.
     *
     * @returns Stored keys and their values.
     */
    public static async getAll(): Promise<Record<string, unknown>> {
        return Storage.storage.get(null);
    }

    /**
     * Saves related keys together, such as a renamed website and its old-host tombstone.
     *
     * @param values - Keys to change without replacing unrelated settings.
     * @returns Resolves when the browser accepts the write.
     */
    public static async setMany(values: Record<string, unknown>): Promise<void> {
        await Storage.storage.set(values);
    }

    /**
     * Removes a setting by key.
     *
     * @param key - Name of the setting to remove.
     * @returns Resolves after removal.
     */
    public static async remove(key: string): Promise<void> {
        await Storage.storage.remove(key);
    }

    public static onChanged = Storage.storage.onChanged;
}
