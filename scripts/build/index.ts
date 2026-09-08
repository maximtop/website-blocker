/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
import { program } from 'commander';

import { bundleRunner } from './bundle-runner';
import { Browser, BROWSERS } from './constants';
import { getWebpackConfig } from './webpack-config';
import { validateCatalogs } from '../i18n/catalogs';

type CommanderOptions = {
    watch: boolean,
    cache: boolean,
};

const bundleBrowser = (browser: Browser, options: CommanderOptions) => {
    validateCatalogs();
    const webpackConfig = getWebpackConfig(browser, options.watch);
    return bundleRunner(webpackConfig, { watch: options.watch, cache: options.cache });
};

const runBuild = async (
    browsers: readonly Browser[],
    options: CommanderOptions,
) => {
    for (const browser of browsers) {
        await bundleBrowser(browser, options);
    }
};

const main = async (browsers: readonly Browser[], options: CommanderOptions) => {
    try {
        await runBuild(browsers, options);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

program
    .option('--watch', 'Builds in watch mode', false)
    .option(
        '--no-cache',
        'Builds without cache. Is useful when watch mode rebuild on the changes from the linked dependencies',
        true,
    );

BROWSERS.forEach((browser) => {
    program
        .command(browser)
        .description(`Builds extension for ${browser} browser`)
        .action(async () => {
            await main([browser], program.opts<CommanderOptions>());
        });
});

program
    .description('By default builds for all platforms')
    .action(async () => {
        await main(BROWSERS, program.opts<CommanderOptions>());
    });

program.parse(process.argv);
