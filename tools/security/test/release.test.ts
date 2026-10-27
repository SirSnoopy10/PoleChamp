import { describe, expect, it } from 'vitest';
import { missingPaths, read, tableRows, unknownTestCases } from '../src/docs.ts';

describe('IMP-407 / IMP-408: deklaracje sklepów i pentest', () => {
  it('TC-RODO-008: deklaracje zgodne z manifestem iOS (bez śledzenia, te same typy danych)', () => {
    const doc = read('docs-dev/privacy/store-declarations.md');
    const manifest = read('apps/mobile/plugins/with-privacy-manifest.js');
    const declared = [...manifest.matchAll(/DATA\('(\w+)'/g)].map((m) => m[1]);
    const label = tableRows(doc, /^(Contact Info|User Content|Diagnostics)$/).map((r) => r[1] ?? '');
    for (const type of declared) {
      expect(
        label.some((l) => l.replace(/\s/g, '').startsWith(type!)),
        type,
      ).toBe(true);
    }
    expect(doc).toContain('**Śledzenie (Tracking):** nie');
    expect(missingPaths(doc)).toEqual([]);
  });

  it('TC-SEC-007: zakres pentestu obejmuje macierz ról, PIN offline, synchronizację i luki znane', () => {
    const doc = read('docs-dev/security/pentest-scope.md');
    for (const s of ['matrix.ts', 'TL-04', 'sync/push', 'SEC-GAP', 'abuse-tests.md', 'security']) {
      expect(doc).toContain(s);
    }
    expect(missingPaths(doc)).toEqual([]);
    expect(unknownTestCases(doc)).toEqual([]);
  });
});
