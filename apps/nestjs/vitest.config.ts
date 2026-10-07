import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.spec.ts'],
    // Live tests open real sockets – fail fast instead of hanging forever.
    testTimeout: 5_000,
    hookTimeout: 5_000,
    // /live/ without an Angular build: serve the frontend's source index.html.
    env: {
      FRONTEND_DIR: join(import.meta.dirname, '..', 'frontend', 'src'),
    },
  },
});
