// @vitest-environment node

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { type WebsitesMap } from '../../src/common/websites';
import { type RootStore } from '../../src/options/stores/root-store';
import { SettingsStore } from '../../src/options/stores/settings-store';

const websitesMock = vi.hoisted(() => ({
    getWebsites: vi.fn<() => Promise<WebsitesMap>>(),
    addWebsite: vi.fn<(value: string) => Promise<WebsitesMap>>(),
    deleteWebsite: vi.fn<(hostname: string) => Promise<WebsitesMap>>(),
    setWebsiteEnabled: vi.fn<(hostname: string, enabled: boolean) => Promise<WebsitesMap>>(),
    subscribe: vi.fn<(listener: (websites: WebsitesMap) => void) => () => void>(),
    subscribers: new Set<(websites: WebsitesMap) => void>(),
}));

vi.mock('../../src/common/websites', () => ({
    Websites: websitesMock,
}));

const enabledWebsites: WebsitesMap = {
    'example.com': { hostname: 'example.com', enabled: true },
};

const disabledWebsites: WebsitesMap = {
    'example.com': { hostname: 'example.com', enabled: false },
};

const createStore = () => new SettingsStore({} as RootStore);

const notifyWebsitesChanged = (websites: WebsitesMap) => {
    websitesMock.subscribers.forEach((listener) => listener(structuredClone(websites)));
};

const deferredWebsites = () => {
    let resolve!: (websites: WebsitesMap) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<WebsitesMap>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
};

beforeEach(() => {
    vi.resetAllMocks();
    websitesMock.subscribers.clear();
    websitesMock.getWebsites.mockResolvedValue(structuredClone(enabledWebsites));
    websitesMock.subscribe.mockImplementation((listener) => {
        websitesMock.subscribers.add(listener);
        return () => {
            websitesMock.subscribers.delete(listener);
        };
    });
});

describe('settings store website preferences', () => {
    it('applies a confirmed toggle without a follow-up read that could fail', async () => {
        const store = createStore();
        await store.loadWebsites();
        websitesMock.getWebsites.mockRejectedValueOnce(new Error('Storage read unavailable'));
        websitesMock.setWebsiteEnabled.mockResolvedValueOnce(structuredClone(disabledWebsites));

        await store.setWebsiteEnabled('example.com', false);

        expect(websitesMock.setWebsiteEnabled).toHaveBeenCalledExactlyOnceWith('example.com', false);
        expect(websitesMock.getWebsites).toHaveBeenCalledTimes(1);
        expect(store.websites).toEqual(disabledWebsites);
        expect(store.websitesList).toEqual([{ hostname: 'example.com', enabled: false }]);
    });

    it('keeps the confirmed preference when saving a toggle fails', async () => {
        const store = createStore();
        await store.loadWebsites();
        websitesMock.setWebsiteEnabled.mockRejectedValueOnce(new Error('Storage write unavailable'));

        await expect(store.setWebsiteEnabled('example.com', false)).rejects.toThrow('Storage write unavailable');

        expect(store.websites).toEqual(enabledWebsites);
        expect(websitesMock.getWebsites).toHaveBeenCalledTimes(1);
    });

    it('applies the full confirmed map after adding a website without rereading storage', async () => {
        const store = createStore();
        await store.loadWebsites();
        const savedWebsites = {
            ...disabledWebsites,
            'other.com': { hostname: 'other.com', enabled: true },
        };
        websitesMock.addWebsite.mockResolvedValueOnce(savedWebsites);

        await store.addNewWebsite('https://other.com');

        expect(websitesMock.addWebsite).toHaveBeenCalledExactlyOnceWith('https://other.com');
        expect(store.websites).toEqual(savedWebsites);
        expect(websitesMock.getWebsites).toHaveBeenCalledTimes(1);
    });

    it('applies the confirmed empty map after deleting the last website without rereading storage', async () => {
        const store = createStore();
        await store.loadWebsites();
        websitesMock.deleteWebsite.mockResolvedValueOnce({});

        await store.deleteWebsite('example.com');

        expect(websitesMock.deleteWebsite).toHaveBeenCalledExactlyOnceWith('example.com');
        expect(store.websitesList).toEqual([]);
        expect(websitesMock.getWebsites).toHaveBeenCalledTimes(1);
    });

    it('updates every observing store, handles an empty map, and removes each subscription on cleanup', () => {
        const firstStore = createStore();
        const secondStore = createStore();
        const stopFirst = firstStore.observeWebsites();
        const stopSecond = secondStore.observeWebsites();

        notifyWebsitesChanged(disabledWebsites);
        expect(firstStore.websites).toEqual(disabledWebsites);
        expect(secondStore.websites).toEqual(disabledWebsites);

        notifyWebsitesChanged({});
        expect(firstStore.websitesList).toEqual([]);
        expect(secondStore.websitesList).toEqual([]);

        stopFirst();
        expect(websitesMock.subscribers.size).toBe(1);
        notifyWebsitesChanged(enabledWebsites);
        expect(firstStore.websitesList).toEqual([]);
        expect(secondStore.websites).toEqual(enabledWebsites);

        stopSecond();
        expect(websitesMock.subscribers.size).toBe(0);
        expect(websitesMock.getWebsites).not.toHaveBeenCalled();
    });

    it('does not let a delayed initial read overwrite a newer storage event', async () => {
        const store = createStore();
        const stopObserving = store.observeWebsites();
        const initialRead = deferredWebsites();
        websitesMock.getWebsites.mockReturnValueOnce(initialRead.promise);
        const loading = store.loadWebsites();

        notifyWebsitesChanged(disabledWebsites);
        initialRead.resolve(enabledWebsites);
        await loading;

        expect(store.websites).toEqual(disabledWebsites);
        stopObserving();
    });

    it('accepts the save event before confirmation and a later external update after confirmation', async () => {
        const store = createStore();
        const stopObserving = store.observeWebsites();
        await store.loadWebsites();
        const savingWebsites = deferredWebsites();
        websitesMock.setWebsiteEnabled.mockReturnValueOnce(savingWebsites.promise);
        const saving = store.setWebsiteEnabled('example.com', false);

        notifyWebsitesChanged(disabledWebsites);
        savingWebsites.resolve(disabledWebsites);
        await saving;
        expect(store.websites).toEqual(disabledWebsites);

        notifyWebsitesChanged(enabledWebsites);
        expect(store.websites).toEqual(enabledWebsites);
        expect(websitesMock.getWebsites).toHaveBeenCalledTimes(1);
        stopObserving();
    });

    it('does not surface an obsolete read failure after a newer event supplies the state', async () => {
        const store = createStore();
        const stopObserving = store.observeWebsites();
        const initialRead = deferredWebsites();
        websitesMock.getWebsites.mockReturnValueOnce(initialRead.promise);
        const loading = store.loadWebsites();

        notifyWebsitesChanged(disabledWebsites);
        initialRead.reject(new Error('Obsolete storage read failed'));
        await expect(loading).resolves.toBeUndefined();

        expect(store.websites).toEqual(disabledWebsites);
        stopObserving();
    });

    it('surfaces a current read failure when no newer state has arrived', async () => {
        const store = createStore();
        websitesMock.getWebsites.mockRejectedValueOnce(new Error('Storage read unavailable'));

        await expect(store.loadWebsites()).rejects.toThrow('Storage read unavailable');

        expect(store.websitesList).toEqual([]);
    });

    it('does not let a delayed initial read overwrite a successful toggle', async () => {
        const store = createStore();
        const initialRead = deferredWebsites();
        websitesMock.getWebsites.mockReturnValueOnce(initialRead.promise);
        const loading = store.loadWebsites();
        websitesMock.setWebsiteEnabled.mockResolvedValueOnce(disabledWebsites);

        await store.setWebsiteEnabled('example.com', false);
        initialRead.resolve(enabledWebsites);
        await loading;

        expect(store.websites).toEqual(disabledWebsites);
        expect(websitesMock.getWebsites).toHaveBeenCalledTimes(1);
    });

    it('keeps the newer load result when an earlier load resolves last', async () => {
        const store = createStore();
        const firstRead = deferredWebsites();
        const secondRead = deferredWebsites();
        websitesMock.getWebsites
            .mockReturnValueOnce(firstRead.promise)
            .mockReturnValueOnce(secondRead.promise);
        const firstLoad = store.loadWebsites();
        const secondLoad = store.loadWebsites();

        secondRead.resolve(disabledWebsites);
        await secondLoad;
        firstRead.resolve(enabledWebsites);
        await firstLoad;

        expect(store.websites).toEqual(disabledWebsites);
    });
});
