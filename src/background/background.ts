import browser from 'webextension-polyfill';

import { Websites, WebsitesMap } from '../common/websites';
import { getHostname } from '../common/utils/url';

let blockedWebsites: WebsitesMap = {};
let blockedWebsitesPromise: Promise<void> | null = null;

/**
 * Checks if a given URL matches any of the blocked websites.
 * @param url - The URL of the website to check.
 * @returns Returns true if the URL matches a blocked website, otherwise false.
 */
function isBlocked(url: string): boolean {
    const normalizedHostname = getHostname(url);
    if (!normalizedHostname) {
        return false;
    }

    const website = blockedWebsites[normalizedHostname];
    return !!website && website.enabled !== false;
}

/**
 * Updates the list of blocked websites from storage.
 */
function updateBlockedWebsites() {
    blockedWebsitesPromise = Websites.getWebsites().then((websites) => {
        blockedWebsites = websites;
        blockedWebsitesPromise = null;
    });
}

/**
 * Redirects a committed top-level navigation when its hostname is blocked.
 *
 * @param details - Browser navigation event with the destination URL and tab.
 * @returns Resolves after checking the loaded list and applying any redirect.
 */
const handleOnCommitted = async (
    details: browser.WebNavigation.OnCommittedDetailsType,
) => {
    // Wait until blockedWebsites is initialized
    if (blockedWebsitesPromise) {
        await blockedWebsitesPromise;
    }

    // Check if the navigation is not in prerender state
    if (
        // @ts-ignore
        details.frameType === 'outermost_frame'
        // @ts-ignore
        && details.documentLifecycle !== 'prerender'
        && isBlocked(details.url)
    ) {
        await browser.tabs.update(details.tabId, {
            url: browser.runtime.getURL('blocked.html'),
        });
    }
};

/**
 * Registers storage, browser lifecycle, and navigation listeners.
 */
const syncInit = () => {
    browser.runtime.onInstalled.addListener(updateBlockedWebsites);
    browser.runtime.onStartup.addListener(updateBlockedWebsites);
    Websites.onChanged.addListener(updateBlockedWebsites);

    browser.webNavigation.onCommitted.addListener(handleOnCommitted, { url: [{ schemes: ['http', 'https'] }] });
};

/**
 * Starts loading the blocked list used by navigation checks.
 *
 * @returns Resolves after requesting the initial storage load.
 */
const asyncInit = async () => {
    await updateBlockedWebsites();
};

/**
 * Starts background listeners and the initial blocked-list load.
 */
const init = () => {
    syncInit();
    asyncInit();
};

export { init };
