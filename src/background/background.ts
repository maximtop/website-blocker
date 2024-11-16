import browser from 'webextension-polyfill';

import { Websites, WebsitesMap } from '../common/websites';
import { getHostname } from '../common/utils/url';

let blockedWebsites: WebsitesMap = {};

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
 * Updates the list of blocked websites from Chrome storage.
 */
async function updateBlockedWebsites() {
    blockedWebsites = await Websites.getWebsites();
}

const init = async () => {
    // Load the initial list of blocked websites
    await updateBlockedWebsites();

    // Update blocked websites whenever the extension is installed or updated
    browser.runtime.onInstalled.addListener(updateBlockedWebsites);
    browser.runtime.onStartup.addListener(updateBlockedWebsites);
    Websites.onChanged.addListener(updateBlockedWebsites);

    // Listen for web navigation events
    browser.webNavigation.onCommitted.addListener((details) => {
        // Check if the navigation is not in prerender state
        if (
            // @ts-ignore
            details.frameType === 'outermost_frame'
            // @ts-ignore
            && details.documentLifecycle !== 'prerender'
            && isBlocked(details.url)
        ) {
            browser.tabs.update(details.tabId, { url: browser.runtime.getURL('blocked.html') });
        }
    }, { url: [{ schemes: ['http', 'https'] }] });
};

export { init };
