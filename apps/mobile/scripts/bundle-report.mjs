// Analiza bundla JS (IMP-501, IMP-506): eksport Hermes (`expo export --dump-sourcemap`) i udział pakietów
// w źródłach modułów (`sourcesContent` mapy). Użycie:
//   node scripts/bundle-report.mjs [--platform android|ios] [--top 25] [--budget-kb 9500] [--map plik.map]
// Bez `--map` wykonuje eksport do katalogu tymczasowego (wariant production). Kod wyjścia 1 – bajtkod
// Hermes większy niż budżet (`--budget-kb`).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    platform: { type: 'string', default: 'android' },
    top: { type: 'string', default: '25' },
    'budget-kb': { type: 'string' },
    map: { type: 'string' },
    json: { type: 'boolean', default: false },
  },
});

/** Pakiet z ścieżki źródła: `node_modules/.pnpm/x@1/node_modules/@scope/name/…` → `@scope/name`. */
export function packageOf(source) {
  const s = source.replace(/\\/g, '/');
  const i = s.lastIndexOf('node_modules/');
  if (i === -1) {
    const ws = /(?:^|\/)(apps|packages)\/([^/]+)\//.exec(s);
    return ws ? `${ws[1]}/${ws[2]}` : '(inne)';
  }
  const rest = s.slice(i + 'node_modules/'.length).split('/');
  return rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0];
}

export function summarizeMap(map) {
  const sizes = new Map();
  map.sources.forEach((src, i) => {
    const len = Buffer.byteLength(map.sourcesContent?.[i] ?? '', 'utf8');
    const pkg = packageOf(src);
    sizes.set(pkg, (sizes.get(pkg) ?? 0) + len);
  });
  const total = [...sizes.values()].reduce((a, b) => a + b, 0);
  const rows = [...sizes.entries()]
    .map(([pkg, bytes]) => ({ pkg, kb: Math.round(bytes / 1024), pct: total ? (bytes / total) * 100 : 0 }))
    .sort((a, b) => b.kb - a.kb);
  return { modules: map.sources.length, sourceKb: Math.round(total / 1024), rows };
}

function findBundle(dir) {
  for (const f of readdirSync(dir, { recursive: true })) {
    const p = path.join(dir, String(f));
    if (
      /\.(hbc|js)$/.test(p) &&
      statSync(p).isFile() &&
      p.includes(`${path.sep}${values.platform}${path.sep}`)
    )
      return p;
  }
  throw new Error('Brak bundla w eksporcie');
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  let out = null;
  let mapFile = values.map;
  let bundleKb = null;
  try {
    if (!mapFile) {
      out = mkdtempSync(path.join(tmpdir(), 'polechamp-bundle-'));
      execFileSync(
        'npx',
        ['expo', 'export', '--platform', values.platform, '--output-dir', out, '--dump-sourcemap'],
        {
          stdio: 'inherit',
          shell: process.platform === 'win32',
          env: { ...process.env, EXPO_PUBLIC_APP_VARIANT: 'production', NODE_ENV: 'production' },
        },
      );
      const bundle = findBundle(out);
      bundleKb = Math.round(statSync(bundle).size / 1024);
      mapFile = `${bundle}.map`;
    }
    const report = summarizeMap(JSON.parse(readFileSync(mapFile, 'utf8')));
    const top = report.rows.slice(0, Number(values.top));
    if (values.json) {
      console.log(JSON.stringify({ platform: values.platform, bundleKb, ...report, rows: top }, null, 2));
    } else {
      console.log(
        `Platforma: ${values.platform} · bajtkod: ${bundleKb ?? '?'} KB · moduły: ${report.modules} · źródła: ${report.sourceKb} KB`,
      );
      for (const r of top)
        console.log(`${String(r.kb).padStart(7)} KB  ${r.pct.toFixed(1).padStart(5)}%  ${r.pkg}`);
    }
    const budget = values['budget-kb'] ? Number(values['budget-kb']) : null;
    if (budget !== null && bundleKb !== null && bundleKb > budget) {
      console.error(`Bajtkod ${bundleKb} KB > budżet ${budget} KB`);
      process.exitCode = 1;
    }
  } finally {
    if (out) rmSync(out, { recursive: true, force: true });
  }
}
