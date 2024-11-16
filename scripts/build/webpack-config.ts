import { Browser } from './constants';
import { genCommonConfig } from './webpack.common';
import { getBrowserConf } from './helpers';

export const getWebpackConfig = (browser: Browser, isWatchMode: boolean) => {
    switch (browser) {
        case Browser.Chrome: {
            return genCommonConfig(getBrowserConf(browser), isWatchMode);
        }
        default: {
            throw new Error(`Unknown browser: "${browser}"`);
        }
    }
};
