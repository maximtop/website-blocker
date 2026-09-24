/**
 * @file Lookups of browser and environment build settings.
 */

import { BROWSERS_CONF, ENV_CONF } from './constants';

import type {
    Browser,
    BrowserConfig,
    BuildTargetEnv,
    EnvConfig,
} from './constants';

/**
 * Returns the build settings of a browser.
 *
 * @param browser - Target browser.
 *
 * @returns Build settings of the browser.
 *
 * @throws If the browser has no settings.
 */
export const getBrowserConf = (browser: Browser): BrowserConfig => {
    const browserConf = BROWSERS_CONF[browser];
    if (!browserConf) {
        throw new Error(`No browser config for: "${browser}"`);
    }
    return browserConf;
};

/**
 * Returns the output settings of a build environment.
 *
 * @param env - Build environment.
 *
 * @returns Output settings of the environment.
 *
 * @throws If the environment has no settings.
 */
export const getEnvConf = (env: BuildTargetEnv): EnvConfig => {
    const envConfig = ENV_CONF[env];
    if (!envConfig) {
        throw new Error(`No env config for: "${env}"`);
    }
    return envConfig;
};
