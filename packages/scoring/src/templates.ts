import type { Style, Tenths } from './types.js';

export interface CriterionTemplate {
  key: string;
  name: string;
  scaleMax: number;
  weightTenths: Tenths;
  description: string;
}

export interface PenaltyTemplate {
  key: string;
  name: string;
  pointsTenths: Tenths;
  maxOccurrences: number;
}

export interface CategoryTemplate {
  criteria: readonly CriterionTemplate[];
  penaltyTypes: readonly PenaltyTemplate[];
}

const BASE: readonly CriterionTemplate[] = [
  {
    key: 'technique',
    name: 'Technika',
    scaleMax: 10,
    weightTenths: 20,
    description: 'Siła, elementy na rurze',
  },
  {
    key: 'artistry',
    name: 'Artyzm / interpretacja muzyki',
    scaleMax: 10,
    weightTenths: 15,
    description: 'Muzykalność i wyraz',
  },
  {
    key: 'choreography',
    name: 'Choreografia',
    scaleMax: 10,
    weightTenths: 10,
    description: 'Struktura i pomysłowość układu',
  },
  {
    key: 'flow',
    name: 'Płynność i przejścia',
    scaleMax: 10,
    weightTenths: 10,
    description: 'Płynność ruchu i transferów',
  },
  {
    key: 'overall',
    name: 'Wrażenie ogólne',
    scaleMax: 10,
    weightTenths: 10,
    description: 'Ogólne wrażenie sceniczne',
  },
];

const FLOORWORK: CriterionTemplate = {
  key: 'floorwork',
  name: 'Praca na podłodze',
  scaleMax: 10,
  weightTenths: 10,
  description: 'Floorwork i przejścia parterowe',
};

const PENALTIES: readonly PenaltyTemplate[] = [
  { key: 'fall', name: 'Upadek', pointsTenths: 20, maxOccurrences: 3 },
  { key: 'overtime', name: 'Przekroczenie czasu', pointsTenths: 10, maxOccurrences: 2 },
];

/** Szablon kryteriów i kar kopiowany do nowej kategorii (07-reguly §8, D-SC-12). */
export function templateForStyle(style: Style): CategoryTemplate {
  const criteria = style === 'EXOTIC' ? [...BASE.slice(0, 3), FLOORWORK, ...BASE.slice(3)] : [...BASE];
  return { criteria, penaltyTypes: [...PENALTIES] };
}
