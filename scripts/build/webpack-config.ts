/**
 * @file Webpack configuration of a target browser.
 */

import { Browser } from './constants';
import { getBrowserConf } from './helpers';
import { genCommonConfig } from './webpack.common';

/**
 * Returns the webpack configuration of a browser build.
 *
 * @param browser - Target browser.
 * @param isWatchMode - Whether webpack runs in watch mode.
 *
 * @returns Webpack configuration.
 *
 * @throws If the browser is unknown.
 */
export const getWebpackConfig = (browser: Browser, isWatchMode: boolean) => {
    switch (browser) {
        case Browser.Chrome:
        case Browser.Edge:
        case Browser.Firefox: {
            return genCommonConfig(getBrowserConf(browser), isWatchMode);
        }
        default: {
            throw new Error(`Unknown browser: "${String(browser)}"`);
        }
    }
};
