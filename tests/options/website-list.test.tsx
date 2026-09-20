// @vitest-environment jsdom

import fs from 'node:fs';
import path from 'node:path';
import { locks } from 'node:worker_threads';
import React from 'react';
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
    type MockInstance,
} from 'vitest';

import { LOCALES, LOCALES_PATH, type Catalog } from '../../scripts/i18n/catalogs';
import { applyDocumentLocale, PAGE_TITLE } from '../../src/common/i18n';
import { Storage } from '../../src/common/storage';
import { RootStore, RootStoreContext } from '../../src/options/stores/root-store';
import { WebsiteList } from '../../src/options/components/WebsiteList/WebsiteList';

vi.mock('../../src/common/storage', () => ({
    Storage: {
        getAll: vi.fn(),
        set: vi.fn(),
        setMany: vi.fn(),
        onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
}));
const translations = vi.hoisted(() => ({ getMessage: vi.fn() }));
vi.mock('webextension-polyfill', () => ({ default: { i18n: { getMessage: translations.getMessage } } }));

const NOW = Date.UTC(2026, 8, 20, 12);
const MINUTE = 60_000;
let persisted: Record<string, unknown>;
let diagnostics: MockInstance;
let warnings: MockInstance;
const catalogFor = (locale: string): Catalog => {
    return JSON.parse(fs.readFileSync(path.join(LOCALES_PATH, locale, 'messages.json'), 'utf8'));
};
const openList = (locale: string) => {
    const catalog = catalogFor(locale);
    translations.getMessage.mockImplementation((key: string, value?: string) => {
        return catalog[key].message.replace(/\$(?:WEBSITE|DEADLINE)\$/g, () => value ?? '');
    });
    applyDocumentLocale(PAGE_TITLE.Options);
    render(<RootStoreContext.Provider value={new RootStore()}><WebsiteList /></RootStoreContext.Provider>);
    return catalog;
};
const ready = async () => {
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
};

beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    Object.defineProperty(navigator, 'locks', { configurable: true, value: locks });
    persisted = { 'website:saved.com': { hostname: 'saved.com', enabled: true } };
    vi.mocked(Storage.getAll).mockImplementation(async () => structuredClone(persisted));
    vi.mocked(Storage.set).mockImplementation(async (key, value) => {
        persisted[key] = structuredClone(value);
    });
    diagnostics = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
    cleanup();
    expect(warnings).not.toHaveBeenCalled();
    vi.restoreAllMocks();
});

describe('localized timer interface', () => {
    it.each(LOCALES)('renders and submits translated duration controls in %s', async (locale) => {
        const catalog = openList(locale);
        const message = (key: string) => catalog[key].message;
        expect(screen.getByRole('status').textContent).toBe(message('loadingWebsites'));
        expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(true);
        await ready();
        expect(document.documentElement.lang).toBe(message('catalogLocale'));
        expect(document.documentElement.dir).toBe(['ar', 'fa', 'he'].includes(locale) ? 'rtl' : 'ltr');
        expect(screen.getByText(message('websiteLabel'))).toBeTruthy();
        expect(screen.getByText(message('blockDuration'))).toBeTruthy();
        expect(screen.getByText(message('timerExplanation'))).toBeTruthy();
        const selector = screen.getByRole('combobox');
        expect(within(selector).getAllByRole('option').map((option) => option.textContent)).toEqual([
            'indefinitely', 'duration15Minutes', 'duration30Minutes', 'duration60Minutes', 'customDuration',
        ].map(message));
        const savedRow = screen.getByRole('listitem');
        expect(within(savedRow).getByText(message('indefinitely'))).toBeTruthy();

        fireEvent.change(selector, { target: { value: 'custom' } });
        const minutes = screen.getByRole('spinbutton', { name: message('minutes') });
        const website = screen.getByRole('textbox', { name: message('websiteInputPlaceholder') });
        fireEvent.change(website, { target: { value: 'timed.com' } });
        fireEvent.change(minutes, { target: { value: '7' } });
        fireEvent.click(screen.getByRole('button', { name: message('addWebsite') }));
        const deadline = new Date(NOW + 7 * MINUTE);
        const formatted = deadline.toLocaleString(message('catalogLocale'));
        const expected = message('blockedUntil').replace('$DEADLINE$', `\u2068${formatted}\u2069`);
        const deadlineLabel = await screen.findByText(expected, { normalizer: (text) => text });
        expect(deadlineLabel.getAttribute('datetime')).toBe(deadline.toISOString());
        expect(persisted['website:timed.com']).toMatchObject({
            hostname: 'timed.com', enabled: true, blockedUntil: deadline.getTime(),
        });
        expect((website as HTMLInputElement).value).toBe('');
        expect(diagnostics).not.toHaveBeenCalled();
    });

    it.each(['ru', 'de', 'ar'])('adds all presets and preserves deadlines when toggled in %s', async (locale) => {
        const catalog = openList(locale);
        const user = userEvent.setup();
        await ready();
        const selector = screen.getByRole('combobox');
        const website = screen.getByRole('textbox', { name: catalog.websiteInputPlaceholder.message });
        const saved = persisted;
        // Preset additions share one form and must run sequentially.
        // eslint-disable-next-line no-restricted-syntax
        for (const minutes of [15, 30, 60]) {
            // eslint-disable-next-line no-await-in-loop
            await user.selectOptions(selector, `${minutes}`);
            // eslint-disable-next-line no-await-in-loop
            await user.type(website, `timer${minutes}.com`);
            // eslint-disable-next-line no-await-in-loop
            await user.click(screen.getByRole('button', { name: catalog.addWebsite.message }));
            // eslint-disable-next-line no-await-in-loop
            await waitFor(() => expect(saved[`website:timer${minutes}.com`]).toMatchObject({
                blockedUntil: NOW + minutes * MINUTE,
            }));
        }
        const toggle = screen.getByRole('switch', { name: /timer15.com/ });
        await user.click(toggle);
        await waitFor(() => expect(persisted['website:timer15.com']).toMatchObject({
            enabled: false, blockedUntil: NOW + 15 * MINUTE,
        }));
        await user.selectOptions(selector, 'indefinitely');
        await user.type(website, 'forever.com');
        await user.click(screen.getByRole('button', { name: catalog.addWebsite.message }));
        await waitFor(() => expect(persisted['website:forever.com']).toBeDefined());
        expect(persisted['website:forever.com']).not.toHaveProperty('blockedUntil');
    });

    it.each(LOCALES)('shows translated duration validation and allows correcting it in %s', async (locale) => {
        const catalog = openList(locale);
        await ready();
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'custom' } });
        const minutes = screen.getByRole('spinbutton') as HTMLInputElement;
        const website = screen.getByRole('textbox', { name: catalog.websiteInputPlaceholder.message });
        const button = screen.getByRole('button', { name: catalog.addWebsite.message });
        fireEvent.change(website, { target: { value: 'timed.com' } });
        // Each invalid draft replaces the previous one in the same mounted form.
        // eslint-disable-next-line no-restricted-syntax
        for (const value of ['', '0', '-1', '1.5', '999999999999999']) {
            fireEvent.change(minutes, { target: { value } });
            expect(minutes.checkValidity()).toBe(value === '999999999999999');
            // Exercise application validation through a submit event, even when native constraints reject it.
            fireEvent.submit(button.closest('form')!);
            // eslint-disable-next-line no-await-in-loop
            await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(
                value === '999999999999999'
                    ? catalog.blockDurationTooLong.message : catalog.invalidBlockDuration.message,
            ));
            expect((website as HTMLInputElement).value).toBe('timed.com');
            expect(Storage.set).not.toHaveBeenCalled();
        }
        fireEvent.change(minutes, { target: { value: '2' } });
        fireEvent.click(button);
        await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
        expect(persisted['website:timed.com']).toMatchObject({ blockedUntil: NOW + 2 * MINUTE });
        expect(diagnostics).not.toHaveBeenCalled();
    });

    it.each(['ru', 'de', 'ar'])('shows loading and storage errors in %s', async (locale) => {
        let rejectLoad: (error: Error) => void;
        vi.mocked(Storage.getAll).mockImplementationOnce(() => new Promise((_resolve, reject) => {
            rejectLoad = reject;
        }));
        const catalog = openList(locale);
        expect(screen.getByRole('status').textContent).toBe(catalog.loadingWebsites.message);
        expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(true);
        rejectLoad!(new Error('Storage unavailable'));
        expect((await screen.findByRole('alert')).textContent).toBe(catalog.loadError.message);
        expect(screen.queryByRole('status')).toBeNull();
        vi.mocked(Storage.set).mockRejectedValueOnce(new Error('Quota exceeded'));
        fireEvent.change(screen.getByRole('textbox', { name: catalog.websiteInputPlaceholder.message }), {
            target: { value: 'timed.com' },
        });
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '15' } });
        fireEvent.click(screen.getByRole('button', { name: catalog.addWebsite.message }));
        await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(catalog.saveError.message));
        expect(persisted['website:timed.com']).toBeUndefined();
    });
});
