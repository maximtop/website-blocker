import browser from 'webextension-polyfill';

import { isWebsiteBlocked, Websites, WebsitesMap } from '../common/websites';
import { getHostname } from '../common/utils/url';

let blockedWebsites: WebsitesMap = {};
let blockedWebsitesPromise: Promise<void> | null = null;
let navigationRefresh: Promise<void> | null = null;
let loadRequest = 0;
let needsRefresh = true;

/**
 * Cross-browser navigation details with optional Chromium lifecycle metadata.
 */
type NavigationDetails = browser.WebNavigation.OnCommittedDetailsType & {
    /**
     * Chromium document lifecycle state, absent in Firefox.
     */
    documentLifecycle?: string;
};

/**
 * Checks if a given URL matches any of the blocked websites.
 * @param url - The URL of the website to check.
 * @returns Returns true if the URL matches a blocked website, otherwise false.
 */
function isBlocked(url: string): boolean {
    const normalizedHostname = getHostname(url);
    return normalizedHostname !== null && isWebsiteBlocked(blockedWebsites[normalizedHostname]);
}

/**
 * Updates the cached list while ignoring results superseded by a newer read.
 *
 * @returns Resolves after handling either the storage response or its error.
 */
function updateBlockedWebsites(): Promise<void> {
    loadRequest += 1;
    const request = loadRequest;
    needsRefresh = true;
    const updatePromise = Websites.getWebsites()
        .then((websites) => {
            if (request === loadRequest) {
                blockedWebsites = websites;
                needsRefresh = false;
            }
        })
        .catch((error: unknown) => {
            if (request === loadRequest) {
                // Keep the last known list and retry on the next navigation.
                needsRefresh = true;
                // eslint-disable-next-line no-console
                console.error('Unable to load blocked websites.', error);
            }
        })
        .finally(() => {
            if (request === loadRequest) {
                blockedWebsitesPromise = null;
            }
        });
    blockedWebsitesPromise = updatePromise;
    return updatePromise;
}

/**
 * Waits for the current refresh and any newer refresh that supersedes it.
 *
 * @returns Resolves once all currently relevant reads have settled.
 */
async function waitForUpdates() {
    // A storage event can start a newer read while navigation awaits an older one.
    while (blockedWebsitesPromise) {
        // eslint-disable-next-line no-await-in-loop
        await blockedWebsitesPromise;
    }
}

/**
 * Loads current blocking preferences and redirects matching top-level navigation.
 *
 * @param details - Committed browser navigation to check.
 * @returns Resolves after any required refresh and redirect.
 */
const handleOnCommitted = async (
    details: NavigationDetails,
) => {
    // frameId is shared by Firefox and Chromium. Never redirect an iframe's tab
    // or a Chromium document that has not yet left prerendering.
    if (details.frameId !== 0 || details.documentLifecycle === 'prerender') {
        return;
    }

    const joinedRecovery = navigationRefresh !== null;
    await waitForUpdates();
    if (needsRefresh && !blockedWebsitesPromise && !joinedRecovery) {
        const refresh = updateBlockedWebsites();
        navigationRefresh = refresh;
        await refresh;
        if (navigationRefresh === refresh) {
            navigationRefresh = null;
        }
    }
    await waitForUpdates();

    if (isBlocked(details.url)) {
        await browser.tabs.update(details.tabId, {
            url: browser.runtime.getURL('blocked.html'),
        });
    }
};

/**
 * Registers browser lifecycle, storage and navigation listeners.
 */
const syncInit = () => {
    browser.runtime.onInstalled.addListener(updateBlockedWebsites);
    browser.runtime.onStartup.addListener(updateBlockedWebsites);
    Websites.onChanged.addListener(updateBlockedWebsites);

    browser.webNavigation.onCommitted.addListener(handleOnCommitted, { url: [{ schemes: ['http', 'https'] }] });
};

/**
 * Starts listeners and the first handled storage refresh.
 *
 * @returns Resolves once the initial storage refresh has settled.
 */
const init = () => {
    // Event pages must register listeners before asynchronous storage reads.
    syncInit();
    return updateBlockedWebsites();
};

export { init };
