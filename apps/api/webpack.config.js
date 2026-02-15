const path = require('node:path');
const nodeExternals = require('webpack-node-externals');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const rootDir = path.resolve(__dirname, '../..');

module.exports = {
  devtool: 'eval-cheap-module-source-map',
  entry: './src/main.ts',

  externals: [
    nodeExternals({
      // Allow bundling of workspace packages (not in npm registry)
      allowlist: [/^@genfeedai\//],
      modulesDir: path.resolve(rootDir, 'node_modules'),
    }),
  ],
  mode: 'development',

  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              emitDecoratorMetadata: true,
              experimentalDecorators: true,
            },
            transpileOnly: true,
          },
        },
      },
    ],
  },

  output: {
    clean: true,
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },

  resolve: {
    alias: {
      '@genfeedai/core': path.resolve(rootDir, 'packages/core/dist'),
      '@genfeedai/types': path.resolve(rootDir, 'packages/types/dist'),
    },
    extensions: ['.ts', '.tsx', '.js', '.json'],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: path.resolve(__dirname, 'tsconfig.json'),
      }),
    ],
  },
  target: 'node',
};
