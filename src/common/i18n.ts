/**
 * Browser-selected translations shared by all extension pages.
 */
import browser from 'webextension-polyfill';
import english from '../_locales/en/messages.json';
import type { WebsiteErrorCode } from './website-error';

/**
 * Message identifiers available in the English fallback catalog.
 */
export type MessageKey = keyof typeof english;
/**
 * Messages that require an untranslated website substitution.
 */
type WebsiteMessageKey = 'deleteWebsiteLabel' | 'blockWebsiteLabel' | 'editWebsiteLabel' | WebsiteErrorCode;

/**
 * Catalog keys used for each extension page title.
 */
export const PAGE_TITLE = {
    Popup: 'extensionName',
    Options: 'optionsTitle',
    Blocked: 'blockedTitle',
} as const satisfies Record<string, MessageKey>;

/**
 * Supported page title keys derived from the shared page mapping.
 */
export type PageTitle = typeof PAGE_TITLE[keyof typeof PAGE_TITLE];

/**
 * Document direction values shared by pages and runtime checks.
 */
export const DOCUMENT_DIRECTION = {
    LTR: 'ltr',
    RTL: 'rtl',
} as const;

/**
 * Resolves the actual catalog, including when the browser falls back to English.
 *
 * @returns The language tag declared by the selected catalog.
 */
export const currentLocale = (): string => {
    return browser.i18n.getMessage('catalogLocale') || english.catalogLocale.message;
};

/**
 * Translates a message that does not need a website substitution.
 *
 * @param key - Catalog message to translate.
 * @returns The selected translation or English fallback.
 */
export function t(key: Exclude<MessageKey, WebsiteMessageKey>): string;
/**
 * Translates a message containing an untranslated website.
 *
 * @param key - Catalog message with a website placeholder.
 * @param website - Literal address to isolate and substitute.
 * @returns The selected translation with its website value.
 */
export function t(key: WebsiteMessageKey, website: string): string;
/**
 * Resolves translations and isolates website substitutions from surrounding RTL text.
 *
 * @param key - Catalog message to translate.
 * @param website - Optional literal address for messages with a website placeholder.
 * @returns The selected translation or fully substituted English fallback.
 */
export function t(key: MessageKey, website?: string): string {
    // Isolate user-entered hostnames from surrounding RTL text in either direction.
    const substitution = website === undefined ? undefined : `\u2068${website}\u2069`;
    const translated = browser.i18n.getMessage(key, substitution);
    if (translated) {
        return translated;
    }
    return english[key].message.replace(/\$WEBSITE\$/g, () => substitution ?? '');
}

/**
 * Applies language, direction and translated title before rendering a page.
 *
 * @param title - Shared title key for the page being initialized.
 * @param target - Document receiving the translated metadata.
 */
export const applyDocumentLocale = (
    title: PageTitle,
    target: Document = document,
): void => {
    const locale = currentLocale();
    const page = target;
    page.documentElement.lang = locale;
    page.documentElement.dir = /^(ar|fa|he)(-|$)/.test(locale) ? DOCUMENT_DIRECTION.RTL : DOCUMENT_DIRECTION.LTR;
    page.title = t(title);
};
