/**
 * @file Command-line entry point of the extension build.
 */

import { program } from 'commander';

import { validateCatalogs } from '../i18n/catalogs';

import { bundleRunner } from './bundle-runner';
import {
    Browser,
    BROWSERS,
    BUILD_ENV,
    BuildTargetEnv,
} from './constants';
import { getWebpackConfig } from './webpack-config';

/**
 * Options parsed from the command line.
 */
interface CommanderOptions {
    /**
     * Whether to keep rebuilding on changes.
     */
    watch: boolean;

    /**
     * Whether watch mode uses the webpack cache.
     */
    cache: boolean;
}

/**
 * Validates the locale catalogs and builds the extension for one browser.
 *
 * @param browser - Target browser.
 * @param options - Command-line options.
 *
 * @returns Resolves after the build.
 */
const bundleBrowser = (browser: Browser, options: CommanderOptions) => {
    validateCatalogs();
    const webpackConfig = getWebpackConfig(browser, options.watch);
    return bundleRunner(webpackConfig, { watch: options.watch, cache: options.cache });
};

/**
 * Builds the extension for each browser in turn.
 *
 * @param browsers - Target browsers.
 * @param options - Command-line options.
 */
const runBuild = async (
    browsers: readonly Browser[],
    options: CommanderOptions,
) => {
    for (const browser of browsers) {
        await bundleBrowser(browser, options);
    }
};

/**
 * Runs the build and exits with code 1 if it fails.
 *
 * @param browsers - Target browsers.
 * @param options - Command-line options.
 */
const main = async (browsers: readonly Browser[], options: CommanderOptions) => {
    try {
        await runBuild(browsers, options);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

program
    .allowExcessArguments(false)
    .option('--watch', 'Builds in watch mode', false)
    .option(
        '--no-cache',
        'Builds without cache. Is useful when watch mode rebuild on the changes from the linked dependencies',
        true,
    );

BROWSERS.forEach((browser) => {
    program
        .command(browser)
        .allowExcessArguments(false)
        .description(`Builds extension for ${browser} browser`)
        .action(async () => {
            await main([browser], program.opts<CommanderOptions>());
        });
});

program
    .description('Defaults to Chrome for development and all browsers for release')
    .action(async () => {
        const browsers = BUILD_ENV === BuildTargetEnv.Dev ? [Browser.Chrome] : BROWSERS;
        await main(browsers, program.opts<CommanderOptions>());
    });

program.parse(process.argv);
