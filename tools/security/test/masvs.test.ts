import { describe, expect, it } from 'vitest';
import { missingPaths, read, tableRows, unknownTestCases } from '../src/docs.ts';

const GROUPS = ['STORAGE', 'CRYPTO', 'AUTH', 'NETWORK', 'PLATFORM', 'CODE', 'RESILIENCE', 'PRIVACY'];
const STATUSES = ['spełnione', 'wyjątek', 'nie dotyczy', 'do weryfikacji', 'częściowo'];

describe('IMP-401: mapowanie MASVS 2.x (TC-SEC-002)', () => {
  const doc = read('docs-dev/security/masvs-mapping.md');
  const rows = tableRows(doc, /^MASVS-/);

  it('TC-SEC-002: każda grupa MASVS ma kontrole ze statusem i testem lub uzasadnieniem', () => {
    for (const group of GROUPS)
      expect(
        rows.some((r) => r[0]!.startsWith(`MASVS-${group}-`)),
        group,
      ).toBe(true);
    for (const [control, , test, status, notes] of rows) {
      expect(STATUSES, control).toContain(status);
      if (status === 'nie dotyczy') expect(notes!.length, control).toBeGreaterThan(10);
      else expect(test, control).toMatch(/MASTG-TEST-\d{4}|TC-/);
    }
  });

  it('TC-SEC-002: wyjątek STORAGE-1 L2 (R-06) opisany z mitygacjami', () => {
    const section = doc.split('## Wyjątek STORAGE-1 L2')[1]!.split('\n## ')[0]!;
    for (const s of ['SQLCipher', 'Keystore', 'with-no-backup.js', '7 dni', 'R-06'])
      expect(section).toContain(s);
  });

  it('TC-SEC-002: testy ręczne MASTG są na liście kontrolnej wydania', () => {
    expect(read('docs-dev/qa/release-checklist.md')).toContain('masvs-mapping.md');
  });

  it('ścieżki i przypadki testowe istnieją', () => {
    expect(missingPaths(doc)).toEqual([]);
    expect(unknownTestCases(doc)).toEqual([]);
  });
});
