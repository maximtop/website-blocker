/**
 * @file Browser-selected translations shared by all extension pages.
 */
import browser from 'webextension-polyfill';

import english from '../_locales/en/messages.json';

import type { WebsiteErrorCode } from './website-error';

/**
 * Message identifiers available in the English fallback catalog.
 */
export type MessageKey = keyof typeof english;

/**
 * Messages that require a literal website or formatted deadline substitution.
 */
type SubstitutionMessageKey = 'deleteWebsiteLabel' | 'blockWebsiteLabel' | 'editWebsiteLabel'
| WebsiteErrorCode | 'blockedUntil';

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
 * Translates a message that does not need a substitution.
 *
 * @param key - Catalog message to translate.
 *
 * @returns The selected translation or English fallback.
 */
export function t(key: Exclude<MessageKey, SubstitutionMessageKey>): string;

/**
 * Translates a message containing a literal value.
 *
 * @param key - Catalog message with a named placeholder.
 * @param value - Literal address or formatted deadline to isolate and substitute.
 *
 * @returns The selected translation with its substituted value.
 */
export function t(key: SubstitutionMessageKey, value: string): string;

/**
 * Resolves translations and isolates substituted values from surrounding RTL text.
 *
 * @param key - Catalog message to translate.
 * @param value - Optional literal value for messages with a placeholder.
 *
 * @returns The selected translation or fully substituted English fallback.
 */
export function t(key: MessageKey, value?: string): string {
    // Isolate hostnames and formatted deadlines from surrounding RTL text in either direction.
    const substitution = value === undefined ? undefined : `\u2068${value}\u2069`;
    const translated = browser.i18n.getMessage(key, substitution);
    if (translated) {
        return translated;
    }
    return english[key].message.replace(/\$(?:WEBSITE|DEADLINE)\$/g, () => substitution ?? '');
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
