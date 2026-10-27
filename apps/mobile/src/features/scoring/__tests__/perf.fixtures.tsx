import { defaultSheet, maxJudgeScore, type CategoryConfig } from '@polechamp/scoring';
import type { ActiveJudge } from '../../../data/judge/session';
import type { ScoreFormModel } from '../model';

/**
 * Model formularza bez bazy (IMP-500): `criteria` kryteriów i `penalties` kar jak w FX-MAX
 * (12 / 10 – TC-EDGE-024). Wartości początkowe = połowa skali (`defaultSheet`).
 */
export function formModel(criteria = 5, penalties = 3): ScoreFormModel {
  const cs = Array.from({ length: criteria }, (_, i) => ({
    id: `k${i + 1}`,
    name: `Kryterium ${i + 1}`,
    description: i % 2 ? `Opis kryterium ${i + 1}` : null,
    scaleMax: 10,
    stepTenths: 5,
    weightTenths: 10 + (i % 3) * 5,
  }));
  const ps = Array.from({ length: penalties }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Kara ${i + 1}`,
    pointsTenths: 5 + i * 5,
    maxOccurrences: 3,
  }));
  const config: CategoryConfig = {
    criteria: cs.map((c) => ({ id: c.id, scaleMax: c.scaleMax, weightTenths: c.weightTenths })),
    penaltyTypes: ps.map((p) => ({
      id: p.id,
      pointsTenths: p.pointsTenths,
      maxOccurrences: p.maxOccurrences,
    })),
  };
  const defaults = defaultSheet(config);
  return {
    entry: {
      id: 'e1',
      categoryId: 'c1',
      startNumber: 12,
      fullName: 'Anna Nowak',
      club: 'Pole Studio',
      status: 'ACTIVE',
    } as ScoreFormModel['entry'],
    criteria: cs,
    penalties: ps,
    config,
    maxHundredths: maxJudgeScore(cs),
    sheet: null,
    initial: { criteria: { ...defaults.criteria }, penalties: { ...defaults.penalties }, comment: '' },
    source: 'default',
  };
}

export const perfJudge = {
  judgeId: 'jA',
  tournamentId: 't1',
  authMode: 'ONLINE_PIN',
} as unknown as ActiveJudge;
