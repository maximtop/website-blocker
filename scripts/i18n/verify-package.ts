/** Verify every release ZIP, including the Chromium Norwegian alias. */
import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { Browser, BROWSERS } from '../build/constants';
import {
    Catalog,
    CHROMIUM_LOCALE_ALIAS,
    LOCALES,
    LOCALES_PATH,
    validateCatalog,
} from './catalogs';

BROWSERS.forEach((browser) => {
    const archive = new AdmZip(path.resolve(__dirname, `../../dist/release/${browser}.zip`));
    const manifest = JSON.parse(archive.readAsText('manifest.json'));
    if (manifest.default_locale !== 'en' || manifest.name !== '__MSG_extensionName__'
        || manifest.description !== '__MSG_extensionDescription__') {
        throw new Error(`${browser}: manifest must use the English default and localized metadata`);
    }
    const packaged = archive.getEntries().map((entry) => entry.entryName)
        .filter((name) => /^_locales\/[^/]+\/messages\.json$/.test(name)).sort();
    const locales = browser === Browser.Firefox ? LOCALES : [...LOCALES, CHROMIUM_LOCALE_ALIAS.target];
    const expected = locales.map((locale) => `_locales/${locale}/messages.json`).sort();
    if (JSON.stringify(packaged) !== JSON.stringify(expected)) {
        throw new Error(`${browser}: release ZIP does not contain the expected locales`);
    }
    LOCALES.forEach((locale) => {
        const filename = `_locales/${locale}/messages.json`;
        const content = archive.readAsText(filename);
        const catalog: Catalog = JSON.parse(content);
        validateCatalog(locale, catalog);
        const source = fs.readFileSync(path.join(LOCALES_PATH, locale, 'messages.json'), 'utf8');
        if (source !== content) {
            throw new Error(`${browser}: packaged catalog differs from source: ${locale}`);
        }
    });
    if (browser !== Browser.Firefox) {
        const { source, target } = CHROMIUM_LOCALE_ALIAS;
        if (archive.readAsText(`_locales/${target}/messages.json`)
            !== archive.readAsText(`_locales/${source}/messages.json`)) {
            throw new Error(`${browser}: Norwegian ${target} alias must exactly match ${source}`);
        }
    }
    process.stdout.write(`Verified ${browser} ZIP: 40 complete languages in ${locales.length} directories.\n`);
});
