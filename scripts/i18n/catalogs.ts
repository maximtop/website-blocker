/**
 * @file Validate the complete locale pack before it is shipped.
 */
import fs from 'node:fs';
import path from 'node:path';

import english from '../../src/_locales/en/messages.json';

/**
 * The 40 source locales.
 */
export const LOCALES = [
    'ar', 'bg', 'bn', 'ca', 'cs', 'da', 'de', 'el', 'en', 'es', 'es_419', 'fa', 'fi', 'fil',
    'fr', 'he', 'hi', 'hr', 'hu', 'id', 'it', 'ja', 'ko', 'ms', 'nb', 'nl', 'pl', 'pt_BR',
    'pt_PT', 'ro', 'ru', 'sk', 'sr', 'sv', 'th', 'tr', 'uk', 'vi', 'zh_CN', 'zh_TW',
] as const;

/**
 * Chromium requires a Norwegian catalog alias in addition to the shared source locale.
 */
export const CHROMIUM_LOCALE_ALIAS = {
    source: 'nb',
    target: 'no',
} as const satisfies { source: typeof LOCALES[number]; target: string };

/**
 * Messages of one locale, keyed by message name.
 */
export type Catalog = Record<string, {
    message: string;
    placeholders?: Record<string, { content: string; example?: string }>;
}>;

const BASE_CATALOG: Catalog = english;
const BASE_KEYS = Object.keys(english).sort();
export const LOCALES_PATH = path.resolve(__dirname, '../../src/_locales');

/**
 * Check catalog schema, translated values, placeholders and store limits.
 *
 * @param locale - Locale of the catalog, e.g. `pt_BR`.
 * @param catalog - Parsed messages.json.
 */
export const validateCatalog = (locale: string, catalog: Catalog): void => {
    const fail: (reason: string) => never = (reason) => {
        throw new Error(`${locale}: ${reason}`);
    };
    if (JSON.stringify(Object.keys(catalog).sort()) !== JSON.stringify(BASE_KEYS)) {
        fail('Message keys must exactly match the English catalog');
    }
    Object.entries(BASE_CATALOG).forEach(([key, base]) => {
        const entry = catalog[key];
        if (!entry || typeof entry.message !== 'string' || !entry.message.trim()) {
            fail(`Empty or invalid message: ${key}`);
        }
        const basePlaceholders = base.placeholders ?? {};
        const placeholders = entry.placeholders ?? {};
        if (JSON.stringify(Object.keys(placeholders).sort()) !== JSON.stringify(Object.keys(basePlaceholders).sort())) {
            fail(`Placeholder definitions differ: ${key}`);
        }
        Object.entries(basePlaceholders).forEach(([name, definition]) => {
            if (placeholders[name]?.content !== definition.content) {
                fail(`Placeholder position differs: ${key}.${name}`);
            }
        });
        const expectedTokens = (base.message.match(/\$[^$]+\$/g) ?? []).sort();
        const actualTokens = (entry.message.match(/\$[^$]+\$/g) ?? []).sort();
        if (JSON.stringify(expectedTokens) !== JSON.stringify(actualTokens)) {
            fail(`Message placeholders differ: ${key}`);
        }
    });
    const message = (key: string): string => catalog[key]?.message ?? fail(`Missing message: ${key}`);
    if (message('catalogLocale') !== locale.replace('_', '-')) {
        fail('catalogLocale must identify the actual catalog using BCP 47');
    }
    if (message('extensionName').length > 75 || message('extensionDescription').length > 132) {
        fail('Name or short description exceeds the store limit');
    }
};

/**
 * Validate all sources, rejecting missing and unexpected locale directories.
 *
 * @throws If the locale directories or any catalog are invalid.
 */
export const validateCatalogs = (): void => {
    const directories = fs.readdirSync(LOCALES_PATH, { withFileTypes: true })
        .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    if (JSON.stringify(directories) !== JSON.stringify([...LOCALES].sort())) {
        throw new Error('Expected exactly the 40 supported source locale directories');
    }
    LOCALES.forEach((locale) => {
        const file = path.join(LOCALES_PATH, locale, 'messages.json');
        const catalog = JSON.parse(fs.readFileSync(file, 'utf8')) as Catalog;
        validateCatalog(locale, catalog);
    });
};
