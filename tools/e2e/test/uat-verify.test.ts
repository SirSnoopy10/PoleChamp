import { describe, expect, it } from 'vitest';
import { parseCards, verify } from '../src/uat-verify.ts';

const CSV = `start,judge,k1,k2,k3,k4,k5,p1,p2
47,jA,9,8.5,8,8.5,8,0,0
47,jB,9,9,8.5,8,8.5,1,0
46,jA,8,8,8,8,8,0,0`;

describe('weryfikacja kart kontrolnych (IMP-464)', () => {
  it('TC-UAT-016: przeliczenie kart silnikiem punktacji', () => {
    expect(parseCards(CSV).map((c) => c.totalHundredths)).toEqual([5525, 5450, 5200]);
  });

  it('TC-UAT-016: zgodne wyniki, brak oceny, duplikat, nadmiarowy arkusz', () => {
    const cards = parseCards(CSV);
    expect(
      verify(cards, [
        { startNumber: 47, official: 54.88, sheetCount: 2 },
        { startNumber: 46, official: 52, sheetCount: 1 },
      ]),
    ).toEqual([]);
    expect(
      verify(cards, [
        { startNumber: 47, official: 56.75, sheetCount: 1 },
        { startNumber: 48, official: 50, sheetCount: 1 },
      ]),
    ).toEqual([
      'nr 47: kart 2, arkuszy w API 1',
      'nr 47: wynik z kart 5488, w API 5675',
      'nr 46: brak w wynikach API',
      'nr 48: oceny w API bez kart',
    ]);
  });
});
