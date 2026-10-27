import { describe, expect, it } from 'vitest';
import { missingPaths, read, tableRows, unknownTestCases } from '../src/docs.ts';

const DOCS = ['data-inventory', 'ropa-processor', 'tom', 'subprocessors', 'breach-procedure'].map(
  (d) => `docs-dev/privacy/${d}.md`,
);
/** Lokalizacje dopuszczalne dla danych osobowych (EOG). */
const EEA = /eu-central-1|eu-west-1|region UE|UE\b|bez danych osób|nie jest daną osobową/;

describe('IMP-406: materiały RODO', () => {
  it('komplet dokumentów, poprawne ścieżki i przypadki testowe', () => {
    for (const path of DOCS) {
      const doc = read(path);
      expect(missingPaths(doc), path).toEqual([]);
      expect(unknownTestCases(doc), path).toEqual([]);
    }
  });

  it('inwentarz obejmuje tabele z danymi osobowymi i lokalizacje', () => {
    const doc = read('docs-dev/privacy/data-inventory.md');
    for (const t of ['app_user', 'athlete', 'judge', 'audit_log', 'score_sheet', 'score_sheet_revision']) {
      expect(doc).toContain(`| \`${t}\``);
    }
    for (const s of ['eu-central-1', 'eu-west-1', 'Tablet', 'CloudWatch', 'Sentry']) expect(doc).toContain(s);
  });

  it('TC-RODO-007: podprzetwarzający i zasoby z danymi wyłącznie w EOG', () => {
    const rows = tableRows(read('docs-dev/privacy/subprocessors.md'), /^[A-Z]/).filter(
      (r) => r[0] !== 'Podmiot',
    );
    expect(rows.length).toBeGreaterThanOrEqual(4);
    for (const [name, , location, scope] of rows) expect(`${location} ${scope}`, name).toMatch(EEA);
    expect(read('apps/api/src/config/env.ts')).toMatch(/S3_REGION: z\.string\(\)\.default\('eu-central-1'\)/);
    const dsn = /EXPO_PUBLIC_SENTRY_DSN=(.*)/.exec(read('apps/mobile/.env.example'))![1]!.trim();
    if (dsn) expect(dsn).toMatch(/\.de\.sentry\.io/);
  });

  it('procedura naruszeń: ocena w 24 h, powiadomienie administratora, PUODO 72 h, rejestr', () => {
    const doc = read('docs-dev/privacy/breach-procedure.md');
    for (const s of ['24 h', '72 h', 'PUODO', 'Rejestr naruszeń']) expect(doc).toContain(s);
  });

  it('pytania otwarte do prawnika (Q-10)', () => {
    expect(read('docs-dev/privacy/ropa-processor.md')).toMatch(/Pytania otwarte do prawnika \(Q-10\)\n\n1\./);
  });
});
