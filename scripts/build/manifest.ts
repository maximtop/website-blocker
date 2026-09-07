import { GECKO_ID } from '../deploy/constants';
import { Browser } from './constants';

/** Adapt the shared manifest to the browser while keeping the package version authoritative. */
export const transformManifest = (content: Buffer, browser: Browser, version: string): string => {
    const manifest = JSON.parse(content.toString());
    manifest.version = version;

    if (browser === Browser.Firefox) {
        manifest.background = { scripts: [manifest.background.service_worker] };
        delete manifest.incognito;
        manifest.browser_specific_settings = {
            gecko: {
                id: GECKO_ID,
                strict_min_version: '140.0',
                data_collection_permissions: { required: ['none'] },
            },
        };
    }

    return JSON.stringify(manifest, null, 2);
};
