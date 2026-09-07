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

    public static onChanged = Storage.storage.onChanged;
}
