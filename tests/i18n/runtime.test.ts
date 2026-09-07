import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import english from '../../src/_locales/en/messages.json';
import arabic from '../../src/_locales/ar/messages.json';
import russian from '../../src/_locales/ru/messages.json';
import { applyDocumentLocale, currentLocale, t } from '../../src/common/i18n';
import { Websites } from '../../src/common/websites';
import { getErrorMessage } from '../../src/common/utils/error';

const mocks = vi.hoisted(() => ({ getMessage: vi.fn(), get: vi.fn(), set: vi.fn() }));
vi.mock('webextension-polyfill', () => ({
    default: {
        i18n: { getMessage: mocks.getMessage, getUILanguage: () => 'ar' },
        storage: { sync: { get: mocks.get, set: mocks.set, onChanged: {} } },
    },
}));

type Messages = Record<string, { message: string }>;
const selectCatalog = (catalog: Messages): void => {
    mocks.getMessage.mockImplementation((key: string, substitution?: string) => {
        return (catalog[key]?.message ?? '').replace(/\$WEBSITE\$/g, () => substitution ?? '');
    });
};
const page = () => ({ documentElement: { lang: '', dir: '' }, title: '' });

beforeEach(() => {
    vi.resetAllMocks();
    selectCatalog(english);
    mocks.get.mockResolvedValue({});
    mocks.set.mockResolvedValue(undefined);
});

describe('browser-selected translations', () => {
    it('uses the selected catalog rather than the requested browser language', () => {
        const target = page();
        applyDocumentLocale('optionsTitle', target as unknown as Document);
        expect(currentLocale()).toBe('en');
        expect(target).toEqual({
            documentElement: { lang: 'en', dir: 'ltr' }, title: english.optionsTitle.message,
        });
    });

    it('applies RTL direction and translated page titles for the Arabic catalog', () => {
        selectCatalog(arabic);
        const target = page();
        applyDocumentLocale('blockedTitle', target as unknown as Document);
        expect(target.documentElement).toEqual({ lang: 'ar', dir: 'rtl' });
        expect(target.title).toBe(arabic.blockedTitle.message);
    });

    it.each(['fa', 'he', 'pt-BR', 'zh-TW', 'es-419', 'nb'])(
        'preserves the selected catalog language tag: %s',
        (locale) => {
            selectCatalog({ ...english, catalogLocale: { message: locale } });
            const target = page();
            applyDocumentLocale('extensionName', target as unknown as Document);
            expect(target.documentElement.lang).toBe(locale);
            expect(target.documentElement.dir).toBe(['fa', 'he'].includes(locale) ? 'rtl' : 'ltr');
        },
    );

    it('falls back to English and still substitutes literal website values', () => {
        mocks.getMessage.mockReturnValue('');
        expect(currentLocale()).toBe('en');
        expect(t('openSettings')).toBe('Open settings');
        expect(t('invalidWebsite', '$&.example')).toBe('Invalid website: \u2068$&.example\u2069');
    });

    it('isolates technical values inside RTL messages', () => {
        selectCatalog(arabic);
        const result = t('deleteWebsiteLabel', 'example.com');
        expect(result).toBe(arabic.deleteWebsiteLabel.message.replace('$WEBSITE$', '\u2068example.com\u2069'));
        expect(result).not.toContain('$WEBSITE$');
    });
});

describe('localized validation and storage errors', () => {
    it('translates invalid input without attempting to write storage', async () => {
        selectCatalog(russian);
        const error = await Websites.addWebsite('not a website').catch((reason: unknown) => reason);
        expect(getErrorMessage(error)).toBe(
            russian.invalidWebsite.message.replace('$WEBSITE$', '\u2068not a website\u2069'),
        );
        expect(mocks.set).not.toHaveBeenCalled();
    });

    it('translates a duplicate and leaves the saved list unchanged', async () => {
        selectCatalog(russian);
        mocks.get.mockResolvedValue({ websites: { 'example.com': { hostname: 'example.com' } } });
        const error = await Websites.addWebsite('https://www.example.com/path').catch((reason: unknown) => reason);
        expect(getErrorMessage(error)).toBe(
            russian.duplicateWebsite.message.replace('$WEBSITE$', '\u2068example.com\u2069'),
        );
        expect(mocks.set).not.toHaveBeenCalled();
    });

    it('keeps hostnames untranslated when saving a new site', async () => {
        selectCatalog(arabic);
        await Websites.addWebsite('https://www.example.com/path');
        expect(mocks.set).toHaveBeenCalledWith({
            websites: { 'example.com': { hostname: 'example.com', enabled: true } },
        });
    });

    it('translates stale-toggle errors without recreating a removed site', async () => {
        selectCatalog(russian);
        const error = await Websites.setWebsiteEnabled('example.com', false).catch((reason: unknown) => reason);
        expect(getErrorMessage(error)).toBe(
            russian.missingWebsite.message.replace('$WEBSITE$', '\u2068example.com\u2069'),
        );
        expect(mocks.set).not.toHaveBeenCalled();
    });

    it('shows localized generic text for storage failures', async () => {
        selectCatalog(russian);
        mocks.set.mockRejectedValue(new Error('QUOTA_BYTES quota exceeded'));
        const error = await Websites.addWebsite('example.com').catch((reason: unknown) => reason);
        expect(getErrorMessage(error)).toBe(russian.saveError.message);
    });
});
