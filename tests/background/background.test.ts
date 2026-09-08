import browser from 'webextension-polyfill';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import type { WebsitesMap } from '../../src/common/websites';

vi.mock('webextension-polyfill', () => ({
    default: {
        storage: {
            sync: {
                get: vi.fn(),
                set: vi.fn(),
                onChanged: { addListener: vi.fn() },
            },
        },
        runtime: {
            getURL: vi.fn(),
            onInstalled: { addListener: vi.fn() },
            onStartup: { addListener: vi.fn() },
        },
        tabs: { update: vi.fn() },
        webNavigation: { onCommitted: { addListener: vi.fn() } },
    },
}));

type NavigationDetails = browser.WebNavigation.OnCommittedDetailsType & {
    frameType: string;
    documentLifecycle: string;
};

const NOW = Date.UTC(2026, 8, 7, 12);
const MINUTE = 60_000;
let persisted: WebsitesMap;

const navigation = (overrides: Partial<NavigationDetails> = {}): NavigationDetails => ({
    tabId: 42,
    url: 'https://www.example.com/articles',
    frameId: 0,
    frameType: 'outermost_frame',
    documentLifecycle: 'active',
    transitionType: 'link',
    transitionQualifiers: [],
    timeStamp: Date.now(),
    ...overrides,
});

const startWorker = async () => {
    vi.resetModules();
    vi.mocked(browser.webNavigation.onCommitted.addListener).mockClear();
    const { init } = await import('../../src/background/background');
    init();
    const listener = vi.mocked(browser.webNavigation.onCommitted.addListener).mock.calls[0]?.[0];
    if (!listener) {
        throw new Error('Background did not register its navigation listener');
    }
    return listener;
};

const deferStorageRead = () => {
    let resolve: (value: Record<string, WebsitesMap>) => void = () => {};
    let reject: (error: Error) => void = () => {};
    const promise = new Promise<Record<string, WebsitesMap>>((finish, fail) => {
        resolve = finish;
        reject = fail;
    });
    return { promise, resolve, reject };
};

const storageChanged = async () => {
    const listener = vi.mocked(browser.storage.sync.onChanged.addListener).mock.calls[0]?.[0];
    if (!listener) {
        throw new Error('Background did not register its storage listener');
    }
    await listener({ websites: { newValue: persisted } });
};

beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    persisted = {};
    vi.mocked(browser.storage.sync.get).mockImplementation(async () => ({ websites: structuredClone(persisted) }));
    vi.mocked(browser.runtime.getURL).mockReturnValue('chrome-extension://test-extension/blocked.html');
    vi.mocked(browser.tabs.update).mockResolvedValue({ id: 42 } as browser.Tabs.Tab);
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('timed website navigation blocking', () => {
    it('loads a persisted timed block whenever the worker starts and respects expiry after restart', async () => {
        persisted = { 'example.com': { hostname: 'example.com', blockedUntil: NOW + 30 * MINUTE } };
        const firstWorker = await startWorker();
        await firstWorker(navigation());
        expect(browser.tabs.update).toHaveBeenCalledWith(42, {
            url: 'chrome-extension://test-extension/blocked.html',
        });

        vi.setSystemTime(NOW + 30 * MINUTE);
        vi.mocked(browser.tabs.update).mockClear();
        const restartedWorker = await startWorker();
        await restartedWorker(navigation());

        expect(browser.storage.sync.get).toHaveBeenCalledTimes(2);
        expect(browser.tabs.update).not.toHaveBeenCalled();
        expect(browser.storage.sync.set).not.toHaveBeenCalled();
    });

    it('unblocks a cached entry at the exact deadline without a storage change or worker restart', async () => {
        persisted = { 'example.com': { hostname: 'example.com', blockedUntil: NOW + MINUTE } };
        const onCommitted = await startWorker();
        vi.setSystemTime(NOW + MINUTE - 1);
        await onCommitted(navigation());
        expect(browser.tabs.update).toHaveBeenCalledTimes(1);

        vi.setSystemTime(NOW + MINUTE);
        await onCommitted(navigation());
        vi.setSystemTime(NOW + 2 * MINUTE);
        await onCommitted(navigation());

        expect(browser.tabs.update).toHaveBeenCalledTimes(1);
        expect(browser.storage.sync.get).toHaveBeenCalledTimes(1);
    });

    it('continues blocking legacy permanent entries after a long time', async () => {
        persisted = { 'example.com': { hostname: 'example.com' } };
        const onCommitted = await startWorker();
        vi.setSystemTime(NOW + 365 * 24 * 60 * MINUTE);

        await onCommitted(navigation());

        expect(browser.tabs.update).toHaveBeenCalledTimes(1);
    });

    it('waits for the initial storage read before deciding on the first navigation', async () => {
        let finishRead: (value: Record<string, WebsitesMap>) => void = () => {};
        vi.mocked(browser.storage.sync.get).mockReturnValue(new Promise((resolve) => {
            finishRead = resolve;
        }));
        const onCommitted = await startWorker();

        const pendingNavigation = onCommitted(navigation());
        expect(browser.tabs.update).not.toHaveBeenCalled();
        finishRead({ websites: { 'example.com': { hostname: 'example.com', blockedUntil: NOW + MINUTE } } });
        await pendingNavigation;

        expect(browser.tabs.update).toHaveBeenCalledTimes(1);
    });

    it.each([
        { frameType: 'sub_frame', frameId: 1 },
        { documentLifecycle: 'prerender' },
        { url: 'https://unblocked.com/' },
    ])('leaves a navigation outside the blocking scope unchanged: %j', async (details) => {
        persisted = { 'example.com': { hostname: 'example.com', blockedUntil: NOW + MINUTE } };
        const onCommitted = await startWorker();

        await onCommitted(navigation(details));

        expect(browser.tabs.update).not.toHaveBeenCalled();
    });

    it('refreshes the cached block when another extension page changes storage', async () => {
        const onCommitted = await startWorker();
        await onCommitted(navigation());
        expect(browser.tabs.update).not.toHaveBeenCalled();
        persisted = { 'example.com': { hostname: 'example.com', blockedUntil: NOW + MINUTE } };
        const onChanged = vi.mocked(browser.storage.sync.onChanged.addListener).mock.calls[0]?.[0];
        if (!onChanged) {
            throw new Error('Background did not register its storage listener');
        }
        onChanged({ websites: { newValue: persisted } });

        await onCommitted(navigation());

        expect(browser.tabs.update).toHaveBeenCalledTimes(1);
    });
});

describe('background storage refresh recovery', () => {
    it('ignores a late read without restoring a deleted block or removing the latest block', async () => {
        const oldRead = deferStorageRead();
        const newRead = deferStorageRead();
        vi.mocked(browser.storage.sync.get)
            .mockReturnValueOnce(oldRead.promise)
            .mockReturnValueOnce(newRead.promise);
        const onCommitted = await startWorker();
        const refreshing = storageChanged();

        newRead.resolve({ websites: { 'new.example.com': { hostname: 'new.example.com' } } });
        await refreshing;
        await onCommitted(navigation({ url: 'https://new.example.com/' }));
        expect(browser.tabs.update).toHaveBeenCalledTimes(1);

        oldRead.resolve({ websites: { 'old.example.com': { hostname: 'old.example.com' } } });
        await vi.advanceTimersByTimeAsync(0);
        vi.mocked(browser.tabs.update).mockClear();
        await onCommitted(navigation({ url: 'https://new.example.com/' }));
        expect(browser.tabs.update).toHaveBeenCalledTimes(1);
        await onCommitted(navigation({ url: 'https://old.example.com/' }));

        expect(browser.tabs.update).toHaveBeenCalledTimes(1);
        expect(browser.storage.sync.get).toHaveBeenCalledTimes(2);
    });

    it('waits for a newer refresh when navigation was already awaiting an older read', async () => {
        const oldRead = deferStorageRead();
        const newRead = deferStorageRead();
        vi.mocked(browser.storage.sync.get)
            .mockReturnValueOnce(oldRead.promise)
            .mockReturnValueOnce(newRead.promise);
        const onCommitted = await startWorker();
        let navigationFinished = false;
        const pendingNavigation = onCommitted(navigation({ url: 'https://new.example.com/' }));
        const navigating = Promise.resolve(pendingNavigation).then(() => {
            navigationFinished = true;
        });
        const refreshing = storageChanged();

        oldRead.resolve({ websites: { 'old.example.com': { hostname: 'old.example.com' } } });
        await vi.advanceTimersByTimeAsync(0);

        expect(navigationFinished).toBe(false);
        expect(browser.tabs.update).not.toHaveBeenCalled();

        newRead.resolve({ websites: { 'new.example.com': { hostname: 'new.example.com' } } });
        await Promise.all([refreshing, navigating]);
        expect(browser.tabs.update).toHaveBeenCalledTimes(1);
        await onCommitted(navigation({ url: 'https://old.example.com/' }));

        expect(navigationFinished).toBe(true);
        expect(browser.tabs.update).toHaveBeenCalledTimes(1);
        expect(browser.storage.sync.get).toHaveBeenCalledTimes(2);
    });

    it('ignores a stale rejection after a newer successful refresh without retrying or logging it', async () => {
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
        const oldRead = deferStorageRead();
        vi.mocked(browser.storage.sync.get).mockReturnValueOnce(oldRead.promise);
        const onCommitted = await startWorker();
        persisted = { 'example.com': { hostname: 'example.com' } };
        await storageChanged();

        oldRead.reject(new Error('stale read failed'));
        await vi.advanceTimersByTimeAsync(0);
        await onCommitted(navigation());

        expect(browser.tabs.update).toHaveBeenCalledTimes(1);
        expect(browser.storage.sync.get).toHaveBeenCalledTimes(2);
        expect(errorLog).not.toHaveBeenCalled();
    });

    it('retries a failed initial read on navigation and resumes blocking without a storage event', async () => {
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
        const readError = new Error('initial read failed');
        persisted = { 'example.com': { hostname: 'example.com' } };
        vi.mocked(browser.storage.sync.get).mockRejectedValueOnce(readError);
        const onCommitted = await startWorker();

        await expect(onCommitted(navigation())).resolves.toBeUndefined();
        await onCommitted(navigation());

        expect(errorLog).toHaveBeenCalledExactlyOnceWith('Unable to load blocked websites.', readError);
        expect(browser.storage.sync.get).toHaveBeenCalledTimes(2);
        expect(browser.tabs.update).toHaveBeenCalledTimes(2);
    });

    it('finishes navigation during persistent initial read failures and recovers on a later navigation', async () => {
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
        const readError = new Error('storage unavailable');
        vi.mocked(browser.storage.sync.get).mockRejectedValue(readError);
        const onCommitted = await startWorker();

        await expect(onCommitted(navigation())).resolves.toBeUndefined();
        expect(browser.storage.sync.get).toHaveBeenCalledTimes(2);
        expect(browser.tabs.update).not.toHaveBeenCalled();

        await expect(onCommitted(navigation())).resolves.toBeUndefined();
        expect(browser.storage.sync.get).toHaveBeenCalledTimes(3);
        expect(errorLog).toHaveBeenCalledTimes(3);

        persisted = { 'example.com': { hostname: 'example.com' } };
        vi.mocked(browser.storage.sync.get).mockResolvedValue({ websites: persisted });
        await onCommitted(navigation());
        await onCommitted(navigation());

        expect(browser.storage.sync.get).toHaveBeenCalledTimes(4);
        expect(browser.tabs.update).toHaveBeenCalledTimes(2);
        expect(errorLog).toHaveBeenCalledTimes(3);
    });

    it('preserves the last loaded permanent block through failed refreshes until storage recovers', async () => {
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
        persisted = { 'example.com': { hostname: 'example.com' } };
        const onCommitted = await startWorker();
        await onCommitted(navigation());
        vi.mocked(browser.tabs.update).mockClear();
        vi.mocked(browser.storage.sync.get).mockRejectedValue(new Error('refresh failed'));

        await storageChanged();
        await expect(onCommitted(navigation())).resolves.toBeUndefined();

        expect(browser.tabs.update).toHaveBeenCalledTimes(1);
        expect(browser.storage.sync.get).toHaveBeenCalledTimes(3);
        expect(errorLog).toHaveBeenCalledTimes(2);

        vi.mocked(browser.storage.sync.get).mockResolvedValue({ websites: {} });
        await onCommitted(navigation());
        await onCommitted(navigation());

        expect(browser.tabs.update).toHaveBeenCalledTimes(1);
        expect(browser.storage.sync.get).toHaveBeenCalledTimes(4);
    });

    it.each([
        { fails: false, joinDuringRetry: false },
        { fails: true, joinDuringRetry: false },
        { fails: false, joinDuringRetry: true },
        { fails: true, joinDuringRetry: true },
    ])('shares one recovery read across overlapping navigations: %j', async ({ fails, joinDuringRetry }) => {
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
        const retryRead = deferStorageRead();
        vi.mocked(browser.storage.sync.get)
            .mockRejectedValueOnce(new Error('initial read failed'))
            .mockReturnValueOnce(retryRead.promise);
        const onCommitted = await startWorker();
        await vi.advanceTimersByTimeAsync(0);

        const firstNavigation = onCommitted(navigation({ tabId: 1 }));
        if (joinDuringRetry) {
            await vi.advanceTimersByTimeAsync(0);
        }
        const secondNavigation = onCommitted(navigation({ tabId: 2 }));
        await vi.advanceTimersByTimeAsync(0);

        expect(browser.storage.sync.get).toHaveBeenCalledTimes(2);
        expect(browser.tabs.update).not.toHaveBeenCalled();

        if (fails) {
            retryRead.reject(new Error('recovery read failed'));
        } else {
            retryRead.resolve({ websites: { 'example.com': { hostname: 'example.com' } } });
        }
        await Promise.all([firstNavigation, secondNavigation]);

        expect(browser.storage.sync.get).toHaveBeenCalledTimes(2);
        if (fails) {
            expect(browser.tabs.update).not.toHaveBeenCalled();
            expect(errorLog).toHaveBeenCalledTimes(2);
        } else {
            expect(browser.tabs.update).toHaveBeenCalledTimes(2);
            expect(browser.tabs.update).toHaveBeenCalledWith(1, {
                url: 'chrome-extension://test-extension/blocked.html',
            });
            expect(browser.tabs.update).toHaveBeenCalledWith(2, {
                url: 'chrome-extension://test-extension/blocked.html',
            });
            expect(errorLog).toHaveBeenCalledTimes(1);
        }
    });
});
