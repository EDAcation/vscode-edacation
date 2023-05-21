//@ts-check
'use strict';

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

const path = require('path');
const webpack = require('webpack');

/** @type WebpackConfig */
const webExtensionConfig = {
    mode: 'none',
    target: 'webworker',
    entry: {
        'extension': './src/web/extension.ts',
        /* eslint-disable-next-line @typescript-eslint/naming-convention */
        'test/suite/index': './src/web/test/suite/index.ts'
    },
    output: {
        filename: '[name].js',
        path: path.join(__dirname, './dist/web'),
        libraryTarget: 'commonjs',
        devtoolModuleFilenameTemplate: '../../[resource-path]'
    },
    resolve: {
        mainFields: ['browser', 'module', 'main'],
        extensions: ['.ts', '.js'],
        alias: {},
        fallback: {
            assert: require.resolve('assert'),
            path: require.resolve('path-browserify')
        }
    },
    module: {
        rules: [{
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [{
                loader: 'ts-loader'
            }]
        }]
    },
    plugins: [
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
    ],
    externals: {
        'vscode': 'commonjs vscode', // ignored because it doesn't exist
    },
    performance: {
        hints: false
    },
    devtool: 'nosources-source-map',
    infrastructureLogging: {
        level: "log",
    },
};

/** @type WebpackConfig */
const workerConfig = {
    context: path.join(__dirname, 'workers'),
    mode: 'none',
    target: 'webworker',
    entry: {
        'yosys': './src/yosys.ts',
        /* eslint-disable @typescript-eslint/naming-convention */
        'nextpnr-ecp5': './src/nextpnr-ecp5.ts',
        'nextpnr-ice40': './src/nextpnr-ice40.ts',
        /* eslint-enable @typescript-eslint/naming-convention */
    },
    output: {
        filename: '[name].js',
        path: path.join(__dirname, 'workers', 'dist'),
        library: {
            name: 'exportVar',
            type: 'var'
        }
    },
    resolve: {
        mainFields: ['browser', 'module', 'main'],
        extensions: ['.ts', '.js'],
        alias: {
            fs: false,
            /* eslint-disable-next-line @typescript-eslint/naming-convention */
            child_process: false
        },
        fallback: {
            crypto: false,
            path: require.resolve('path-browserify')
        }
    },
    module: {
        rules: [{
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [{
                loader: 'ts-loader'
            }]
        }, {
            test: /\.wasm$/,
            type: 'asset/inline'
        }]
    },
    externals: {
        'vscode': 'commonjs vscode', // ignored because it doesn't exist
    },
    performance: {
        hints: false
    },
    devtool: 'nosources-source-map',
    infrastructureLogging: {
        level: "log",
    },
    optimization: {
        minimize: false
    },
};

module.exports = [webExtensionConfig, workerConfig];
