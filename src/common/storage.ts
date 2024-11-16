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

    public static onChanged = Storage.storage.onChanged;
}
