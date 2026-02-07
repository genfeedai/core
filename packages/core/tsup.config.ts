import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'topological-sort': 'src/topological-sort.ts',
    validation: 'src/validation.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: true,
  treeshake: true,
  external: ['@genfeedai/types'],
});
