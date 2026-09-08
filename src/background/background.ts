import browser from 'webextension-polyfill';

import { isWebsiteBlocked, Websites, WebsitesMap } from '../common/websites';
import { getHostname } from '../common/utils/url';

let blockedWebsites: WebsitesMap = {};
let blockedWebsitesPromise: Promise<void> | null = null;
let navigationRefresh: Promise<void> | null = null;
let loadRequest = 0;
let needsRefresh = true;

/**
 * Checks if a given URL matches any of the blocked websites.
 * @param url - The URL of the website to check.
 * @returns Returns true if the URL matches a blocked website, otherwise false.
 */
function isBlocked(url: string): boolean {
    const normalizedHostname = getHostname(url);
    return isWebsiteBlocked(blockedWebsites[normalizedHostname]);
}

/**
 * Updates the list of blocked websites from storage.
 */
function updateBlockedWebsites() {
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

async function waitForUpdates() {
    // A storage event can start a newer read while navigation awaits an older one.
    while (blockedWebsitesPromise) {
        // eslint-disable-next-line no-await-in-loop
        await blockedWebsitesPromise;
    }
}

const handleOnCommitted = async (
    details: browser.WebNavigation.OnCommittedDetailsType,
) => {
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

const init = () => {
    syncInit();
    updateBlockedWebsites();
};

export { init };
