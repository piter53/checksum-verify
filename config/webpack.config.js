'use strict';

const {merge} = require('webpack-merge');
const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');

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
            new HtmlWebpackPlugin({
                template: "src/popup.html"
            })
        ],
        devtool: argv.mode === 'production' ? false : 'source-map',
    });

module.exports = config;
