import browser from 'webextension-polyfill';

import { Websites, WebsitesMap } from '../common/websites';
import { getHostname } from '../common/utils/url';

let blockedWebsites: WebsitesMap = {};
let blockedWebsitesPromise: Promise<void> | null = null;

type NavigationDetails = browser.WebNavigation.OnCommittedDetailsType & {
    // Chromium supplies this field; Firefox does not.
    documentLifecycle?: string;
};

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
function updateBlockedWebsites(): Promise<void> {
    const update = Websites.getWebsites().then((websites) => {
        // An older read must not replace a newer storage update or mark it ready.
        if (blockedWebsitesPromise === update) {
            blockedWebsites = websites;
            blockedWebsitesPromise = null;
        }
    });
    blockedWebsitesPromise = update;
    return update;
}

const handleOnCommitted = async (
    details: NavigationDetails,
) => {
    // frameId is shared by Firefox and Chromium. Never redirect an iframe's tab
    // or a Chromium document that has not yet left prerendering.
    if (details.frameId !== 0 || details.documentLifecycle === 'prerender') {
        return;
    }

    // Startup and storage changes can overlap; wait for the latest read.
    while (blockedWebsitesPromise) {
        // eslint-disable-next-line no-await-in-loop
        await blockedWebsitesPromise;
    }

    if (isBlocked(details.url)) {
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
    // Event pages must register listeners before asynchronous storage reads.
    syncInit();
    return updateBlockedWebsites();
};

export { init };
