import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import ZipWebpackPlugin from 'zip-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import { Configuration, WebpackPluginInstance } from 'webpack';

import {
    BUILD_PATH,
    BuildTargetEnv,
    BUILD_ENV,
    BrowserConfig,
} from './constants';

import { getEnvConf } from './helpers';

const config = getEnvConf(BUILD_ENV);

const BACKGROUND_PATH = path.resolve(__dirname, '../../src/entrypoints/background');
const OPTIONS_PATH = path.resolve(__dirname, '../../src/entrypoints/options');
const POPUP_PATH = path.resolve(__dirname, '../../src/entrypoints/popup');
const BLOCKED_PATH = path.resolve(__dirname, '../../src/entrypoints/blocked');
const BACKGROUND_OUTPUT = 'background';
const OPTIONS_OUTPUT = 'options';
const POPUP_OUTPUT = 'popup';
const BLOCKED_OUTPUT = 'blocked';

const OUTPUT_PATH = config.outputPath;

const isDev = BUILD_ENV === BuildTargetEnv.Dev;

export const genCommonConfig = (
    browserConfig: BrowserConfig,
    isWatchMode: boolean,
): Configuration => {
    const configuration: Configuration = {
        // Set the mode based on the environment
        mode: isDev ? 'development' : 'production',
        // Adjust optimization settings
        optimization: {
            minimize: false, // Disable code minification to keep code readable
            runtimeChunk: false,
        },
        cache: isDev,
        // Set devtool to false for production to disable source maps
        devtool: isDev ? 'inline-source-map' : false,
        entry: {
            [BACKGROUND_OUTPUT]: {
                import: BACKGROUND_PATH,
            },
            [OPTIONS_OUTPUT]: {
                import: OPTIONS_PATH,
            },
            [POPUP_OUTPUT]: {
                import: POPUP_PATH,
            },
            [BLOCKED_OUTPUT]: {
                import: BLOCKED_PATH,
            },
        },
        output: {
            path: path.join(BUILD_PATH, OUTPUT_PATH, browserConfig.buildDir),
            filename: '[name].js',
        },
        resolve: {
            extensions: ['.*', '.js', '.jsx', '.ts', '.tsx'],
            symlinks: false,
        },
        module: {
            rules: [
                {
                    test: /\.(js|ts)x?$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: 'swc-loader',
                        },
                    ],
                },
                {
                    test: /\.(css|pcss)$/,
                    use: [
                        'style-loader',
                        {
                            loader: 'css-loader',
                            options: {
                                importLoaders: 1,
                                url: false,
                            },
                        },
                        'postcss-loader',
                    ],
                },
            ],
        },
        plugins: [
            new CleanWebpackPlugin({}),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: path.resolve(__dirname, '../../src/assets'),
                        to: 'assets',
                    },
                    {
                        from: path.resolve(__dirname, '../../src/manifest.json'),
                        to: 'manifest.json',
                    },
                ],
            }),
            new HtmlWebpackPlugin({
                template: path.join(OPTIONS_PATH, 'index.html'),
                filename: `${OPTIONS_OUTPUT}.html`,
                chunks: [OPTIONS_OUTPUT],
                scriptLoading: 'blocking',
                cache: false,
            }),
            new HtmlWebpackPlugin({
                template: path.join(BLOCKED_PATH, 'index.html'),
                filename: `${BLOCKED_OUTPUT}.html`,
                chunks: [BLOCKED_OUTPUT],
                scriptLoading: 'blocking',
                cache: false,
            }),
            new HtmlWebpackPlugin({
                template: path.join(POPUP_PATH, 'index.html'),
                filename: `${POPUP_OUTPUT}.html`,
                chunks: [POPUP_OUTPUT],
                scriptLoading: 'blocking',
                cache: false,
            }) as WebpackPluginInstance, // Ensure type compatibility
        ],
    };

    if (!isWatchMode && configuration.plugins) {
        configuration.plugins.push(new ZipWebpackPlugin({
            path: '../',
            filename: `${browserConfig.browser}.zip`,
        }) as unknown as WebpackPluginInstance);
    }

    return configuration;
};
