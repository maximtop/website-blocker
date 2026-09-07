import { describe, expect, it } from 'vitest';
import sourceManifest from '../../src/manifest.json';
import { Browser, BROWSERS } from '../../scripts/build/constants';
import { updateManifest } from '../../scripts/build/manifest';
import { GECKO_ID, STORE_TARGETS } from '../../scripts/deploy/constants';

const version = '3.2.1';
const manifestFor = (browser: Browser) => {
    return JSON.parse(updateManifest(JSON.stringify(sourceManifest), browser, version));
};

describe('browser manifests', () => {
    it('builds the same browser targets that the store deployment protocol accepts', () => {
        expect(BROWSERS).toEqual(STORE_TARGETS);
    });

    it.each([Browser.Chrome, Browser.Edge])('preserves the shared Chromium manifest for %s', (browser) => {
        const manifest = manifestFor(browser);
        expect(manifest).toEqual({ ...sourceManifest, version });
        expect(manifest.background).toEqual({ service_worker: 'background.js', type: 'module' });
        expect(manifest.background).not.toHaveProperty('scripts');
        expect(manifest).not.toHaveProperty('browser_specific_settings');
    });

    it('provides a Firefox event page, stable sync identity, and supported private-window mode', () => {
        const manifest = manifestFor(Browser.Firefox);
        expect(manifest.background).toEqual({ scripts: ['background.js'] });
        expect(manifest.background).not.toHaveProperty('service_worker');
        expect(GECKO_ID).not.toBe('');
        expect(manifest.browser_specific_settings.gecko).toEqual({
            id: GECKO_ID,
            strict_min_version: '128.0',
            data_collection_permissions: { required: ['none'] },
        });
        expect(manifest).not.toHaveProperty('minimum_chrome_version');
        expect(manifest).not.toHaveProperty('incognito');
    });

    it.each(BROWSERS)('retains the blocking UI and permissions for %s', (browser) => {
        const manifest = manifestFor(browser);
        expect(manifest.manifest_version).toBe(3);
        expect(manifest.version).toBe(version);
        expect(manifest.permissions).toEqual(sourceManifest.permissions);
        expect(manifest.permissions).toEqual(expect.arrayContaining(['webNavigation', 'storage']));
        expect(manifest.action.default_popup).toBe('popup.html');
        expect(manifest.options_page).toBe('options.html');
        expect(manifest.web_accessible_resources).toEqual([
            { resources: ['blocked.html'], matches: ['<all_urls>'] },
        ]);
        expect(manifest).not.toHaveProperty('host_permissions');
    });
});
