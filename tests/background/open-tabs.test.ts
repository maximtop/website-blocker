import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import browser from 'webextension-polyfill';

vi.mock('webextension-polyfill', () => ({
    default: {
        storage: {
            sync: { get: vi.fn(), set: vi.fn(), onChanged: { addListener: vi.fn() } },
        },
        runtime: {
            getURL: (path: string) => `moz-extension://fixture/${path}`,
            onInstalled: { addListener: vi.fn() },
            onStartup: { addListener: vi.fn() },
        },
        tabs: {
            query: vi.fn(), get: vi.fn(), update: vi.fn(), remove: vi.fn(),
        },
        webNavigation: { onCommitted: { addListener: vi.fn() } },
    },
}));

const NOW = Date.UTC(2026, 8, 20);
const BLOCKED = 'moz-extension://fixture/blocked.html';
let stored: Record<string, unknown>;
let tabs: browser.Tabs.Tab[];
let storageUpdates: Promise<void>[];

function tab(id: number, url: string, windowId = 1): browser.Tabs.Tab {
    return {
        id, url, windowId, index: 0, active: false, pinned: false, highlighted: false, incognito: false,
    };
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((finish) => {
        resolve = finish;
    });
    return { promise, resolve };
}

async function start() {
    const { init } = await import('../../src/background/background');
    await init();
    return (await import('../../src/common/websites')).Websites;
}

async function changeStored(items: Record<string, unknown>) {
    await browser.storage.sync.set(items);
    await Promise.all(storageUpdates);
}

beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    stored = {};
    storageUpdates = [];
    tabs = [tab(1, 'https://www.example.com/watch'), tab(2, 'http://example.com/', 2)];
    vi.mocked(browser.storage.sync.get).mockImplementation(async () => structuredClone(stored));
    vi.mocked(browser.storage.sync.set).mockImplementation(async (items) => {
        Object.assign(stored, structuredClone(items));
        const changes = Object.fromEntries(Object.entries(items).map(([key, newValue]) => [key, { newValue }]));
        const listener = vi.mocked(browser.storage.sync.onChanged.addListener).mock.calls[0][0];
        storageUpdates.push(Promise.resolve(listener(changes)));
    });
    vi.mocked(browser.tabs.query).mockImplementation(async () => structuredClone(tabs));
    vi.mocked(browser.tabs.get).mockImplementation(async (id) => {
        const current = tabs.find((item) => item.id === id);
        if (!current) {
            throw new Error('Tab was closed');
        }
        return structuredClone(current);
    });
    vi.mocked(browser.tabs.update).mockImplementation(async (
        id: number | browser.Tabs.UpdateUpdatePropertiesType,
        properties?: browser.Tabs.UpdateUpdatePropertiesType,
    ) => {
        const current = tabs.find((item) => item.id === id)!;
        Object.assign(current, properties);
        return structuredClone(current);
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('blocking existing tabs', () => {
    it.each([undefined, NOW + 60_000])('blocks existing tabs on extension enable: %s', async (blockedUntil) => {
        stored = { websites: { 'example.com': { hostname: 'example.com', blockedUntil } } };
        await start();

        expect(tabs).toEqual([tab(1, BLOCKED), tab(2, BLOCKED, 2)]);
        expect(browser.tabs.query).toHaveBeenCalledWith({});
        expect(browser.tabs.remove).not.toHaveBeenCalled();
    });

    it.each([undefined, 15])('applies a newly added block to every matching window: duration %s', async (duration) => {
        const websites = await start();
        await websites.addWebsite('example.com', duration);
        await Promise.all(storageUpdates);

        expect(tabs).toEqual([tab(1, BLOCKED), tab(2, BLOCKED, 2)]);
        expect(browser.tabs.remove).not.toHaveBeenCalled();
    });

    it.each([undefined, NOW + 60_000])('re-enables a rule keeping its deadline: %s', async (blockedUntil) => {
        stored = { 'website:example.com': { hostname: 'example.com', enabled: false, blockedUntil } };
        const websites = await start();
        expect(browser.tabs.update).not.toHaveBeenCalled();

        await websites.setWebsiteEnabled('example.com', true);
        await Promise.all(storageUpdates);

        expect(tabs.map(({ url }) => url)).toEqual([BLOCKED, BLOCKED]);
        expect(await websites.getWebsites()).toEqual({
            'example.com': { hostname: 'example.com', enabled: true, blockedUntil },
        });
    });

    it('uses existing hostname semantics and leaves unrelated and service pages unchanged', async () => {
        stored = { websites: { 'example.com': { hostname: 'example.com' } } };
        const unchanged = [
            tab(3, 'https://sub.example.com/'),
            tab(4, 'https://example.com.evil.org/'),
            tab(5, 'https://unrelated.org/'),
            tab(6, 'chrome://example.com/'),
            tab(7, 'moz-extension://example.com/options.html'),
            tab(8, 'file://example.com/a'),
            tab(9, BLOCKED),
            tab(10, 'about:blank'),
            { ...tab(11, ''), url: undefined },
            { ...tab(12, 'https://example.com/'), id: undefined },
        ];
        tabs.push(...structuredClone(unchanged));
        await start();

        expect(tabs).toEqual([tab(1, BLOCKED), tab(2, BLOCKED, 2), ...unchanged]);
        expect(browser.tabs.update).toHaveBeenCalledTimes(2);
        expect(browser.tabs.remove).not.toHaveBeenCalled();
    });

    it.each([
        { enabled: false },
        { blockedUntil: NOW },
        { blockedUntil: NOW - 1 },
        { enabled: false, blockedUntil: NOW + 60_000 },
    ])('ignores disabled and expired rules: %j', async (preferences) => {
        stored = { websites: { 'example.com': { hostname: 'example.com', ...preferences } } };
        await start();
        await changeStored(stored);
        expect(browser.tabs.update).not.toHaveBeenCalled();
    });

    it('applies renamed rules to already open tabs', async () => {
        stored = { websites: { 'old.com': { hostname: 'old.com' } } };
        const websites = await start();
        await websites.updateWebsite('old.com', 'example.com');
        await Promise.all(storageUpdates);
        expect(tabs.map(({ url }) => url)).toEqual([BLOCKED, BLOCKED]);
    });

    it('blocks again after background restart and browser startup', async () => {
        stored = { websites: { 'example.com': { hostname: 'example.com' } } };
        await start();
        tabs[0].url = 'https://example.com/';
        await vi.mocked(browser.runtime.onStartup.addListener).mock.calls[0][0]();
        expect(tabs[0].url).toBe(BLOCKED);

        tabs[0].url = 'https://example.com/';
        vi.resetModules();
        await start();
        expect(tabs[0].url).toBe(BLOCKED);
    });

    it('does not redirect a tab that navigated away after enumeration', async () => {
        stored = { websites: { 'example.com': { hostname: 'example.com' } } };
        vi.mocked(browser.tabs.query).mockImplementationOnce(async () => {
            const snapshot = structuredClone(tabs);
            tabs[0].url = 'https://unrelated.org/';
            tabs[1].pendingUrl = 'https://unrelated.org/';
            return snapshot;
        });
        await start();
        expect(browser.tabs.update).not.toHaveBeenCalled();
    });

    it('respects expiry while a tab lookup is in flight', async () => {
        stored = { websites: { 'example.com': { hostname: 'example.com', blockedUntil: NOW + 1 } } };
        vi.mocked(browser.tabs.get).mockImplementation(async (id) => {
            vi.mocked(Date.now).mockReturnValue(NOW + 1);
            return structuredClone(tabs.find((item) => item.id === id)!);
        });
        await start();
        expect(browser.tabs.update).not.toHaveBeenCalled();
    });

    it.each(['query', 'get'] as const)('cancels an old scan when a rule is disabled during %s', async (boundary) => {
        await start();
        const snapshot = structuredClone(tabs);
        const query = deferred<browser.Tabs.Tab[]>();
        const get = deferred<browser.Tabs.Tab>();
        if (boundary === 'query') {
            vi.mocked(browser.tabs.query).mockReturnValueOnce(query.promise);
        } else {
            vi.mocked(browser.tabs.get).mockReturnValue(get.promise);
        }
        await browser.storage.sync.set({ 'website:example.com': { hostname: 'example.com' } });
        if (boundary === 'get') {
            await vi.waitFor(() => expect(browser.tabs.get).toHaveBeenCalled());
        } else {
            await vi.waitFor(() => expect(browser.tabs.query).toHaveBeenCalledTimes(2));
        }
        await browser.storage.sync.set({ 'website:example.com': { hostname: 'example.com', enabled: false } });
        await storageUpdates[1];
        query.resolve(snapshot);
        get.resolve(snapshot[0]);
        await Promise.all(storageUpdates);
        expect(browser.tabs.update).not.toHaveBeenCalled();
    });

    it.each(['get', 'update'] as const)('continues redirecting other tabs after one %s rejects', async (boundary) => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        stored = { websites: { 'example.com': { hostname: 'example.com' } } };
        vi.mocked(browser.tabs[boundary]).mockRejectedValueOnce(new Error('Tab was closed'));
        await start();
        expect(tabs[1].url).toBe(BLOCKED);
        expect(browser.tabs.remove).not.toHaveBeenCalled();
    });

    it('keeps subsequent navigation blocked even if enumerating tabs fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        stored = { websites: { 'example.com': { hostname: 'example.com' } } };
        vi.mocked(browser.tabs.query).mockRejectedValueOnce(new Error('Query failed'));
        await start();
        const listener = vi.mocked(browser.webNavigation.onCommitted.addListener).mock.calls[0][0];
        await listener({ tabId: 1, url: 'https://example.com/', frameId: 0 } as
            browser.WebNavigation.OnCommittedDetailsType);
        expect(tabs[0].url).toBe(BLOCKED);
        expect(browser.storage.sync.get).toHaveBeenCalledTimes(1);
    });

    it('does not apply an old storage response after a newer removal', async () => {
        await start();
        const old = deferred<Record<string, unknown>>();
        vi.mocked(browser.storage.sync.get).mockReturnValueOnce(old.promise);
        await browser.storage.sync.set({ 'website:example.com': { hostname: 'example.com' } });
        await browser.storage.sync.set({ 'website:example.com': null });
        await storageUpdates[1];
        old.resolve({ 'website:example.com': { hostname: 'example.com' } });
        await Promise.all(storageUpdates);
        expect(browser.tabs.update).not.toHaveBeenCalled();
    });
});
