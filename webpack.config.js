const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./examples/benchmark.ts",
  output: {
    filename: "benchmark_bundle.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: path.resolve(__dirname, "tsconfig.json"),
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  devServer: {
    open: true,
  },
  devtool: "source-map",
  plugins: [new HtmlWebpackPlugin()],
  performance: { hints: false },
  resolve: {
    extensions: [".js", ".ts", ".json"],
  },
  target: "web",
};
