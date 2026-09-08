// @vitest-environment node

import type browser from 'webextension-polyfill';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { WebsitesMap } from '../src/common/websites';

type NavigationDetails = browser.WebNavigation.OnCommittedDetailsType & {
    frameType?: string;
    documentLifecycle?: string;
};
type NavigationListener = (details: NavigationDetails) => Promise<void>;
type StorageListener = () => Promise<void>;

const mocks = vi.hoisted(() => ({
    onCommitted: vi.fn<(listener: NavigationListener, filter: unknown) => void>(),
    onInstalled: vi.fn<(listener: StorageListener) => void>(),
    onStartup: vi.fn<(listener: StorageListener) => void>(),
    onChanged: vi.fn<(listener: StorageListener) => void>(),
    getWebsites: vi.fn<() => Promise<WebsitesMap>>(),
    updateTab: vi.fn(),
}));

vi.mock('webextension-polyfill', () => ({
    default: {
        runtime: {
            onInstalled: { addListener: mocks.onInstalled },
            onStartup: { addListener: mocks.onStartup },
            getURL: (path: string) => `moz-extension://fixture/${path}`,
        },
        webNavigation: { onCommitted: { addListener: mocks.onCommitted } },
        tabs: { update: mocks.updateTab },
        storage: { sync: { onChanged: { addListener: vi.fn() } } },
    },
}));
vi.mock('../src/common/websites', async (importOriginal) => ({
    ...await importOriginal<typeof import('../src/common/websites')>(),
    Websites: {
        getWebsites: mocks.getWebsites,
        onChanged: { addListener: mocks.onChanged },
    },
}));

const blocked: WebsitesMap = { 'example.com': { hostname: 'example.com' } };
const navigation: NavigationDetails = {
    tabId: 42,
    url: 'https://www.example.com/path',
    frameId: 0,
    transitionType: 'link',
    transitionQualifiers: [],
    timeStamp: 1000,
};

function deferredWebsites() {
    let resolve: (websites: WebsitesMap) => void;
    const promise = new Promise<WebsitesMap>((resolvePromise) => {
        resolve = resolvePromise;
    });
    return { promise, resolve: resolve! };
}

function navigate(overrides: Partial<NavigationDetails> = {}) {
    return mocks.onCommitted.mock.calls[0][0]({ ...navigation, ...overrides });
}

function refresh() {
    return mocks.onChanged.mock.calls[0][0]();
}

describe('background navigation blocking', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.resetAllMocks();
        mocks.getWebsites.mockResolvedValue(blocked);
    });

    it('registers listeners synchronously and waits for startup storage before blocking', async () => {
        const initial = deferredWebsites();
        mocks.getWebsites.mockReturnValue(initial.promise);
        const { init } = await import('../src/background/background');
        const ready = init();

        expect(mocks.onInstalled).toHaveBeenCalledOnce();
        expect(mocks.onStartup).toHaveBeenCalledOnce();
        expect(mocks.onChanged).toHaveBeenCalledOnce();
        expect(mocks.onCommitted).toHaveBeenCalledWith(expect.any(Function), {
            url: [{ schemes: ['http', 'https'] }],
        });

        const pendingNavigation = navigate();
        await Promise.resolve();
        expect(mocks.updateTab).not.toHaveBeenCalled();

        initial.resolve(blocked);
        await ready;
        await pendingNavigation;
        expect(mocks.updateTab).toHaveBeenCalledWith(42, {
            url: 'moz-extension://fixture/blocked.html',
        });
    });

    it('blocks a Firefox top-level navigation without Chromium-only fields', async () => {
        const { init } = await import('../src/background/background');
        await init();
        await navigate();
        expect(mocks.updateTab).toHaveBeenCalledOnce();
    });

    it('blocks an active Chromium top-level navigation', async () => {
        const { init } = await import('../src/background/background');
        await init();
        await navigate({ frameType: 'outermost_frame', documentLifecycle: 'active' });
        expect(mocks.updateTab).toHaveBeenCalledOnce();
    });

    it.each([
        { frameId: 8 },
        { frameId: 8, frameType: 'sub_frame', documentLifecycle: 'active' },
        { frameType: 'outermost_frame', documentLifecycle: 'prerender' },
        { url: 'https://allowed.example.org/' },
    ])('does not redirect a subframe, prerender or allowed URL: %j', async (details) => {
        const { init } = await import('../src/background/background');
        await init();
        await navigate(details);
        expect(mocks.updateTab).not.toHaveBeenCalled();
    });

    it('applies storage removals before checking another navigation', async () => {
        const { init } = await import('../src/background/background');
        await init();
        const changed = deferredWebsites();
        mocks.getWebsites.mockReturnValue(changed.promise);
        const refreshing = refresh();
        const pendingNavigation = navigate();

        changed.resolve({});
        await refreshing;
        await pendingNavigation;
        expect(mocks.updateTab).not.toHaveBeenCalled();
    });

    it('keeps waiting when startup finishes before a newer storage read', async () => {
        const initial = deferredWebsites();
        const changed = deferredWebsites();
        mocks.getWebsites.mockReturnValueOnce(initial.promise).mockReturnValueOnce(changed.promise);
        const { init } = await import('../src/background/background');
        const ready = init();
        const pendingNavigation = navigate();
        const refreshing = refresh();

        initial.resolve({});
        await ready;
        expect(mocks.updateTab).not.toHaveBeenCalled();

        changed.resolve(blocked);
        await refreshing;
        await pendingNavigation;
        expect(mocks.updateTab).toHaveBeenCalledOnce();
    });

    it('ignores an older storage read that finishes after the latest read', async () => {
        const initial = deferredWebsites();
        const changed = deferredWebsites();
        mocks.getWebsites.mockReturnValueOnce(initial.promise).mockReturnValueOnce(changed.promise);
        const { init } = await import('../src/background/background');
        const ready = init();
        const refreshing = refresh();

        changed.resolve({});
        await refreshing;
        initial.resolve(blocked);
        await ready;
        await navigate();
        expect(mocks.updateTab).not.toHaveBeenCalled();
    });
});
