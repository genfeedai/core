import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  test: {
    coverage: {
      exclude: ['src/**/*.test.{ts,tsx}', 'src/types/**', 'src/test/**', 'src/**/index.ts'],
      include: [
        'src/lib/**/*.ts',
        'src/store/**/*.ts',
        'src/hooks/**/*.ts',
        'src/components/**/*.tsx',
      ],
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      thresholds: {
        branches: 65,
        functions: 50,
        lines: 20,
        statements: 20,
      },
    },
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    pool: 'forks',
    server: {
      deps: {
        inline: [/react/, /react-dom/],
      },
    },
    setupFiles: ['./src/test/setup.ts'],
  },
});
