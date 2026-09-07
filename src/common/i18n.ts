/** Browser-selected translations shared by all extension pages. */
import browser from 'webextension-polyfill';
import english from '../_locales/en/messages.json';

export type MessageKey = keyof typeof english;
type WebsiteMessageKey = 'deleteWebsiteLabel' | 'blockWebsiteLabel'
| 'invalidWebsite' | 'duplicateWebsite' | 'missingWebsite';

/** Resolve the actual catalog, including when the browser falls back to English. */
export const currentLocale = (): string => {
    return browser.i18n.getMessage('catalogLocale') || english.catalogLocale.message;
};

/** Translate a whole message; only untranslated website values are substituted. */
export function t(key: Exclude<MessageKey, WebsiteMessageKey>): string;
export function t(key: WebsiteMessageKey, website: string): string;
export function t(key: MessageKey, website?: string): string {
    // Isolate user-entered hostnames from surrounding RTL text in either direction.
    const substitution = website === undefined ? undefined : `\u2068${website}\u2069`;
    const translated = browser.i18n.getMessage(key, substitution);
    if (translated) {
        return translated;
    }
    return english[key].message.replace(/\$WEBSITE\$/g, () => substitution ?? '');
}

/** Apply language, direction and translated title before rendering a page. */
export const applyDocumentLocale = (
    title: 'extensionName' | 'optionsTitle' | 'blockedTitle',
    target: Document = document,
): void => {
    const locale = currentLocale();
    const page = target;
    page.documentElement.lang = locale;
    page.documentElement.dir = /^(ar|fa|he)(-|$)/.test(locale) ? 'rtl' : 'ltr';
    page.title = t(title);
};
