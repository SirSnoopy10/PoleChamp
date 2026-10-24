import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Regresja wizualna i wydajność PDF (IMP-173): bez Dockera, osobno od testów jednostkowych
// (wzorce PNG zależą od rasteryzacji – generowane na runnerze CI, `pnpm pdf:update-baselines`).
export default defineConfig(({ mode }) => ({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/pdf/**/*.test.ts'],
    testTimeout: 60_000,
    fileParallelism: false,
    env: { UPDATE_BASELINES: mode === 'update-baselines' ? '1' : '' },
  },
}));
