import { z } from 'zod';
import {
  DecimalStep05,
  Id,
  IntInRange,
  IsoDateTime,
  OptionalTrimmedString,
  Progress,
  TrimmedString,
} from './common.js';

/** Kategorie, kryteria i kary (03-api §3.3; FR-301, FR-305, FR-307, FR-309; IMP-061). */
export const Style = z.enum(['POLE_SPORT', 'POLE_ART', 'EXOTIC', 'DOUBLES']);
export const Level = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO', 'ELITE']);
export const CategoryStatus = z.enum(['DRAFT', 'IN_PROGRESS', 'LOCKED']);
export const AggregationMethod = z.enum(['MEAN', 'TRIMMED_MEAN']);

const ageGroup = z
  .string()
  .trim()
  .max(40, { error: 'TOO_LONG' })
  .transform((v) => (v.length === 0 ? 'Open' : v));

export const CategoryCreate = z.strictObject({
  name: TrimmedString(1, 80),
  style: Style,
  level: Level,
  ageGroup: ageGroup.default('Open'),
});

export const CategoryPatch = z.strictObject({
  name: TrimmedString(1, 80).optional(),
  style: Style.optional(),
  level: Level.optional(),
  ageGroup: ageGroup.optional(),
});

export const CriterionInput = z.strictObject({
  name: TrimmedString(1, 60),
  scaleMax: IntInRange(1, 20),
  weight: DecimalStep05(0.5, 5),
  description: OptionalTrimmedString(200),
});
export const CriterionPatch = CriterionInput.partial();

export const PenaltyTypeInput = z.strictObject({
  name: TrimmedString(1, 60),
  points: DecimalStep05(0.5, 50),
  maxOccurrences: IntInRange(1, 10),
});
export const PenaltyTypePatch = PenaltyTypeInput.partial();

export const Criterion = z.object({
  id: Id,
  name: z.string(),
  description: z.string().nullable().optional(),
  scaleMax: z.number().int(),
  step: z.literal(0.5),
  weight: z.number(),
  position: z.number().int().positive(),
});

export const PenaltyType = z.object({
  id: Id,
  name: z.string(),
  points: z.number(),
  maxOccurrences: z.number().int(),
  position: z.number().int().positive(),
});

const categoryBase = {
  id: Id,
  name: z.string(),
  style: Style,
  level: Level,
  ageGroup: z.string(),
  status: CategoryStatus,
};

export const CategoryListItem = z.object({
  ...categoryBase,
  entryCount: z.number().int().min(0),
  progress: Progress,
});

export const CategoryDetails = z.object({
  ...categoryBase,
  tournamentId: Id,
  aggregationMethod: AggregationMethod,
  tieBreakCriterionId: Id.nullable(),
  maxJudgeScore: z.number(),
  entryCount: z.number().int().min(0),
  judgeCount: z.number().int().min(0),
  progress: Progress,
  pendingRejectedSubmissions: z.number().int().min(0).optional(),
  criteria: z.array(Criterion),
  penaltyTypes: z.array(PenaltyType),
  version: z.number().int().positive(),
});

export const LockRequest = z.strictObject({ force: z.boolean().default(false) });
export const UnlockRequest = z.strictObject({ reason: OptionalTrimmedString(500) });

export const DeviceWarning = z.object({
  deviceId: Id,
  name: z.string(),
  pendingMutations: z.number().int().min(0),
  lastSeenAt: IsoDateTime.nullable(),
});

/** Treść 409 `LOCK_WARNINGS` – arkusz SCR-ORG-18. */
export const LockWarnings = z.object({
  missingSheets: z.number().int().min(0),
  devicesWithPending: z.array(DeviceWarning),
  offlineDevices: z.array(DeviceWarning).default([]),
});

export const LockResponse = z.object({
  id: Id,
  status: z.literal('LOCKED'),
  lockedAt: IsoDateTime,
  resultsVersion: z.number().int().positive(),
  finalResultsHash: z.string(),
});

export type CategoryCreate = z.infer<typeof CategoryCreate>;
export type CategoryDetails = z.infer<typeof CategoryDetails>;
export type CriterionInput = z.infer<typeof CriterionInput>;
export type PenaltyTypeInput = z.infer<typeof PenaltyTypeInput>;
export type LockWarnings = z.infer<typeof LockWarnings>;
