import { withSentryConfig } from '@sentry/nextjs';
import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 'replicate.delivery',
        protocol: 'https',
      },
      {
        hostname: 'pbxt.replicate.delivery',
        protocol: 'https',
      },
    ],
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
  reactStrictMode: true,
  turbopack: {},
  webpack: (config, { webpack }) => {
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

    // Replace the npm package's workflowStore chunk with the app's store
    // so both the app and workflow-ui share a single Zustand instance.
    const wuiStoresPath = path.join(
      __dirname,
      'node_modules/@genfeedai/workflow-ui/dist/stores.mjs'
    );
    const storesContent = fs.readFileSync(wuiStoresPath, 'utf8');
    const workflowChunkMatch = storesContent.match(/useWorkflowStore.*?from\s+'\.\/([^']+)'/);

    if (workflowChunkMatch?.[1]) {
      const workflowChunk = workflowChunkMatch[1];
      const shimPath = path.resolve(__dirname, 'src/store/shims/workflowStoreChunk.ts');
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          new RegExp(workflowChunk.replace(/\./g, '\\.')),
          (resource: { request: string; createData?: { resource: string } }) => {
            // Only replace imports coming from the workflow-ui package
            if (resource.request?.includes(workflowChunk)) {
              resource.request = shimPath;
            } else if (resource.createData?.resource?.includes(workflowChunk)) {
              resource.createData.resource = shimPath;
            }
          }
        )
      );
    }

    // Add resolve extensions for CSS imports
    config.resolve.extensions = [...(config.resolve.extensions || []), '.css'];

    return config;
  },
};

export default withSentryConfig(nextConfig, {
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
  org: 'genfeedai',
  project: 'core-web',
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
