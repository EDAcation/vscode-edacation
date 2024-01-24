'use strict';

import path from 'path';
import {fileURLToPath} from 'url';
import webpack from 'webpack';

// @ts-check

/** @typedef {import('webpack').Configuration} WebpackConfig **/

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

/** @type WebpackConfig */
const webExtensionConfig = {
    mode: 'none',
    target: 'webworker',
    entry: {
        extension: './src/extension/index.ts',
        'test/suite/index': './src/extension/test/suite/index.ts'
    },
    output: {
        filename: '[name].js',
        path: path.join(currentDirectory, './dist/extension'),
        libraryTarget: 'commonjs',
        devtoolModuleFilenameTemplate: '../../[resource-path]'
    },
    resolve: {
        mainFields: ['browser', 'module', 'main'],
        extensions: ['.ts', '.js'],
        extensionAlias: {
            '.js': ['.ts', '.js']
        },
        alias: {},
        fallback: {
            assert: 'assert',
            path: 'path-browserify'
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            }
        ]
    },
    plugins: [
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser'
        })
    ],
    externals: {
        vscode: 'commonjs vscode', // ignored because it doesn't exist
        child_process: 'child_process',
        worker_threads: 'worker_threads'
    },
    performance: {
        hints: false
    },
    devtool: 'nosources-source-map',
    infrastructureLogging: {
        level: 'log'
    }
};

/** @type WebpackConfig */
const workerConfig = {
    mode: 'none',
    target: 'webworker',
    entry: {
        yosys: {
            import: './src/workers/yosys.ts',
            baseUri: 'blob:vscode-file://vscode-app/bogus'
        },
        'nextpnr-ecp5': {
            import: './src/workers/nextpnr-ecp5.ts',
            baseUri: 'blob:vscode-file://vscode-app/bogus'
        },
        'nextpnr-ice40': {
            import: './src/workers/nextpnr-ice40.ts',
            baseUri: 'blob:vscode-file://vscode-app/bogus'
        }
    },
    output: {
        filename: '[name].js',
        path: path.join(currentDirectory, 'dist', 'workers'),
        library: {
            name: 'exportVar',
            type: 'var'
        }
    },
    resolve: {
        mainFields: ['browser', 'module', 'main'],
        extensions: ['.ts', '.js'],
        extensionAlias: {
            '.js': ['.ts', '.js']
        },
        alias: {
            fs: false,
            child_process: false
        },
        fallback: {
            crypto: false,
            path: 'path-browserify'
        }
    },
    plugins: [
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1
        })
    ],
    module: {
        parser: {
            javascript: {
                dynamicImportMode: 'eager'
            }
        },
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            },
            {
                test: /\.wasm$/,
                type: 'asset/inline'
            },
            {
                test: /\.(bin|json|v)$/,
                type: 'asset/inline',
                generator: {
                    dataUrl: {
                        mimetype: 'text/plain'
                    }
                }
            }
        ]
    },
    externals: {
        vscode: 'commonjs vscode' // ignored because it doesn't exist
    },
    performance: {
        hints: false
    },
    devtool: 'nosources-source-map',
    infrastructureLogging: {
        level: 'log'
    },
    optimization: {
        minimize: false
    }
};

export default [webExtensionConfig, workerConfig];
