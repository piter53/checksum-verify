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
            options: PATHS.src + '/options.js',
            contentScript: PATHS.src + '/contentScript.js',
            background: PATHS.src + '/background.js',
        },
        resolve: {
            fallback: {
            }
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: "src/options.html",
                filename: "options.html"
            }),
            new HtmlWebpackPlugin({
                template: "src/popup.html",
                filename: "popup.html"
            }),
            new HtmlWebpackPlugin({
                template: "src/hashes.html",
                filename: "hashes.html"
            }),
            new HtmlWebpackPlugin({
                template: "src/test-page.html",
                filename: "test-page.html"
            }),
            new HtmlWebpackPlugin({
                template: "src/welcome-page.html",
                filename: "welcome-page.html"
            })



        ],
        devtool: argv.mode === 'production' ? false : 'source-map',
    });

module.exports = config;
