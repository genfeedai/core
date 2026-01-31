import { withSentryConfig } from '@sentry/nextjs';
import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
    config.resolve.alias = {
      ...config.resolve.alias,
      // Map tw-animate-css to its CSS file directly (bypasses style export condition)
      'tw-animate-css': path.join(__dirname, 'node_modules/tw-animate-css/dist/tw-animate.css'),
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
  disableLogger: true,
});
