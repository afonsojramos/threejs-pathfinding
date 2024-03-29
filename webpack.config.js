/* Configure HTMLWebpack plugin */
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HTMLWebpackPluginConfig = new HtmlWebpackPlugin({
    template: __dirname + '/src/index.html',
    filename: 'index.html',
    inject: 'body'
})

/* Configure BrowserSync */
const BrowserSyncPlugin = require('browser-sync-webpack-plugin')
const BrowserSyncPluginConfig = new BrowserSyncPlugin({
    host: 'localhost',
    port: 8080,
    proxy: 'http://localhost:8080/'
}, config = {
    reload: false,
    files: "resources/Soldier.glb"
})

/* Configure ProgressBar */
const ProgressBarPlugin = require('progress-bar-webpack-plugin')
const ProgressBarPluginConfig = new ProgressBarPlugin()

/* Configure Express */
const express = require('express')

/* Export configuration */
module.exports = {
    mode: 'development',
    devtool: 'source-map',
    devServer: {
        after: function(app, server, compiler) {
            app.use('/assets', express.static('/resources'))
        }
    },
    entry: [
        './src/index.ts'
    ],
    output: {
        path: __dirname + '/dist',
        filename: 'index.js',
        //publicPath: "/resources/"
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'awesome-typescript-loader'
            }, {
                test: /\.css$/,
                exclude: /[\/\\]src[\/\\]/,
                use: [
                    {
                        loader: 'style-loader',
                        options: {
                            sourceMap: true
                        }
                    },
                    {loader: 'css-loader'}
                ]
            }, {
                test: /\.css$/,
                exclude: /[\/\\](node_modules|bower_components|public)[\/\\]/,
                use: [
                    {
                        loader: 'style-loader',
                        options: {
                            sourceMap: true
                        }
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            modules: true,
                            importLoaders: 1,
                            localIdentName: '[path]___[name]__[local]___[hash:base64:5]'
                        }
                    }
                ]
            }
        ]
    },
    resolve: { extensions: [".web.ts", ".web.js", ".ts", ".js"] },
    plugins: [HTMLWebpackPluginConfig, BrowserSyncPluginConfig, ProgressBarPluginConfig],
}