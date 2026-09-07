/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
import { program } from 'commander';

import { bundleRunner } from './bundle-runner';
import { Browser, BUILD_ENV, BuildTargetEnv } from './constants';
import { getWebpackConfig } from './webpack-config';

type CommanderOptions = {
    [key: string]: any,
};

const bundleChrome = (options: CommanderOptions) => {
    const webpackConfig = getWebpackConfig(Browser.Chrome, options.watch);
    return bundleRunner(webpackConfig, { watch: options.watch, cache: options.cache });
};

const bundleFirefox = (options: CommanderOptions) => {
    const webpackConfig = getWebpackConfig(Browser.Firefox, options.watch);
    return bundleRunner(webpackConfig, { watch: options.watch, cache: options.cache });
};

const devPlan = [
    bundleChrome,
    bundleFirefox,
];

const releasePlan = [
    bundleChrome,
    bundleFirefox,
];

const runBuild = async (
    tasks: ((options: CommanderOptions) => Promise<unknown>)[],
    options: CommanderOptions,
) => {
    for (const task of tasks) {
        await task(options);
    }
};

const mainBuild = async (options: CommanderOptions) => {
    switch (BUILD_ENV) {
        case BuildTargetEnv.Dev: {
            await runBuild(devPlan, options);
            break;
        }
        case BuildTargetEnv.Release: {
            await runBuild(releasePlan, options);
            break;
        }
        default:
            throw new Error('Provide BUILD_ENV to choose correct build plan');
    }
};

const runBuildCommand = async (
    build: (options: CommanderOptions) => Promise<unknown>,
    options: CommanderOptions,
) => {
    try {
        await build(options);
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

program
    .command(Browser.Chrome)
    .description('Builds extension for chrome browser')
    .action(async () => {
        await runBuildCommand(bundleChrome, program.opts());
    });

program
    .command(Browser.Firefox)
    .description('Builds extension for Firefox browser')
    .action(async () => {
        await runBuildCommand(bundleFirefox, program.opts());
    });

program
    .description('By default builds for all platforms')
    .action(async () => {
        await runBuildCommand(mainBuild, program.opts());
    });

program.parse(process.argv);
