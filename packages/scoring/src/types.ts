/**
 * Typy silnika punktacji (ADR-006). Wszystkie wartości punktowe są liczbami całkowitymi:
 * `Tenths` – dziesiąte punktu (nota 8,5 → 85, waga ×1,5 → 15, kara 2 pkt → 20),
 * `Hundredths` – setne punktu (wynik 54,25 → 5425).
 */
export type Tenths = number;
export type Hundredths = number;

export type FieldErrorCode =
  | 'REQUIRED'
  | 'OUT_OF_RANGE'
  | 'INVALID_STEP'
  | 'INVALID_FORMAT'
  | 'TOO_LONG'
  | 'SCHEMA_MISMATCH'
  | 'MIN_CRITERIA'
  | 'LIMIT_EXCEEDED';

export type Result<T> = { ok: true; value: T } | { ok: false; code: FieldErrorCode; field?: string };

export type Style = 'POLE_SPORT' | 'POLE_ART' | 'EXOTIC' | 'DOUBLES';
export type CategoryStatus = 'DRAFT' | 'IN_PROGRESS' | 'LOCKED';
export type EntryStatus = 'ACTIVE' | 'WITHDRAWN';
export type AggregationMethod = 'MEAN' | 'TRIMMED_MEAN';

export interface CriterionConfig {
  id: string;
  /** Skala „0–max” w pełnych punktach (1–20). */
  scaleMax: number;
  weightTenths: Tenths;
}

export interface PenaltyTypeConfig {
  id: string;
  pointsTenths: Tenths;
  maxOccurrences: number;
}

export interface CategoryConfig {
  criteria: readonly CriterionConfig[];
  penaltyTypes: readonly PenaltyTypeConfig[];
  /** Kryterium rozstrzygające remis; domyślnie pierwsze kryterium („Technika”). */
  tieBreakCriterionId?: string;
}

/** Arkusz sędziego: noty w dziesiątych per kryterium, liczniki wystąpień per kara. */
export interface SheetInput {
  criteria: Readonly<Record<string, Tenths>>;
  penalties: Readonly<Record<string, number>>;
  comment?: string;
}
