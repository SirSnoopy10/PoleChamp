import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Katalog główny repozytorium. */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

/** Identyfikatory przypadków testowych z kotwic planów testów (`<a id="tc-sec-001">`). */
export function knownTestCases(): Set<string> {
  const dir = join(ROOT, 'docs/03-test-plans');
  const ids = new Set<string>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    for (const m of readFileSync(join(dir, file), 'utf8').matchAll(/<a id="(tc-[a-z0-9-]+)">/g)) {
      ids.add((m[1] ?? '').toUpperCase());
    }
  }
  return ids;
}

/** Ścieżki repozytorium w `kodzie` dokumentu (zaczynające się od znanego katalogu głównego). */
export function referencedPaths(markdown: string): string[] {
  const roots = /^(apps|packages|tools|docs|docs-dev|ops|\.github)\//;
  return [...markdown.matchAll(/`([^`\s]+)`/g)]
    .map((m) => (m[1] ?? '').replace(/[:#].*$/, ''))
    .filter((p) => roots.test(p));
}

export const missingPaths = (markdown: string) =>
  referencedPaths(markdown).filter((p) => !existsSync(join(ROOT, p)));

/** Identyfikatory TC wymienione w dokumencie, których nie ma w planach testów. */
export function unknownTestCases(markdown: string, known = knownTestCases()): string[] {
  return [...new Set(markdown.match(/TC-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}/g) ?? [])].filter(
    (id) => !known.has(id),
  );
}

/** Wiersze tabeli Markdown jako tablice komórek (bez nagłówka i separatora). */
export function tableRows(markdown: string, firstCell: RegExp): string[][] {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .map((line) =>
      line
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim()),
    )
    .filter((cells) => firstCell.test(cells[0] ?? ''));
}
