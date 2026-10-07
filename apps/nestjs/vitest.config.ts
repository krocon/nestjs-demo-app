import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.spec.ts'],
    // Live tests open real sockets – fail fast instead of hanging forever.
    testTimeout: 5_000,
    hookTimeout: 5_000,
  },
});
