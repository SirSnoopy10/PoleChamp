import { tournamentProgress } from '@polechamp/scoring';
import { describe, expect, it } from 'vitest';
import {
  categorySheets,
  FX,
  fixtureCategories,
  seed,
  seedCategory,
  seedCategoryProgress,
  seedRanking,
  toCategoryStatus,
} from '../src/fixtures.js';
import { DEMO_PINS, isForbiddenPin, SEED_PINS } from '../src/fixtures/pins.js';
import { buildSeed } from '../src/seed.js';

describe('seed prototypu (IMP-450, 03-analiza-designu §8)', () => {
  it('jest deterministyczny i zamrożony', () => {
    expect(buildSeed()).toEqual(buildSeed());
    expect(Object.isFrozen(seed().categories[0])).toBe(true);
  });

  it('ma turnieje t1–t4, kategorie c1–c18 i 5 sędziów', () => {
    const s = seed();
    expect(s.tournaments.map((t) => t.id)).toEqual(['t1', 't2', 't3', 't4']);
    expect(s.categories.map((c) => c.id)).toEqual(Array.from({ length: 18 }, (_, i) => `c${i + 1}`));
    expect(s.judges.map((j) => j.name)).toEqual([
      'Katarzyna Nowak',
      'Michał Woźniak',
      'Aleksandra Kot',
      'Tomasz Zając',
      'Joanna Wrona',
    ]);
    const counts = ['t1', 't2', 't3', 't4'].map((t) =>
      s.categories.filter((c) => c.tournamentId === t).reduce((n, c) => n + c.participantIds.length, 0),
    );
    expect(counts).toEqual([61, 20, 33, 20]);
    expect(seedCategory('c3').participantIds.map((p) => s.participants[p]!.number)).toEqual([
      41, 42, 43, 44, 45, 46, 47, 48, 49,
    ]);
    expect(seedCategory('c7').criteria).toHaveLength(6);
  });

  it('PIN-y testowe są nietrywialne i różne od demo', () => {
    const pins = seed().judges.map((j) => j.pin);
    expect(pins).toEqual(Object.values(SEED_PINS));
    expect(new Set(pins).size).toBe(5);
    expect(pins.filter(isForbiddenPin)).toEqual([]);
    expect(DEMO_PINS.every(isForbiddenPin)).toBe(true);
  });

  it('TC-SCORING-038: postęp c3 30/45 (67%), t1 173 z 215 (80%), t3 165, t4 100', () => {
    expect(seedCategoryProgress('c3')).toEqual({ done: 30, expected: 45, percent: 67 });
    const progressOf = (tid: string) =>
      tournamentProgress(
        seed()
          .categories.filter((c) => c.tournamentId === tid)
          .map((c) => ({ status: toCategoryStatus(c.status), progress: seedCategoryProgress(c.id) })),
      );
    expect(progressOf('t1')).toMatchObject({ done: 173, expected: 215, percent: 80 });
    expect(progressOf('t2')).toEqual({ done: 0, expected: 0, percent: 0, hasStartedCategories: false });
    expect(progressOf('t3')).toMatchObject({ done: 165, expected: 165, percent: 100 });
    expect(progressOf('t4')).toMatchObject({ done: 100, expected: 100, percent: 100 });
    expect(['c1', 'c2', 'c4', 'c5'].map((c) => categorySheets(c).length)).toEqual([45, 50, 24, 24]);
  });

  it('ranking c3 zgodny z 03-analiza-designu §8.6 (z poprawką G-26 – dwa miejsca przy 52,7)', () => {
    const rows = seedRanking('c3').map((r) => [
      r.rank,
      r.startNumber,
      r.fullName,
      r.club,
      r.display,
      r.sheetCount,
    ]);
    expect(rows).toEqual([
      [1, 47, 'Natalia Sikora', 'Studio Vertical Wrocław', '55,5', 3],
      [2, 46, 'Paulina Lewandowska', 'Aerial Dreams Warszawa', '55,1', 2],
      [3, 43, 'Amelia Król', 'Pole Passion Gdańsk', '54,8', 5],
      [4, 45, 'Magdalena Kaczmarek', 'Fly High Lublin', '54,3', 5],
      [5, 42, 'Agnieszka Mazur', 'PoleFit Kraków', '52,70', 5],
      [6, 41, 'Zuzanna Król', 'Aerial Dreams Warszawa', '52,65', 5],
      [7, 44, 'Magdalena Adamczyk', 'Vertigo Bydgoszcz', '48,0', 5],
      [null, 48, 'Lena Mazur', 'Aerial Dreams Warszawa', '—', 0],
      [null, 49, 'Weronika Walczak', 'Pole Dance Academy Rzeszów', '—', 0],
    ]);
    expect(seedRanking('c3')[1]!.officialHundredths).toBe(5513);
  });

  it('fikstury wskazują kategorie seedu', () => {
    expect(fixtureCategories(FX.T1C3)).toEqual(['c3']);
    expect(fixtureCategories(FX.FINISHED)).toEqual(['c12', 'c13', 'c14', 'c15']);
    expect(fixtureCategories(FX.SEED)).toHaveLength(18);
  });
});
