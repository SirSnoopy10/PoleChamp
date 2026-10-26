import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Testy integracyjne (IMP-004, IMP-451): PostgreSQL 18 i Valkey w Testcontainers, start raz na przebieg.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/integration/**/*.test.ts', 'test/authz/**/*.test.ts', 'test/contract/**/*.test.ts'],
    globalSetup: ['test/setup/containers.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    pool: 'forks',
    fileParallelism: false,
    reporters: ['default', ['junit', { outputFile: 'reports/int.xml' }]],
  },
});
