// Kontrola rozmiaru (IMP-506, TC-PERF-009): bajtkod Hermes vs `size-baseline.json` (poprzednie wydanie),
// próg +10%. Rozmiar pobrania ze sklepów (≤ 60 MB, NFR-109) – wpisywany ręcznie do baseline po wydaniu.
// Użycie: node scripts/size-check.mjs [--platform android] (wykonuje eksport przez bundle-report.mjs).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

export const MAX_GROWTH = 0.1;
export const STORE_LIMIT_MB = 60;

/** Wynik porównania – `null` w baseline = brak danych (przechodzi z ostrzeżeniem). */
export function compareSize(currentKb, baselineKb, maxGrowth = MAX_GROWTH) {
  if (baselineKb === null || baselineKb === undefined) return { pass: true, growth: null };
  const growth = (currentKb - baselineKb) / baselineKb;
  return { pass: growth <= maxGrowth, growth };
}

if (process.argv[1]?.endsWith('size-check.mjs')) {
  const { values } = parseArgs({ options: { platform: { type: 'string', default: 'android' } } });
  const baseline = JSON.parse(readFileSync(new URL('../size-baseline.json', import.meta.url), 'utf8'));
  const out = execFileSync(
    process.execPath,
    ['scripts/bundle-report.mjs', '--platform', values.platform, '--json', '--top', '10'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  );
  const report = JSON.parse(out.slice(out.indexOf('{\n')));
  const { pass, growth } = compareSize(report.bundleKb, baseline[values.platform]?.hermesBytecodeKb);
  const pct = growth === null ? 'brak bazy' : `${(growth * 100).toFixed(1)}%`;
  console.log(
    `${values.platform}: bajtkod ${report.bundleKb} KB (zmiana: ${pct}, próg +${MAX_GROWTH * 100}%)`,
  );
  for (const [k, mb] of Object.entries(baseline.store ?? {})) {
    if (typeof mb === 'number' && mb > STORE_LIMIT_MB) console.error(`${k}: ${mb} MB > ${STORE_LIMIT_MB} MB`);
  }
  process.exitCode = pass ? 0 : 1;
}
