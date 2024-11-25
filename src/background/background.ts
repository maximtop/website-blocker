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
    return !!blockedWebsites[normalizedHostname];
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

const syncInit = () => {
    browser.runtime.onInstalled.addListener(updateBlockedWebsites);
    browser.runtime.onStartup.addListener(updateBlockedWebsites);
    Websites.onChanged.addListener(updateBlockedWebsites);

    browser.webNavigation.onCommitted.addListener(handleOnCommitted, { url: [{ schemes: ['http', 'https'] }] });
};

const asyncInit = async () => {
    await updateBlockedWebsites();
};

const init = () => {
    syncInit();
    asyncInit();
};

export { init };
