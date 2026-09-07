import { GECKO_ID } from '../deploy/constants';
import { Browser, FIREFOX_STRICT_MIN_VERSION } from './constants';

/**
 * Stamps the release version and adapts the shared manifest to a browser's MV3 background.
 */
export const updateManifest = (content: Buffer | string, browser: Browser, version: string): string => {
    const manifest = JSON.parse(content.toString());
    manifest.version = version;

    if (browser === Browser.Firefox) {
        // Firefox MV3 uses an event page; the webpack bundle is a self-contained classic script.
        manifest.background = { scripts: ['background.js'] };
        manifest.browser_specific_settings = {
            gecko: {
                id: GECKO_ID,
                strict_min_version: FIREFOX_STRICT_MIN_VERSION,
                data_collection_permissions: { required: ['none'] },
            },
        };
        // Firefox maps unsupported "split" mode to "not_allowed"; use its default spanning mode.
        delete manifest.incognito;
        delete manifest.minimum_chrome_version;
    }

    return JSON.stringify(manifest, null, 2);
};
