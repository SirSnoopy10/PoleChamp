import { defineConfig } from 'vitest/config';

// API: 80% linii (IMP-003). Testy integracyjne (test:int) mają osobną konfigurację w IMP-451.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text', 'json-summary', 'json'],
      thresholds: { lines: 80 },
    },
  },
});
