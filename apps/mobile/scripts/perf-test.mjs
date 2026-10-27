// Reassure (IMP-500): uruchamia testy `*.perf-test.tsx` z jest.perf.config.js.
// `pnpm perf:test -- --baseline` zapisuje bazę, bez flagi – pomiar bieżący i porównanie (.reassure/).
import { spawnSync } from 'node:child_process';

const res = spawnSync('reassure', process.argv.slice(2), {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, TEST_RUNNER_ARGS: '--config jest.perf.config.js' },
});
process.exit(res.status ?? 1);
