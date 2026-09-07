import browser from 'webextension-polyfill';

export function canEditWebsiteSettings(): boolean {
    return !browser.extension.inIncognitoContext;
}

export function openRegularWebsiteSettings() {
    return browser.windows.create({
        url: browser.runtime.getURL('options.html'),
        incognito: false,
    });
}
