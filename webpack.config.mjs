'use strict';

import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'path';
import {fileURLToPath} from 'url';
import {VueLoaderPlugin} from 'vue-loader';
import webpack from 'webpack';

// @ts-check

/** @typedef {import('webpack').Configuration} WebpackConfig **/

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

/** @type WebpackConfig */
const baseConfig = {
    mode: 'none',
    target: 'webworker',
    entry: {},

    externals: {
        vscode: 'commonjs vscode'
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
const extensionConfig = Object.assign({}, baseConfig, {
    entry: {
        extension: './src/extension/index.ts'
    },
    output: {
        filename: '[name].js',
        path: path.join(currentDirectory, 'dist', 'extension'),
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
            path: 'path-browserify-win32',
            process: 'process/browser'
        }
    },
    externals: {
        vscode: 'commonjs vscode',
        fs: 'fs',
        'fs/promises': 'fs/promises'
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
            process: [path.join(currentDirectory, 'src/common/node-modules.js'), 'csProcess']
        })
    ]
});

/** @type WebpackConfig */
const workerConfig = Object.assign({}, baseConfig, {
    entry: {
        tool: './src/workers/tool.ts'
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
            path: 'path-browserify-win32'
        }
    },
    plugins: [
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1
        })
    ],
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
    optimization: {
        minimize: false
    }
});

/** @type WebpackConfig */
const viewsConfig = Object.assign({}, baseConfig, {
    entry: {
        actions: './src/views/actions/main.ts',
        nextpnr: './src/views/nextpnr/main.ts',
        yosys: './src/views/yosys/main.ts',
        project: './src/views/project/main.ts'
    },
    output: {
        filename: '[name]/index.js',
        path: path.join(currentDirectory, 'dist', 'views'),
        library: {
            name: 'exportVar',
            type: 'var'
        }
    },
    externals: {},
    resolve: {
        mainFields: ['browser', 'module', 'main'],
        extensions: ['.ts', '.js'],
        extensionAlias: {
            '.js': ['.ts', '.js']
        },
        alias: {
            fs: false,
            child_process: false,
            tmp: path.join(currentDirectory, 'src/views/yosys/aliases/tmp.ts'),
            topsort: path.join(currentDirectory, 'src/views/yosys/aliases/topsort.ts')
        },
        fallback: {
            crypto: false,
            vscode: false,
            path: 'path-browserify-win32',
            os: 'os-browserify'
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
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
                        // eslint-disable-next-line
                        isCustomElement: (tag) => tag.startsWith('vscode-')
                    }
                }
            },
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, 'css-loader']
            },
            {
                test: /\.ttf$/,
                type: 'asset/resource',
                generator: {
                    filename: './[name][ext]'
                }
            },
            {
                test: /\.m?js$/,
                resolve: {
                  fullySpecified: false
                },
            },
        ]
    },
    plugins: [
        new VueLoaderPlugin(),
        new MiniCssExtractPlugin({
            filename: '[name]/index.css'
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser',
            os: 'os-browserify/browser'
        })
    ]
});

export default [extensionConfig, workerConfig, viewsConfig];
