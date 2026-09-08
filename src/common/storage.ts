import browser from 'webextension-polyfill';

export class Storage {
    private static storage = browser.storage.sync;

    public static async get(key: string) {
        const response = await Storage.storage.get(key);
        return response[key];
    }

    public static async set(key: string, value: any) {
        return Storage.storage.set({ [key]: value });
    }

    public static async getAll(): Promise<Record<string, unknown>> {
        return Storage.storage.get(null);
    }

    public static async remove(key: string): Promise<void> {
        await Storage.storage.remove(key);
    }

    public static onChanged = Storage.storage.onChanged;
}
