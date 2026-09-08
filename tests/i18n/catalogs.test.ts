import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import english from '../../src/_locales/en/messages.json';
import { Catalog, validateCatalog, validateCatalogs } from '../../scripts/i18n/catalogs';
import { DESCRIPTION_SOURCE, extractDescriptions } from '../../scripts/store/descriptions';

describe('shipped translation sources', () => {
    it('contains every message and placeholder in each of the 40 catalogs', () => {
        expect(() => validateCatalogs()).not.toThrow();
    });

    it.each(['missing', 'empty', 'placeholder', 'position', 'metadata', 'length'])(
        'rejects a broken catalog: %s',
        (damage) => {
            const catalog: Catalog = structuredClone(english);
            if (damage === 'missing') delete catalog.closeTab;
            if (damage === 'empty') catalog.closeTab.message = ' ';
            if (damage === 'placeholder') catalog.invalidWebsite.message = 'Invalid website';
            if (damage === 'position') {
                catalog.invalidWebsite.placeholders = { website: { content: '$2' } };
            }
            if (damage === 'metadata') catalog.catalogLocale.message = 'ar';
            if (damage === 'length') catalog.extensionDescription.message = 'x'.repeat(133);
            expect(() => validateCatalog('en', catalog)).toThrow();
        },
    );

    it('exports a nonempty store description for every language', () => {
        const source = fs.readFileSync(DESCRIPTION_SOURCE, 'utf8');
        const descriptions = extractDescriptions(source);
        expect(Object.keys(descriptions)).toHaveLength(40);
        Object.values(descriptions).forEach((description) => {
            expect(description).toContain('https://github.com/maximtop/website-blocker');
            expect(description).not.toMatch(/^## /m);
            expect(description).toContain('• ');
        });
    });

    it('rejects incomplete and duplicate store description packs', () => {
        expect(() => extractDescriptions('## English (en)\n\nDescription')).toThrow('exactly the 40');
        expect(() => extractDescriptions('## English (en)\nOne\n## English (en)\nTwo')).toThrow('Duplicate');
    });
});
