import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  canonicalJson,
  canonicalResults,
  categoryProgress,
  formatPenaltyPoints,
  formatPenaltySum,
  formatRanking,
  formatScore,
  formatTenths,
  formatWeight,
  judgeProgress,
  tournamentProgress,
  type CanonicalRow,
} from '../src/index.js';

describe('formatowanie (IMP-055)', () => {
  it('TC-SCORING-035: formatowanie wyniku – przykłady', () => {
    expect([5425, 5513, 5475, 0, 6500, 5925].map((h) => formatScore(h))).toEqual([
      '54,3',
      '55,1',
      '54,8',
      '0,0',
      '65,0',
      '59,3',
    ]);
    expect(formatScore(null)).toBe('—');
    expect(formatScore(5270, 2)).toBe('52,70');
    expect(formatScore(5205, 2)).toBe('52,05');
    expect(formatTenths(100)).toBe('10,0');
  });

  it('TC-SCORING-036: wagi i punkty bez zbędnych zer, minus U+2212', () => {
    expect([
      formatWeight(20),
      formatWeight(15),
      formatPenaltyPoints(5),
      formatPenaltyPoints(20),
      formatPenaltySum(400),
    ]).toEqual(['×2', '×1,5', '−0,5 pkt', '−2 pkt', '−4,0']);
    expect(formatPenaltySum(400)).not.toContain('-');
  });

  it('TC-SCORING-019, UX2-02: wynik w rankingu zawsze z 2 miejscami', () => {
    const rows = [
      { rank: 1, officialHundredths: 5550 },
      { rank: 5, officialHundredths: 5270 },
      { rank: 6, officialHundredths: 5265 },
      { rank: 8, officialHundredths: 4800 },
      { rank: null, officialHundredths: null },
    ];
    expect(formatRanking(rows)).toEqual(['55,50', '52,70', '52,65', '48,00', '—']);
  });
});

describe('postęp (IMP-055)', () => {
  it('TC-SCORING-038: postęp kategorii, turnieju i sędziego', () => {
    const c3 = categoryProgress(30, 9, 5);
    expect(c3).toEqual({ done: 30, expected: 45, percent: 67 });
    // Turniej t1 (03-analiza-designu §8.2): c1, c2 zablokowane; c3–c5 Trwa; c6–c8 W przygotowaniu.
    const t1 = tournamentProgress([
      { status: 'LOCKED', progress: categoryProgress(45, 9, 5) },
      { status: 'LOCKED', progress: categoryProgress(50, 10, 5) },
      { status: 'IN_PROGRESS', progress: c3 },
      { status: 'IN_PROGRESS', progress: categoryProgress(24, 7, 5) },
      { status: 'IN_PROGRESS', progress: categoryProgress(24, 8, 5) },
      { status: 'DRAFT', progress: categoryProgress(0, 5, 5) },
      { status: 'DRAFT', progress: categoryProgress(0, 7, 5) },
      { status: 'DRAFT', progress: categoryProgress(0, 6, 5) },
    ]);
    expect(t1).toEqual({ done: 173, expected: 215, percent: 80, hasStartedCategories: true });
    const t2 = tournamentProgress([{ status: 'DRAFT', progress: categoryProgress(0, 7, 5) }]);
    expect(t2).toEqual({ done: 0, expected: 0, percent: 0, hasStartedCategories: false });
    expect(judgeProgress(6, 9)).toEqual({ done: 6, expected: 9, percent: 67 });
  });
});

describe('kanoniczny JSON (IMP-057)', () => {
  const category = { categoryId: 'c3', resultsVersion: 4, aggregationMethod: 'MEAN' as const, judgeCount: 5 };
  const rows: CanonicalRow[] = [
    {
      entryId: 'e47',
      startNumber: 47,
      entryStatus: 'ACTIVE',
      rank: 1,
      officialHundredths: 5550,
      sheetCount: 3,
      isComplete: false,
    },
    {
      entryId: 'e41',
      startNumber: 41,
      entryStatus: 'ACTIVE',
      rank: 6,
      officialHundredths: 5265,
      sheetCount: 5,
      isComplete: true,
    },
    {
      entryId: 'e48',
      startNumber: 48,
      entryStatus: 'ACTIVE',
      rank: null,
      officialHundredths: null,
      sheetCount: 0,
      isComplete: false,
    },
  ];
  const sha = (s: string) => createHash('sha256').update(s).digest('hex');

  it('TC-SCORING-042: posortowane klucze, liczby całkowite, bez danych osobowych', () => {
    const withPii = rows.map((r) => ({
      ...r,
      fullName: 'Natalia Sikora',
      club: 'Studio Vertical Wrocław',
      birthYear: 1999,
    }));
    const json = canonicalResults(category, withPii);
    expect(json).toBe(
      '{"aggregationMethod":"MEAN","categoryId":"c3","entries":[' +
        '{"entryId":"e41","entryStatus":"ACTIVE","isComplete":true,"officialHundredths":5265,"rank":6,"sheetCount":5,"startNumber":41},' +
        '{"entryId":"e47","entryStatus":"ACTIVE","isComplete":false,"officialHundredths":5550,"rank":1,"sheetCount":3,"startNumber":47},' +
        '{"entryId":"e48","entryStatus":"ACTIVE","isComplete":false,"officialHundredths":null,"rank":null,"sheetCount":0,"startNumber":48}' +
        '],"judgeCount":5,"resultsVersion":4}',
    );
    expect(json).not.toMatch(/fullName|club|birthYear|Sikora/);
  });

  it('TC-SCORING-043: suma kontrolna stabilna po permutacji i pseudonimizacji, zmienna po zmianie wyniku', () => {
    const base = sha(canonicalResults(category, rows));
    expect(sha(canonicalResults(category, [...rows].reverse()))).toBe(base);
    const pseudonymized = rows.map((r) => ({ ...r, fullName: '[usunięto]' }));
    expect(sha(canonicalResults(category, pseudonymized))).toBe(base);
    const changed = rows.map((r) => (r.entryId === 'e41' ? { ...r, officialHundredths: 5266 } : r));
    expect(sha(canonicalResults(category, changed))).not.toBe(base);
  });

  it('canonicalJson: odrzuca liczby niecałkowite i escapuje napisy', () => {
    expect(() => canonicalJson({ a: 1.5 })).toThrow(RangeError);
    expect(canonicalJson({ b: [true, 'ą"x'], a: null })).toBe('{"a":null,"b":[true,"ą\\"x"]}');
  });
});
