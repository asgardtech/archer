const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const packageJson = require("./package.json");

module.exports = {
  entry: "./src/index.ts",
  output: {
    filename: "bundle.[contenthash].js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: "asset/resource",
      },
      {
        test: /\.(woff2?|ttf|eot)$/i,
        type: "asset/resource",
        generator: {
          filename: "fonts/[name][ext]",
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __APP_VERSION__: JSON.stringify(packageJson.version),
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
      title: "Raptor Skies",
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "public/assets", to: "assets", noErrorOnMissing: false },
        { from: "public/fonts", to: "fonts", noErrorOnMissing: false },
      ],
    }),
  ],
  devServer: {
    static: "./public",
    hot: true,
    port: 3000,
    open: false,
  },
};
