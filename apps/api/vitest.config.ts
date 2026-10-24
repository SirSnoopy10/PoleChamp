import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Testy jednostkowe API (bez Dockera). SWC emituje metadane dekoratorów potrzebne NestJS.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'json-summary', 'json'],
      thresholds: { lines: 80 },
    },
  },
});
