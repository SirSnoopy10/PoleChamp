import { Snapshot } from '@polechamp/contracts';
import { sheetTotal } from '@polechamp/scoring';
import { describe, expect, it } from 'vitest';
import {
  categoryConfig,
  FX_MAX_LIMITS,
  fxMax,
  makeCategory,
  makeEntry,
  makeJudge,
  makeScoreSheet,
  makeTournament,
  seedCategory,
  seedTournament,
  sheetInput,
  toSnapshot,
} from '../src/index.js';
import { isForbiddenPin } from '../src/fixtures/pins.js';

describe('fabryki encji (IMP-450)', () => {
  it('tworzą unikalne encje z nadpisywalnymi polami', () => {
    const t = makeTournament({ status: 'IN_PROGRESS' });
    const c = makeCategory({ tournamentId: t.id, status: 'IN_PROGRESS' });
    const e1 = makeEntry({ categoryId: c.id });
    const e2 = makeEntry({ categoryId: c.id, startNumber: 47 });
    const j = makeJudge({ fullName: 'Katarzyna Nowak' });
    expect(t.status).toBe('IN_PROGRESS');
    expect(e1.id).not.toBe(e2.id);
    expect(e2.startNumber).toBe(47);
    expect(j.initials).toBe('KN');
    expect(isForbiddenPin(j.pin)).toBe(false);
    expect(c.criteria.map((k) => k.weight)).toEqual([2, 1.5, 1, 1, 1]);
    const sheet = makeScoreSheet(c, { entryId: e1.id, judgeId: j.id, notes: [8.5, 8, 7.5, 7, 9] });
    expect(sheet.criteria.map((k) => k.value)).toEqual([8.5, 8, 7.5, 7, 9]);
    expect(makeScoreSheet(c, { entryId: e1.id, judgeId: j.id }).criteria[0]!.value).toBe(5);
  });

  it('seedTournament(t1) odtwarza 173 arkusze i wyniki sędziów zgodne z silnikiem', () => {
    const t1 = seedTournament('t1');
    expect(t1.categories).toHaveLength(8);
    expect(t1.entries).toHaveLength(61);
    expect(t1.sheets).toHaveLength(173);
    const c3 = seedCategory('c3');
    const first = t1.sheets.find((s) => s.categoryId === 'c3')!;
    const raw = {
      criteria: Object.fromEntries(first.criteria.map((k) => [k.criterionId, k.value])),
      penalties: Object.fromEntries(first.penalties.map((p) => [p.penaltyTypeId, p.count])),
    };
    expect(
      sheetTotal(sheetInput({ vals: raw.criteria, pens: raw.penalties, comment: '' }), categoryConfig(c3))
        .totalHundredths,
    ).toBeGreaterThan(0);
    expect(t1.categories.find((c) => c.id === 'c7')!.criteria[3]!.name).toBe('Praca na podłodze');
  });

  it('toSnapshot daje migawkę zgodną z kontraktem', () => {
    const snap = toSnapshot(seedTournament('t1'), 'd1', { cursor: 5 });
    expect(Snapshot.safeParse(snap).success).toBe(true);
    expect(snap.categories.find((c) => c.id === 'c3')!.entries.map((e) => e.startNumber)).toEqual([
      41, 42, 43, 44, 45, 46, 47, 48, 49,
    ]);
  });

  it('FX-MAX spełnia limity NFR-801', () => {
    const fx = fxMax();
    expect(fx.categories).toHaveLength(FX_MAX_LIMITS.categories);
    expect(fx.entries).toHaveLength(FX_MAX_LIMITS.entries);
    expect(fx.entries.filter((e) => e.categoryId === 'c1')).toHaveLength(300);
    expect(fx.judges).toHaveLength(30);
    expect(fx.devices).toHaveLength(20);
    expect(Snapshot.safeParse(toSnapshot(fx, 'd1')).success).toBe(true);
  });
});
