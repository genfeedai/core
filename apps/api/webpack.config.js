const path = require('node:path');
const nodeExternals = require('webpack-node-externals');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const rootDir = path.resolve(__dirname, '../..');

module.exports = {
  entry: './src/main.ts',
  target: 'node',
  mode: 'development',
  devtool: 'eval-cheap-module-source-map',

  externals: [
    nodeExternals({
      modulesDir: path.resolve(rootDir, 'node_modules'),
      // Allow bundling of workspace packages (not in npm registry)
      allowlist: [/^@genfeedai\//],
    }),
  ],

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
    clean: true,
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    alias: {
      '@genfeedai/types': path.resolve(rootDir, 'packages/types/dist'),
      '@genfeedai/core': path.resolve(rootDir, 'packages/core/dist'),
    },
    plugins: [
      new TsconfigPathsPlugin({
        configFile: path.resolve(__dirname, 'tsconfig.json'),
      }),
    ],
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            compilerOptions: {
              emitDecoratorMetadata: true,
              experimentalDecorators: true,
            },
          },
        },
      },
    ],
  },
};
