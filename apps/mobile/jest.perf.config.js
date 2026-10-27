// Reassure (IMP-500): ta sama konfiguracja co `jest.config.js`, ale tylko pliki `*.perf-test.tsx`
// (zwykły `pnpm test` je pomija). Uruchamiane przez `perf:test` (TEST_RUNNER_ARGS).
const base = require('./jest.config');

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  testMatch: ['<rootDir>/src/**/*.perf-test.tsx'],
  testPathIgnorePatterns: ['/node_modules/'],
};
