'use strict';

import path from 'path';
import {fileURLToPath} from 'url';
import {VueLoaderPlugin} from 'vue-loader';
import webpack from 'webpack';

// @ts-check

/** @typedef {import('webpack').Configuration} WebpackConfig **/

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

/** @type WebpackConfig */
const extensionConfig = {
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
        vscode: 'commonjs vscode' // ignored because it doesn't exist
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
    // context: path.join(currentDirectory, 'workers'),
    mode: 'none',
    target: 'webworker',
    entry: {
        yosys: './src/workers/yosys.ts',
        'nextpnr-ecp5': './src/workers/nextpnr-ecp5.ts',
        'nextpnr-ice40': './src/workers/nextpnr-ice40.ts'
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
            },
            {
                test: /\.wasm$/,
                type: 'asset/inline'
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

/** @type WebpackConfig */
const viewsConfig = {
    mode: 'none',
    target: 'webworker',
    entry: {
        actions: './src/views/actions/src/main.ts',
        project: './src/views/project/src/main.ts'
    },
    output: {
        filename: '[name].js',
        path: path.join(currentDirectory, 'dist', 'views'),
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
            path: 'path-browserify',
            os: 'os-browserify'
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            appendTsSuffixTo: [/\.vue$/],
                            compilerOptions: {
                                noEmit: false
                            }
                        }
                    }
                ]
            },
            {
                test: /\.vue$/,
                loader: 'vue-loader',
                options: {
                    compilerOptions: {
                        isCustomElement: (tag) => tag.startsWith('vscode-')
                    }
                }
            }
        ]
    },
    plugins: [
        new VueLoaderPlugin(),
        new webpack.ProvidePlugin({
            process: 'process/browser'
        })
    ],
    externals: {
        vscode: 'commonjs vscode' // ignored because it doesn't exist
    },
    performance: {
        hints: false
    },
    devtool: 'nosources-source-map',
    infrastructureLogging: {
        level: 'log'
    }
};

export default [extensionConfig, workerConfig, viewsConfig];
