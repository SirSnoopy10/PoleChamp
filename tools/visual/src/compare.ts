import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { compare } from 'odiff-bin';

/**
 * Porównanie zrzutów z wzorcami (IMP-459): `<sekcja>__<przypadek>__<urządzenie>.png` z katalogu przebiegu
 * Maestro vs `baselines/` (Git LFS), odiff z progiem 0,1% i maską paska statusu, raport HTML do PR.
 */
export const THRESHOLD_PERCENT = 0.1;

/** Wysokość paska statusu do pominięcia (w pikselach zrzutu) – telefon 390×844 / tablet 1180×820 w 3×/2×. */
export const STATUS_BAR: Record<string, number> = { phone: 141, tablet: 48 };

export const NAME_RE = /^([a-z0-9-]+)__([a-z0-9-]+)__(phone|tablet)\.png$/;

export type Status = 'same' | 'changed' | 'new' | 'missing' | 'invalid-name';

export interface Entry {
  name: string;
  status: Status;
  diffPercent?: number;
  diffPath?: string;
}

export async function compareDir(actualDir: string, baselineDir: string, outDir: string): Promise<Entry[]> {
  mkdirSync(outDir, { recursive: true });
  const actual = readdirSync(actualDir).filter((f) => f.endsWith('.png'));
  const baselines = existsSync(baselineDir) ? readdirSync(baselineDir).filter((f) => f.endsWith('.png')) : [];
  const entries: Entry[] = [];
  for (const name of actual) {
    const m = NAME_RE.exec(name);
    if (!m) {
      entries.push({ name, status: 'invalid-name' });
      continue;
    }
    if (!baselines.includes(name)) {
      entries.push({ name, status: 'new' });
      continue;
    }
    const diffPath = join(outDir, name.replace(/\.png$/, '.diff.png'));
    const result = await compare(join(baselineDir, name), join(actualDir, name), diffPath, {
      threshold: 0.1,
      antialiasing: true,
      ignoreRegions: [{ x1: 0, y1: 0, x2: 4_000, y2: STATUS_BAR[m[3] ?? 'phone'] ?? 0 }],
    });
    const diffPercent = result.match ? 0 : 'diffPercentage' in result ? result.diffPercentage : 100;
    entries.push({
      name,
      status: diffPercent > THRESHOLD_PERCENT ? 'changed' : 'same',
      diffPercent,
      ...(diffPercent > THRESHOLD_PERCENT ? { diffPath } : {}),
    });
  }
  for (const name of baselines) if (!actual.includes(name)) entries.push({ name, status: 'missing' });
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Raport HTML (artefakt CI) – zmienione, nowe i brakujące ekrany z obrazami różnic. */
export function htmlReport(entries: readonly Entry[], outDir: string): string {
  const rows = entries
    .filter((e) => e.status !== 'same')
    .map((e) => {
      const img = e.diffPath
        ? `<img src="${esc(relative(outDir, e.diffPath).replace(/\\/g, '/'))}" width="320">`
        : '';
      const pct = e.diffPercent === undefined ? '' : `${e.diffPercent.toFixed(3)}%`;
      return `<tr><td>${esc(e.name)}</td><td>${e.status}</td><td>${pct}</td><td>${img}</td></tr>`;
    })
    .join('\n');
  const html = `<!doctype html><meta charset="utf-8"><title>Regresja wizualna</title>
<h1>Regresja wizualna – ${entries.filter((e) => e.status !== 'same').length} zmian</h1>
<table border="1" cellpadding="4"><tr><th>Zrzut</th><th>Stan</th><th>Różnica</th><th>Diff</th></tr>
${rows}
</table>`;
  writeFileSync(join(outDir, 'index.html'), html);
  return html;
}

/** Komentarz do PR (markdown). */
export function prComment(entries: readonly Entry[]): string {
  const changed = entries.filter((e) => e.status !== 'same');
  if (changed.length === 0) return 'Regresja wizualna: brak zmian względem wzorców.';
  return [
    `Regresja wizualna: ${changed.length} zmian – wymagana etykieta \`visual-approved\` (akceptacja projektanta).`,
    '',
    ...changed.map(
      (e) =>
        `- \`${basename(e.name)}\` – ${e.status}${e.diffPercent ? ` (${e.diffPercent.toFixed(3)}%)` : ''}`,
    ),
  ].join('\n');
}
