/** Extract complete localized store descriptions from the canonical markdown. */
import fs from 'node:fs';
import path from 'node:path';
import { LOCALES, validateCatalogs } from '../i18n/catalogs';

export const DESCRIPTION_SOURCE = path.resolve(__dirname, '../../docs/store/STORE_DESCRIPTIONS.md');

/** Split locale sections and reject incomplete or duplicate listing packs. */
export const extractDescriptions = (content: string): Record<string, string> => {
    const headings = Array.from(content.matchAll(/^## .+ \(([a-zA-Z0-9_]+)\)\s*$/gm));
    const descriptions: Record<string, string> = {};
    headings.forEach((heading, index) => {
        const locale = heading[1];
        if (Object.hasOwn(descriptions, locale)) {
            throw new Error(`Duplicate store description: ${locale}`);
        }
        const start = heading.index + heading[0].length;
        const end = headings[index + 1]?.index ?? content.length;
        const description = content.slice(start, end).trim().replace(/^- /gm, '• ');
        if (!description || description.length > 16000) {
            throw new Error(`Empty or oversized store description: ${locale}`);
        }
        descriptions[locale] = description;
    });
    if (JSON.stringify(Object.keys(descriptions).sort()) !== JSON.stringify([...LOCALES].sort())) {
        throw new Error('Store descriptions must cover exactly the 40 source locales');
    }
    return descriptions;
};

if (require.main === module) {
    validateCatalogs();
    const descriptions = extractDescriptions(fs.readFileSync(DESCRIPTION_SOURCE, 'utf8'));
    const output = path.resolve(__dirname, '../../build/store-descriptions');
    fs.mkdirSync(output, { recursive: true });
    Object.entries(descriptions).forEach(([locale, description]) => {
        fs.writeFileSync(path.join(output, `${locale}.txt`), `${description}\n`);
    });
    process.stdout.write(`Generated ${Object.keys(descriptions).length} descriptions in build/store-descriptions/.\n`);
}
