// @vitest-environment node

import { describe, expect, it } from 'vitest';
import sourceManifest from '../../src/manifest.json';
import { Browser } from '../../scripts/build/constants';
import { transformManifest } from '../../scripts/build/manifest';
import { GECKO_ID } from '../../scripts/deploy/constants';

const source = Buffer.from(JSON.stringify(sourceManifest));
const build = (browser: Browser) => JSON.parse(transformManifest(source, browser, '2.3.4'));

describe('browser manifests', () => {
    it('keeps the Chrome service worker, split mode, and shared metadata', () => {
        expect(build(Browser.Chrome)).toEqual({ ...sourceManifest, version: '2.3.4' });
    });

    it('produces a Firefox MV3 event page with a stable identity and data declaration', () => {
        const manifest = build(Browser.Firefox);
        expect(manifest.manifest_version).toBe(3);
        expect(manifest.version).toBe('2.3.4');
        expect(manifest.background).toEqual({ scripts: ['background.js'] });
        expect(manifest).not.toHaveProperty('incognito');
        expect(manifest.browser_specific_settings).toEqual({
            gecko: {
                id: GECKO_ID,
                strict_min_version: '140.0',
                data_collection_permissions: { required: ['none'] },
            },
        });
        expect(GECKO_ID).toBe('website-blocker@maximtop.dev');
        expect(manifest.permissions).toEqual(sourceManifest.permissions);
        expect(manifest.action).toEqual(sourceManifest.action);
        expect(manifest.options_page).toBe(sourceManifest.options_page);
        expect(manifest.web_accessible_resources).toEqual(sourceManifest.web_accessible_resources);
    });

    it('preserves the source manifest across consecutive browser builds', () => {
        build(Browser.Firefox);
        expect(build(Browser.Chrome)).toEqual({ ...sourceManifest, version: '2.3.4' });
        expect(JSON.parse(source.toString())).toEqual(sourceManifest);
    });
});
