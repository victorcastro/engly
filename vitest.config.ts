import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      include: ['src/**/*.ts', 'scripts/**/*.mjs'],
      thresholds: {
        'src/core/block.ts': { 100: true },
        'src/core/size.ts': { 100: true },
      },
    },
  },
});
