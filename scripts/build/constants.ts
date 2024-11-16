import path from 'path';

export enum BuildTargetEnv {
    Dev = 'dev',
    Release = 'release',
}

const isValidBuildEnv = (buildEnv: any): buildEnv is BuildTargetEnv => {
    return Object.values(BuildTargetEnv).includes(buildEnv as BuildTargetEnv);
};

export const BUILD_ENV = process.env.BUILD_ENV as BuildTargetEnv || BuildTargetEnv.Dev;

if (!isValidBuildEnv(BUILD_ENV)) {
    throw new Error(`Invalid BUILD_ENV: ${BUILD_ENV}`);
}

export type EnvConfig = {
    outputPath: string;
    mode: 'development' | 'production';
};

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
}

export const BUILD_PATH = path.resolve(__dirname, '../../dist');

export type BrowserConfig = {
    browser: Browser;
    devtools: boolean;
    buildDir: string;
};

export const BROWSERS_CONF: Record<Browser, BrowserConfig> = {
    [Browser.Chrome]: {
        browser: Browser.Chrome,
        devtools: true,
        buildDir: Browser.Chrome,
    },
};
