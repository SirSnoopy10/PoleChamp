// Zapis kontraktu wydania (IMP-452): dist/openapi.json → history/v<wersja>.json.
// Krok workflow wydania (`pnpm --filter @polechamp/contracts history:save -- 1.1.0`) po `build`.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv.slice(2).find((a) => /^\d+\.\d+\.\d+$/.test(a));
if (!version) {
  console.error('Użycie: history:save -- <X.Y.Z>');
  process.exit(1);
}
const out = resolve(root, 'history', `v${version}.json`);
if (existsSync(out)) {
  console.error(`Kontrakt ${version} już zapisany – wydania są niezmienne.`);
  process.exit(1);
}
mkdirSync(dirname(out), { recursive: true });
copyFileSync(resolve(root, 'dist/openapi.json'), out);
console.log(`Kontrakt → ${out}`);
