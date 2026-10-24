import { defineConfig } from 'vitest/config';

// Silnik punktacji: 100% gałęzi (IMP-003, 03-test-plans/00-strategia-testowania.md).
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text', 'json-summary', 'json'],
      thresholds: { branches: 100, lines: 100, functions: 100, statements: 100 },
    },
  },
});
