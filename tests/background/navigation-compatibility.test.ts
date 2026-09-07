// @vitest-environment node

import browser from 'webextension-polyfill';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { Websites, WebsitesMap } from '../../src/common/websites';

vi.mock('webextension-polyfill', () => ({
    default: {
        runtime: {
            onInstalled: { addListener: vi.fn() },
            onStartup: { addListener: vi.fn() },
            getURL: vi.fn(),
        },
        tabs: { update: vi.fn() },
        webNavigation: { onCommitted: { addListener: vi.fn() } },
    },
}));
vi.mock('../../src/common/websites', () => ({
    Websites: {
        getWebsites: vi.fn(),
        onChanged: { addListener: vi.fn() },
    },
}));

type NavigationDetails = browser.WebNavigation.OnCommittedDetailsType & {
    frameType?: string;
    documentLifecycle?: string;
};
const blockedWebsites: WebsitesMap = {
    'example.com': { hostname: 'example.com' },
};
const navigation = (overrides: Partial<NavigationDetails> = {}): NavigationDetails => ({
    tabId: 17,
    frameId: 0,
    url: 'https://www.example.com/blocked-page',
    timeStamp: 123,
    transitionType: 'link',
    transitionQualifiers: [],
    ...overrides,
});
const startBackground = async () => {
    const { init } = await import('../../src/background/background');
    init();
    return vi.mocked(browser.webNavigation.onCommitted.addListener).mock.calls[0][0] as
        (details: NavigationDetails) => Promise<void>;
};

beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.mocked(Websites.getWebsites).mockResolvedValue(blockedWebsites);
    vi.mocked(browser.runtime.getURL).mockReturnValue('moz-extension://fixture/blocked.html');
});

describe('blocked website navigation', () => {
    it('redirects a Firefox top-level navigation without Chromium frame metadata', async () => {
        const onCommitted = await startBackground();
        await onCommitted(navigation());
        expect(browser.tabs.update).toHaveBeenCalledExactlyOnceWith(17, {
            url: 'moz-extension://fixture/blocked.html',
        });
    });

    it('continues redirecting active Chromium top-level navigations', async () => {
        const onCommitted = await startBackground();
        await onCommitted(navigation({ frameType: 'outermost_frame', documentLifecycle: 'active' }));
        expect(browser.tabs.update).toHaveBeenCalledExactlyOnceWith(17, {
            url: 'moz-extension://fixture/blocked.html',
        });
    });

    it.each([
        ['a subframe', { frameId: 2 }],
        ['an unblocked website', { url: 'https://unblocked.example.org/' }],
        ['a prerendered document', { frameType: 'outermost_frame', documentLifecycle: 'prerender' }],
    ] satisfies [string, Partial<NavigationDetails>][])('does not redirect %s', async (_, overrides) => {
        const onCommitted = await startBackground();
        await onCommitted(navigation(overrides));
        expect(browser.tabs.update).not.toHaveBeenCalled();
    });

    it('waits for the stored blocklist before deciding whether to redirect', async () => {
        let loadWebsites: (websites: WebsitesMap) => void = () => {};
        vi.mocked(Websites.getWebsites).mockReturnValue(new Promise((resolve) => {
            loadWebsites = resolve;
        }));
        const onCommitted = await startBackground();
        const pendingNavigation = onCommitted(navigation());
        expect(browser.tabs.update).not.toHaveBeenCalled();

        loadWebsites(blockedWebsites);
        await pendingNavigation;
        expect(browser.tabs.update).toHaveBeenCalledExactlyOnceWith(17, {
            url: 'moz-extension://fixture/blocked.html',
        });
    });
});
