import { z } from 'zod';
import { SYNC_REJECTION_CODES } from '../errors/codes.js';
import { AggregationMethod, CategoryStatus, CriterionStep, Level, Style } from './categories.js';
import { Id, IsoDateTime, UuidV7 } from './common.js';
import { EntryStatus } from './entries.js';
import { TournamentStatus } from './tournaments.js';

/** Synchronizacja tabletu i sesje sędziów (03-api §4–5; FR-801, FR-802, FR-806; ADR-004; IMP-063). */
export const PinVerifier = z.object({
  alg: z.literal('PBKDF2-SHA256'),
  iterations: z.number().int().positive(),
  salt: z.string(),
  /** AES-256-GCM(klucz = HKDF-SHA256(pinPepper, 'pc-pin-v1'), weryfikator, aad = judgeId ‖ pinVersion) – TL-04. */
  wrapped: z.string(),
});

export const SnapshotJudge = z.object({
  id: Id,
  fullName: z.string(),
  initials: z.string(),
  isActive: z.boolean(),
  pinLocked: z.boolean(),
  position: z.number().int().positive(),
  pinVersion: z.number().int().positive(),
  pinVerifier: PinVerifier.nullable(),
});

export const SnapshotCriterion = z.object({
  id: Id,
  name: z.string(),
  description: z.string().nullable().optional(),
  scaleMax: z.number().int(),
  step: CriterionStep,
  weight: z.number(),
  position: z.number().int().positive(),
});

export const SnapshotPenaltyType = z.object({
  id: Id,
  name: z.string(),
  points: z.number(),
  maxOccurrences: z.number().int(),
  position: z.number().int().positive(),
});

export const SnapshotEntry = z.object({
  id: Id,
  startNumber: z.number().int(),
  startOrder: z.number().int().positive(),
  fullName: z.string(),
  club: z.string().nullable().optional(),
  status: EntryStatus,
});

export const SnapshotCategory = z.object({
  id: Id,
  name: z.string(),
  style: Style,
  level: Level,
  ageGroup: z.string(),
  position: z.number().int().positive(),
  status: CategoryStatus,
  aggregationMethod: AggregationMethod.default('MEAN'),
  tieBreakCriterionId: Id.nullable(),
  panelJudgeIds: z.array(Id),
  criteria: z.array(SnapshotCriterion),
  penaltyTypes: z.array(SnapshotPenaltyType),
  entries: z.array(SnapshotEntry),
});

export const Snapshot = z.object({
  cursor: z.number().int().min(0),
  serverTime: IsoDateTime,
  tournament: z.object({
    id: Id,
    name: z.string(),
    status: TournamentStatus,
    allowOfflinePinLogin: z.boolean(),
  }),
  judges: z.array(SnapshotJudge),
  categories: z.array(SnapshotCategory),
});

export const ChangeEntityType = z.enum([
  'tournament',
  'category',
  'criterion',
  'penalty_type',
  'entry',
  'athlete',
  'judge',
  'score_sheet',
]);

export const Change = z.object({
  seq: z.number().int().positive(),
  entityType: ChangeEntityType,
  op: z.enum(['U', 'D']),
  entity: z.object({ id: Id }).loose(),
});

export const ChangesQuery = z.object({
  since: z.coerce.number().int().min(0),
  limit: z.coerce.number().int().min(1).max(500).default(500),
});

export const ChangesResponse = z.object({
  changes: z.array(Change),
  cursor: z.number().int().min(0),
  hasMore: z.boolean(),
});

export const AuthMode = z.enum(['ONLINE_PIN', 'OFFLINE_PIN']);

/** Liczba punktowa w JSON (maks. 2 miejsca po przecinku). */
const Points = z
  .number()
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9, { message: 'INVALID_FORMAT' });

export const ScoreSheetPayload = z.strictObject({
  scoreSheetId: UuidV7,
  categoryId: Id,
  entryId: Id,
  baseRevision: z.number().int().min(0),
  criteria: z
    .array(z.strictObject({ criterionId: Id, value: Points }))
    .min(1)
    .max(12)
    .refine((items) => new Set(items.map((i) => i.criterionId)).size === items.length, {
      message: 'INVALID_FORMAT',
    }),
  penalties: z
    .array(z.strictObject({ penaltyTypeId: Id, count: z.number().int().min(0).max(10) }))
    .max(10)
    .refine((items) => new Set(items.map((i) => i.penaltyTypeId)).size === items.length, {
      message: 'INVALID_FORMAT',
    }),
  comment: z.string().trim().max(500, { error: 'TOO_LONG' }).default(''),
  clientTotal: Points,
});

const mutationBase = {
  mutationId: UuidV7,
  judgeId: Id,
  authMode: AuthMode,
  createdAt: IsoDateTime,
};

export const SubmitScoreSheetMutation = z.strictObject({
  ...mutationBase,
  type: z.literal('SUBMIT_SCORE_SHEET'),
  judgeSessionId: UuidV7,
  payload: ScoreSheetPayload,
});

export const JudgeSessionStartedMutation = z.strictObject({
  ...mutationBase,
  type: z.literal('JUDGE_SESSION_STARTED'),
  payload: z.strictObject({ judgeSessionId: UuidV7, pinVersion: z.number().int().positive() }),
});

export const JudgeSessionEndedMutation = z.strictObject({
  ...mutationBase,
  type: z.literal('JUDGE_SESSION_ENDED'),
  payload: z.strictObject({ judgeSessionId: UuidV7 }),
});

export const PinAttemptsReportMutation = z.strictObject({
  ...mutationBase,
  type: z.literal('PIN_ATTEMPTS_REPORT'),
  payload: z.strictObject({ failedCount: z.number().int().min(1), lockedUntil: IsoDateTime.nullable() }),
});

export const Mutation = z.discriminatedUnion('type', [
  SubmitScoreSheetMutation,
  JudgeSessionStartedMutation,
  JudgeSessionEndedMutation,
  PinAttemptsReportMutation,
]);

export const PushRequest = z.strictObject({
  deviceTime: IsoDateTime,
  mutations: z.array(Mutation).min(1).max(100, { error: 'TOO_LONG' }),
});

export const MutationResult = z.discriminatedUnion('status', [
  z.object({
    mutationId: UuidV7,
    status: z.literal('APPLIED'),
    scoreSheetId: UuidV7.optional(),
    revision: z.number().int().positive().optional(),
    serverTotal: z.number().optional(),
  }),
  z.object({
    mutationId: UuidV7,
    status: z.literal('DUPLICATE'),
    scoreSheetId: UuidV7.optional(),
    revision: z.number().int().positive().optional(),
    serverTotal: z.number().optional(),
  }),
  z.object({ mutationId: UuidV7, status: z.literal('REJECTED'), code: z.enum(SYNC_REJECTION_CODES) }),
  z.object({ mutationId: UuidV7, status: z.literal('RETRY') }),
]);

export const PushResponse = z.object({ results: z.array(MutationResult), cursor: z.number().int().min(0) });

export const JudgeSessionCreate = z.strictObject({
  judgeId: Id,
  pin: z.string().regex(/^\d{4}$/, { error: 'INVALID_FORMAT' }),
});

export const JudgeSessionCreated = z.object({
  judgeToken: z.string(),
  sessionId: UuidV7,
  expiresIn: z.number().int().positive(),
});

export const JudgeScoreSheet = ScoreSheetPayload.omit({ clientTotal: true, baseRevision: true }).extend({
  revision: z.number().int().positive(),
  total: z.number(),
  updatedAt: IsoDateTime,
});

export type Snapshot = z.infer<typeof Snapshot>;
export type ChangesResponse = z.infer<typeof ChangesResponse>;
export type Mutation = z.infer<typeof Mutation>;
export type PushRequest = z.infer<typeof PushRequest>;
export type PushResponse = z.infer<typeof PushResponse>;
export type ScoreSheetPayload = z.infer<typeof ScoreSheetPayload>;
