import { Browser } from './constants';
import { getBrowserConf } from './helpers';
import { genCommonConfig } from './webpack.common';

export const getWebpackConfig = (browser: Browser, isWatchMode: boolean) => {
    switch (browser) {
        case Browser.Chrome:
        case Browser.Edge:
        case Browser.Firefox: {
            return genCommonConfig(getBrowserConf(browser), isWatchMode);
        }
        default: {
            throw new Error(`Unknown browser: "${browser}"`);
        }
    }
};
