import { defineConfig } from 'vitest/config';

// Playwright specs live in tests/ and are not vitest tests.
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', 'tests/**', 'dist/**'],
  },
});
