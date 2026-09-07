// @vitest-environment node

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { init } from '../../src/background/background';
import { Websites, WebsitesMap } from '../../src/common/websites';

const browserMock = vi.hoisted(() => ({
    storageGet: vi.fn(),
    storageSet: vi.fn(),
    storageAddListener: vi.fn(),
    navigationAddListener: vi.fn(),
    installedAddListener: vi.fn(),
    startupAddListener: vi.fn(),
    updateTab: vi.fn(),
}));

vi.mock('webextension-polyfill', () => ({
    default: {
        extension: { inIncognitoContext: false },
        storage: {
            sync: {
                get: browserMock.storageGet,
                set: browserMock.storageSet,
                onChanged: { addListener: browserMock.storageAddListener },
            },
        },
        runtime: {
            getURL: (path: string) => `moz-extension://website-blocker/${path}`,
            onInstalled: { addListener: browserMock.installedAddListener },
            onStartup: { addListener: browserMock.startupAddListener },
        },
        webNavigation: {
            onCommitted: { addListener: browserMock.navigationAddListener },
        },
        tabs: { update: browserMock.updateTab },
    },
}));

let persistedWebsites: WebsitesMap;

const navigate = async (url: string, browser: 'firefox' | 'chromium' = 'chromium') => {
    const listener = browserMock.navigationAddListener.mock.calls[0][0];
    await listener({
        url,
        tabId: 42,
        frameId: 0,
        ...(browser === 'chromium' ? { frameType: 'outermost_frame', documentLifecycle: 'active' } : {}),
    });
};

const notifyStorageChanged = () => {
    const listener = browserMock.storageAddListener.mock.calls[0][0];
    listener({ websites: { newValue: structuredClone(persistedWebsites) } });
};

beforeEach(() => {
    vi.resetAllMocks();
    persistedWebsites = {
        'enabled.com': { hostname: 'enabled.com', enabled: true },
        'disabled.com': { hostname: 'disabled.com', enabled: false },
        'legacy.com': { hostname: 'legacy.com' },
    };
    browserMock.storageGet.mockImplementation(async (key: string) => ({
        [key]: structuredClone(persistedWebsites),
    }));
    browserMock.storageSet.mockImplementation(async (data: { websites: WebsitesMap }) => {
        persistedWebsites = structuredClone(data.websites);
    });
    browserMock.updateTab.mockResolvedValue(undefined);
    init();
});

describe('navigation with per-website blocking preferences', () => {
    it.each([
        'https://disabled.com/',
        'https://www.disabled.com/some-page',
        'https://unlisted.com/',
    ])('allows navigation to %s', async (url) => {
        await navigate(url);

        expect(browserMock.updateTab).not.toHaveBeenCalled();
    });

    it.each(['https://enabled.com/', 'https://legacy.com/'])('blocks navigation to %s', async (url) => {
        await navigate(url);

        expect(browserMock.updateTab).toHaveBeenCalledExactlyOnceWith(42, {
            url: 'moz-extension://website-blocker/blocked.html',
        });
    });

    it.each(['firefox', 'chromium'] as const)(
        'applies persisted toggle changes in %s after storage events without restarting the background',
        async (browser) => {
            await navigate('https://disabled.com/', browser);
            expect(browserMock.updateTab).not.toHaveBeenCalled();

            await Websites.setWebsiteEnabled('disabled.com', true);
            notifyStorageChanged();
            await navigate('https://disabled.com/', browser);

            expect(browserMock.updateTab).toHaveBeenCalledExactlyOnceWith(42, {
                url: 'moz-extension://website-blocker/blocked.html',
            });

            browserMock.updateTab.mockClear();
            await Websites.setWebsiteEnabled('disabled.com', false);
            notifyStorageChanged();
            await navigate('https://disabled.com/', browser);

            expect(browserMock.updateTab).not.toHaveBeenCalled();
            expect(persistedWebsites['disabled.com']).toEqual({ hostname: 'disabled.com', enabled: false });
        },
    );
});
