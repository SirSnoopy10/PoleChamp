import { describe, expect, it } from 'vitest';
import { missingPaths, read, tableRows, unknownTestCases } from '../src/docs.ts';

const STATUSES = ['spełnione', 'częściowo', 'nie dotyczy'];

describe('IMP-400: mapowanie ASVS 5.0 L2 (TC-SEC-001)', () => {
  const doc = read('docs-dev/security/asvs-mapping.md');
  const rows = tableRows(doc, /^V\d+$/);

  it('TC-SEC-001: każdy rozdział V1–V17 ma implementację, testy i status', () => {
    expect(rows.map((r) => r[0])).toEqual(Array.from({ length: 17 }, (_, i) => `V${i + 1}`));
    for (const [chapter, , impl, tests, status, notes] of rows) {
      expect(STATUSES, chapter).toContain(status);
      if (status === 'nie dotyczy') expect(notes!.length, `${chapter}: uzasadnienie`).toBeGreaterThan(10);
      else {
        expect(impl, chapter).not.toBe('–');
        expect(tests, chapter).toMatch(/TC-/);
      }
    }
  });

  it('TC-SEC-001: luki „częściowo” mają zadanie w backlogu', () => {
    const gaps = new Set(tableRows(doc, /^SEC-GAP-\d+$/).map((r) => r[0]));
    for (const row of rows.filter((r) => r[4] === 'częściowo')) {
      const ids = row[5]!.match(/SEC-GAP-\d+/g) ?? [];
      expect(ids.length, row[0]).toBeGreaterThan(0);
      for (const id of ids) expect(gaps).toContain(id);
    }
  });

  it('TC-SEC-001: ścieżki i przypadki testowe istnieją', () => {
    expect(missingPaths(doc)).toEqual([]);
    expect(unknownTestCases(doc)).toEqual([]);
  });
});

describe('IMP-400: model zagrożeń i szablon PR', () => {
  it('STRIDE obejmuje zmiany TL i wszystkie kategorie', () => {
    const doc = read('docs-dev/security/threat-model.md');
    for (const tl of ['TL-04', 'TL-05', 'TL-06', 'TL-12', 'TL-13']) expect(doc).toContain(tl);
    expect(new Set(tableRows(doc, /^[STRIDE]$/).map((r) => r[0]))).toEqual(new Set('STRIDE'));
    expect(missingPaths(doc)).toEqual([]);
    expect(unknownTestCases(doc)).toEqual([]);
  });

  it('szablon PR ma checklistę bezpieczeństwa', () => {
    const doc = read('.github/pull_request_template.md');
    for (const s of ['x-permissions', 'TC-AUTHZ', 'scrubPii', 'Secrets Manager']) expect(doc).toContain(s);
    expect(missingPaths(doc)).toEqual([]);
  });
});
