import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'replicate.delivery',
      },
      {
        protocol: 'https',
        hostname: 'pbxt.replicate.delivery',
      },
    ],
  },
  turbopack: {},
  webpack: (config) => {
    // Configure sass-loader to use modern compiler and handle CSS imports
    const rules = config.module.rules;
    const scssRule = rules.find(
      (rule: unknown) =>
        rule &&
        typeof rule === 'object' &&
        rule !== null &&
        'test' in rule &&
        rule.test &&
        typeof rule.test === 'object' &&
        'toString' in rule.test &&
        rule.test.toString().includes('scss')
    );

    if (
      scssRule &&
      typeof scssRule === 'object' &&
      scssRule !== null &&
      'oneOf' in scssRule &&
      Array.isArray(scssRule.oneOf)
    ) {
      scssRule.oneOf.forEach((oneOf: unknown) => {
        if (
          oneOf &&
          typeof oneOf === 'object' &&
          oneOf !== null &&
          'use' in oneOf &&
          Array.isArray(oneOf.use)
        ) {
          oneOf.use.forEach((loader: unknown) => {
            if (
              loader &&
              typeof loader === 'object' &&
              loader !== null &&
              'loader' in loader &&
              typeof loader.loader === 'string' &&
              loader.loader.includes('sass-loader')
            ) {
              const loaderWithOptions = loader as {
                options?: {
                  api?: string;
                  sassOptions?: Record<string, unknown>;
                };
              };
              loaderWithOptions.options = {
                ...loaderWithOptions.options,
                api: 'modern-compiler',
                sassOptions: {
                  ...loaderWithOptions.options?.sassOptions,
                  includePaths: [path.join(__dirname, 'node_modules')],
                  silenceDeprecations: ['legacy-js-api'],
                },
              };
            }
          });
        }
      });
    }

    // Resolve CSS packages properly for SASS imports
    // Redirect workflow-ui store imports to app stores so they share the same
    // Zustand instances (workflow-ui stubs vs app's real API-backed stores).
    const wuiStores = path.resolve(__dirname, '../../packages/workflow-ui/src/stores');
    const appStores = path.resolve(__dirname, 'src/store');
    config.resolve.alias = {
      ...config.resolve.alias,
      // Resolve workspace packages (Bun workspace linking bypasses node_modules)
      '@genfeedai/types/replicate/schemas.json': path.resolve(
        __dirname,
        '../../packages/types/src/replicate/schemas.json'
      ),
      '@genfeedai/types': path.resolve(__dirname, '../../packages/types/dist'),
      '@genfeedai/core': path.resolve(__dirname, '../../packages/core/dist'),
      // Map tw-animate-css to its CSS file directly (bypasses style export condition)
      'tw-animate-css': path.join(__dirname, 'node_modules/tw-animate-css/dist/tw-animate.css'),
      // Unify workflow-ui stores with app stores (single Zustand instance)
      [path.join(wuiStores, 'workflowStore')]: path.join(appStores, 'workflowStore'),
      [path.join(wuiStores, 'executionStore')]: path.join(appStores, 'executionStore'),
      [path.join(wuiStores, 'settingsStore')]: path.join(appStores, 'settingsStore'),
      [path.join(wuiStores, 'promptLibraryStore')]: path.join(appStores, 'promptLibraryStore'),
    };

    // Add resolve extensions for CSS imports
    config.resolve.extensions = [...(config.resolve.extensions || []), '.css'];

    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: 'genfeedai',
  project: 'core-web',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
});
