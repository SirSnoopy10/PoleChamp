import { templateForStyle } from '../src/templates.js';
import type { CategoryConfig, SheetInput, Style } from '../src/types.js';

/** Konfiguracja kategorii z szablonu stylu – id kryteriów i kar = klucze szablonu. */
export function configFor(style: Style = 'POLE_SPORT'): CategoryConfig {
  const t = templateForStyle(style);
  return {
    criteria: t.criteria.map((c) => ({ id: c.key, scaleMax: c.scaleMax, weightTenths: c.weightTenths })),
    penaltyTypes: t.penaltyTypes.map((p) => ({
      id: p.key,
      pointsTenths: p.pointsTenths,
      maxOccurrences: p.maxOccurrences,
    })),
  };
}

/** Arkusz Pole Sport z not w kolejności Technika, Artyzm, Choreografia, Płynność, Wrażenie (w punktach). */
export function poleSportSheet(notes: readonly number[], fall = 0, overtime = 0): SheetInput {
  const keys = ['technique', 'artistry', 'choreography', 'flow', 'overall'];
  return {
    criteria: Object.fromEntries(keys.map((k, i) => [k, Math.round((notes[i] ?? 0) * 10)])),
    penalties: { fall, overtime },
  };
}
