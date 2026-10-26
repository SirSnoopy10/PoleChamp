// TC-SEC-018 (IMP-212): bundel produkcyjny nie zawiera DevCatalog. Eksport web z wariantem
// `production`, potem szukanie znaczników katalogu w plikach JS. Użycie: pnpm check:prod-bundle
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Treści sekcji i paska narzędzi katalogu (nazwy eksportów mogą zostać jako klucze właściwości).
const MARKERS = ['registerSection', 'Rama ekranu', 'Ogranicz ruch', 'Aa 130%'];
const out = mkdtempSync(path.join(tmpdir(), 'polechamp-prod-'));

try {
  execFileSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', out], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, EXPO_PUBLIC_APP_VARIANT: 'production', NODE_ENV: 'production' },
  });
  const dir = path.join(out, '_expo', 'static', 'js', 'web');
  const found = readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .flatMap((f) => {
      const code = readFileSync(path.join(dir, f), 'utf8');
      return MARKERS.filter((m) => code.includes(m)).map((m) => `${f}: ${m}`);
    });
  if (found.length) {
    console.error(`DevCatalog w bundlu produkcyjnym:\n${found.join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log('OK – bundel produkcyjny bez DevCatalog.');
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
