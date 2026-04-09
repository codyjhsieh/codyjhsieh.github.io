const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = (_, argv) => {
  const isProduction = argv.mode === "production";

  return {
    entry: "./js/bootstrap.js",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "app.js",
      chunkFilename: "[name].[contenthash:8].js",
      publicPath: "/",
    },
    devServer: {
      static: path.resolve(__dirname, "dist"),
      allowedHosts: "all",
      historyApiFallback: true,
    },
    mode: isProduction ? "production" : "development",
    devtool: isProduction ? "source-map" : "eval-cheap-module-source-map",
    plugins: [
      new CleanWebpackPlugin(),
      new CopyWebpackPlugin({
        patterns: [{ from: "assets", to: "assets" }, { from: "CNAME", noErrorOnMissing: true }],
      }),
      new HtmlWebpackPlugin({ template: "index.html", inject: false }),
    ],
    module: {
      rules: [
        {
          test: /\.(glsl|frag|vert)$/,
          type: "asset/source",
          use: ["glslify-loader"],
          exclude: /node_modules/,
        },
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.(woff|woff2|ttf|otf|eot)$/i,
          type: "asset/resource",
        },
      ],
    },
    resolve: {
      extensions: [".js"],
    },
  };
};
