'use strict';

const {merge} = require('webpack-merge');
const webpack = require("webpack");

const common = require('./webpack.common.js');
const PATHS = require('./paths');

// Merge webpack configuration files
const config = (env, argv) =>
    merge(common, {
        entry: {
            popup: PATHS.src + '/popup.js',
            contentScript: PATHS.src + '/contentScript.js',
            background: PATHS.src + '/background.js',
        },
        resolve: {
            fallback: {
            }
        },
        plugins: [
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
                'process.env.MY_ENV': JSON.stringify(process.env.MY_ENV),
                'process.env.NODE_DEBUG': JSON.stringify(process.env.NODE_DEBUG),
            }),
            new webpack.ProvidePlugin({
                process: 'process/browser'
            })
        ],
        devtool: argv.mode === 'production' ? false : 'source-map',
    });

module.exports = config;
