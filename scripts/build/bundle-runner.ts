/**
 * @file Runs a webpack compilation once or in watch mode.
 */

import webpack from 'webpack';
import { merge } from 'webpack-merge';

import type { Stats } from 'webpack';

/**
 * Compilation options chosen on the command line.
 */
interface Options {
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
 * Callback that receives the result of one compilation.
 */
type RunCallback<T> = (err: Error | null, stats: T | undefined) => void;

/**
 * Compiles the extension and prints the webpack report.
 *
 * @param webpackConfig - Configuration of the compilation.
 * @param options - Watch and cache settings.
 *
 * @returns Resolves after a successful compilation, or on the first watch build.
 */
export const bundleRunner = (webpackConfig: webpack.Configuration, options: Options): Promise<void> => {
    const { watch, cache } = options;

    // Without cache, building watches linked dependencies, but building takes 5-7 seconds.
    // With cache, building happens almost instantly, but changes from linked dependencies are not applied.
    if (watch) {
        // eslint-disable-next-line no-param-reassign
        webpackConfig = merge(webpackConfig, { cache });
    }

    const compiler = webpack(webpackConfig);

    const run = watch
        ? (cb: RunCallback<Stats>) => compiler.watch({
            followSymlinks: true,
            aggregateTimeout: 300,
            ignored: [
                'build',
            ],
        }, cb)
        : (cb: RunCallback<Stats>) => compiler.run(cb);

    return new Promise((resolve, reject) => {
        run((err, stats) => {
            if (err) {
                console.error(err.stack || err);
                if ('details' in err && err.details) {
                    console.error(err.details);
                }
                reject(new Error('Webpack compilation failed'));
                return;
            }
            if (stats) {
                if (stats.hasErrors()) {
                    console.log(stats.toString({
                        colors: true,
                        all: false,
                        errors: true,
                        moduleTrace: true,
                        logging: 'error',
                    }));
                    reject(new Error('Webpack compilation has errors'));
                    return;
                }

                console.log(stats.toString({
                    chunks: false, // Makes the build much quieter
                    colors: true, // Shows colors in the console
                }));
            }

            resolve();
        });
    });
};
