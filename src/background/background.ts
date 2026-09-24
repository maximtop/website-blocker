/**
 * @file Background blocking: keeps the saved website list and redirects blocked tabs.
 */

import browser from 'webextension-polyfill';

import { getHostname } from '../common/utils/url';
import { isWebsiteBlocked, Websites } from '../common/websites';

import type { WebsitesMap } from '../common/websites';

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
 *
 * @param url - The URL of the website to check.
 *
 * @returns Returns true if the URL matches a blocked website, otherwise false.
 */
function isBlocked(url: string): boolean {
    if (!/^https?:\/\//i.test(url)) {
        return false;
    }
    const normalizedHostname = getHostname(url);
    return normalizedHostname !== null && isWebsiteBlocked(blockedWebsites[normalizedHostname]);
}

/**
 * Redirects matching tabs across all accessible windows using the latest successful read.
 *
 * @param request - Storage revision that requested this scan.
 *
 * @returns Resolves after all redirects, including tabs closed during the scan, settle.
 */
async function blockOpenTabs(request: number): Promise<void> {
    try {
        const tabs = await browser.tabs.query({});
        await Promise.all(tabs.map(async (tab) => {
            if (request !== loadRequest || tab.id === undefined || !isBlocked(tab.pendingUrl || tab.url || '')) {
                return;
            }
            try {
                // The tab may have navigated or closed since the query finished.
                const current = await browser.tabs.get(tab.id);
                if (request !== loadRequest || !isBlocked(current.pendingUrl || current.url || '')) {
                    return;
                }
                await browser.tabs.update(tab.id, { url: browser.runtime.getURL('blocked.html') });
            } catch (error: unknown) {
                // A disappearing or inaccessible tab must not prevent other tabs from being blocked.
                console.error('Unable to redirect an open tab.', error);
            }
        }));
    } catch (error: unknown) {
        // Navigation blocking still uses the successfully refreshed preferences.
        console.error('Unable to query open tabs.', error);
    }
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
        .then(async (websites) => {
            if (request === loadRequest) {
                blockedWebsites = websites;
                needsRefresh = false;
                await blockOpenTabs(request);
            }
        })
        .catch((error: unknown) => {
            if (request === loadRequest) {
                // Keep the last known list and retry on the next navigation.
                needsRefresh = true;
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
        await blockedWebsitesPromise;
    }
}

/**
 * Loads current blocking preferences and redirects matching top-level navigation.
 *
 * @param details - Committed browser navigation to check.
 *
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
    // Browsers ignore listener return values; the refresh handles its own errors.
    const refresh = () => {
        void updateBlockedWebsites();
    };
    browser.runtime.onInstalled.addListener(refresh);
    browser.runtime.onStartup.addListener(refresh);
    Websites.onChanged.addListener(refresh);

    browser.webNavigation.onCommitted.addListener((details) => {
        void handleOnCommitted(details);
    }, { url: [{ schemes: ['http', 'https'] }] });
};

/**
 * Starts listeners, loads preferences and applies blocking to existing tabs on enable or restart.
 *
 * @returns Resolves once the initial storage refresh and open-tab scan have settled.
 */
const init = () => {
    // Event pages must register listeners before asynchronous storage reads.
    syncInit();
    return updateBlockedWebsites();
};

export { handleOnCommitted, init, updateBlockedWebsites };
