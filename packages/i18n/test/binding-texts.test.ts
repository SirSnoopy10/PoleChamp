import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { pl } from '../src/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const doc = (path: string) => readFileSync(resolve(root, path), 'utf8');

/** Wszystkie wartości słownika jako płaska lista. */
function values(dict: unknown): string[] {
  return typeof dict === 'string' ? [dict] : Object.values(dict as object).flatMap(values);
}

/** Placeholdery `{…}` i liczby z przykładów („Numer 47”) traktujemy jako równe. */
const normalize = (text: string) =>
  text
    .replace(/\{[^}]+\}/g, '#')
    .replace(/\d+/g, '#')
    .trim();
const dictionary = new Set(values(pl).map(normalize));

const quotes = (text: string) => [...text.matchAll(/„([^”]+)”/g)].map((m) => m[1] as string);

describe('IMP-070: teksty wiążące ze specyfikacji', () => {
  it('TC-I18N-006: każdy toast z 09-design-system §6 ma identyczny tekst w słowniku', () => {
    const section =
      doc('docs/02-specification/09-design-system.md').split('## 6. Katalog toastów')[1]?.split('\n## ')[0] ??
      '';
    const texts = section
      .split('\n')
      .filter((l) => l.startsWith('| `toast.'))
      // Pomijamy wzmianki o starych tekstach prototypu: „(w prototypie „…”)”.
      .flatMap((row) => quotes((row.split('|')[2] ?? '').replace(/\(w prototypie[^)]*\)/g, '')));
    expect(texts.length).toBeGreaterThanOrEqual(26);
    const missing = texts.filter((t) => !dictionary.has(normalize(t)));
    expect(missing).toEqual([]);
  });

  it('TC-I18N-007 / TC-CONTRACT-011: komunikaty kodów błędów z 03-api §1.2', () => {
    const table =
      doc('docs/01-architecture/03-api.md').split('### 1.2 Katalog kodów błędów')[1]?.split('### 1.3')[0] ??
      '';
    const texts = table
      .split('\n')
      .filter((l) => l.startsWith('| `'))
      .flatMap((row) => quotes(row.split(/(?<!\\)\|/)[4] ?? ''));
    expect(texts.length).toBeGreaterThanOrEqual(35);
    const missing = texts.filter((t) => !dictionary.has(normalize(t)));
    expect(missing).toEqual([]);
  });

  it('teksty panelu sędziego z liczbą mnogą (06-ekrany-sedziego)', () => {
    const judgeSpec = doc('docs/02-specification/06-ekrany-sedziego.md');
    for (const text of [
      'Offline · {n} w kolejce',
      'Oceny w kolejce: {n}',
      'Ta ocena nie została przyjęta: {powód}.',
    ]) {
      expect(judgeSpec).toContain(`„${text}”`);
      expect(dictionary.has(normalize(text)), text).toBe(true);
    }
  });
});
