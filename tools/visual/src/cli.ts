import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compareDir, htmlReport, prComment } from './compare.ts';

/** `pnpm --filter @polechamp/visual compare -- <katalog zrzutów>` → `reports/visual/` i kod wyjścia ≠ 0 przy zmianach. */
const actual = resolve(process.argv[2] ?? 'reports/maestro/visual');
const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'reports');
const entries = await compareDir(actual, resolve(root, 'baselines'), out);
htmlReport(entries, out);
writeFileSync(resolve(out, 'comment.md'), prComment(entries));
console.log(prComment(entries));
process.exit(entries.every((e) => e.status === 'same') ? 0 : 1);
