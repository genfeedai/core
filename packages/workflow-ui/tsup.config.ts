import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    canvas: 'src/canvas/index.ts',
    nodes: 'src/nodes/index.ts',
    panels: 'src/panels/index.ts',
    toolbar: 'src/toolbar/index.ts',
    hooks: 'src/hooks/index.ts',
    stores: 'src/stores/index.ts',
    provider: 'src/provider/index.ts',
    ui: 'src/ui/index.ts',
    lib: 'src/lib/index.ts',
  },
  format: ['esm', 'cjs'],
  tsconfig: 'tsconfig.build.json',
  dts: true,
  clean: true,
  splitting: true,
  treeshake: true,
  jsx: 'automatic',
  external: [
    'react',
    'react-dom',
    '@xyflow/react',
    'zustand',
    'zundo',
    'next',
    'next/image',
    '@genfeedai/core',
    '@genfeedai/types',
  ],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";',
    };
  },
});
