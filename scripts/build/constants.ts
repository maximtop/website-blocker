/**
 * @file Build environments, target browsers and output paths.
 */

import path from 'path';

export enum BuildTargetEnv {
    Dev = 'dev',
    Release = 'release',
}

/**
 * Checks that a BUILD_ENV value names a known build environment.
 *
 * @param buildEnv - Value from the environment.
 *
 * @returns True for a known build environment.
 */
const isValidBuildEnv = (buildEnv: string): buildEnv is BuildTargetEnv => {
    return Object.values(BuildTargetEnv).includes(buildEnv as BuildTargetEnv);
};

const buildEnv = process.env.BUILD_ENV || BuildTargetEnv.Dev;

if (!isValidBuildEnv(buildEnv)) {
    throw new Error(`Invalid BUILD_ENV: ${buildEnv}`);
}

export const BUILD_ENV = buildEnv;

/**
 * Output settings of a build environment.
 */
export interface EnvConfig {
    /**
     * Output directory under the build path.
     */
    outputPath: string;

    /**
     * Webpack mode.
     */
    mode: 'development' | 'production';
}

export const ENV_CONF: Record<BuildTargetEnv, EnvConfig> = {
    [BuildTargetEnv.Dev]: {
        outputPath: 'dev',
        mode: 'development',
    },
    [BuildTargetEnv.Release]: {
        outputPath: 'release',
        mode: 'production',
    },
};

export const enum Browser {
    Chrome = 'chrome',
    Edge = 'edge',
    Firefox = 'firefox',
}

export const BROWSERS = [Browser.Chrome, Browser.Edge, Browser.Firefox] as const;

export const FIREFOX_STRICT_MIN_VERSION = '140.0';

export const BUILD_PATH = path.resolve(__dirname, '../../dist');

/**
 * Build settings of a target browser.
 */
export interface BrowserConfig {
    /**
     * Target browser.
     */
    browser: Browser;

    /**
     * Developer tools flag; the current build does not read it.
     */
    devtools: boolean;

    /**
     * Output directory of the browser build.
     */
    buildDir: string;
}

export const BROWSERS_CONF: Record<Browser, BrowserConfig> = {
    [Browser.Chrome]: {
        browser: Browser.Chrome,
        devtools: true,
        buildDir: Browser.Chrome,
    },
    [Browser.Edge]: {
        browser: Browser.Edge,
        devtools: true,
        buildDir: Browser.Edge,
    },
    [Browser.Firefox]: {
        browser: Browser.Firefox,
        devtools: true,
        buildDir: Browser.Firefox,
    },
};
