import { z } from 'zod';
import { AggregationMethod, CategoryStatus } from './categories.js';
import { CursorPage, Id, IsoDateTime } from './common.js';
import { EntryStatus } from './entries.js';
import { AuthMode } from './sync.js';

/** Odczyty organizatora: ranking, oceny, rewizje, odrzucenia, eksport, audyt (03-api §3.6; IMP-064). */
export const ResultRow = z.object({
  entryId: Id,
  rank: z.number().int().positive().nullable(),
  startNumber: z.number().int(),
  fullName: z.string(),
  club: z.string().nullable().optional(),
  entryStatus: EntryStatus,
  official: z.number().nullable(),
  /** Tekst liczony przez serwer wg 07-reguly §4 – identyczny w UI i PDF. */
  display: z.string(),
  sheetCount: z.number().int().min(0),
  isComplete: z.boolean(),
  isProvisional: z.boolean(),
  tieBreak: z.number().nullable().optional(),
});

export const ResultsResponse = z.object({
  categoryId: Id,
  status: CategoryStatus,
  resultsVersion: z.number().int().min(0),
  maxJudgeScore: z.number(),
  judgeCount: z.number().int().min(0),
  formula: AggregationMethod,
  tieBreak: z.object({ criterionId: Id, criterionName: z.string() }).nullable(),
  rows: z.array(ResultRow),
});

export const TournamentResults = z.object({ tournamentId: Id, categories: z.array(ResultsResponse) });

export const OrgScoreSheet = z.object({
  id: Id,
  judge: z.object({ id: Id, fullName: z.string() }),
  criteria: z.array(z.object({ criterionId: Id, name: z.string(), weight: z.number(), value: z.number() })),
  penalties: z.array(
    z.object({ penaltyTypeId: Id, name: z.string(), points: z.number(), count: z.number().int() }),
  ),
  comment: z.string(),
  total: z.number(),
  authMode: AuthMode,
  revision: z.number().int().positive(),
  updatedAt: IsoDateTime,
});

export const ScoreSheetRevision = z.object({
  revision: z.number().int().positive(),
  createdAt: IsoDateTime,
  total: z.number(),
  actorType: z.enum(['JUDGE', 'ORGANIZER']),
});

export const RejectionResolution = z.enum(['PENDING', 'ACCEPTED', 'DISCARDED']);

export const RejectedSubmission = z.object({
  id: Id,
  judge: z.object({ id: Id, fullName: z.string() }),
  entry: z.object({ id: Id, startNumber: z.number().int(), fullName: z.string() }),
  category: z.object({ id: Id, name: z.string() }),
  reason: z.string(),
  receivedAt: IsoDateTime,
  payloadTotal: z.number(),
  resolution: RejectionResolution,
  /** Po przyjęciu: sędzia ma nowszą ocenę tego startu – przyjęcie ją nadpisało (TC-EDGE-033). */
  newerSheetExists: z.boolean().optional(),
});

export const ExportCreate = z
  .strictObject({
    scope: z.enum(['TOURNAMENT', 'CATEGORY']),
    tournamentId: Id,
    categoryId: Id.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.scope === 'CATEGORY' && v.categoryId === undefined) {
      ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'REQUIRED' });
    }
  });

export const ExportCreated = z.object({ exportId: Id });

export const ExportStatus = z.object({
  status: z.enum(['PENDING', 'READY', 'FAILED']),
  downloadUrl: z.url().optional(),
  expiresAt: IsoDateTime.optional(),
  resultsHash: z.string().nullable(),
});

export const AuditEntry = z.object({
  id: Id,
  at: IsoDateTime,
  actorType: z.enum(['ORGANIZER', 'JUDGE', 'DEVICE', 'SYSTEM']),
  actorId: Id.nullable(),
  action: z.string().max(60),
  entityType: z.string(),
  entityId: Id.nullable(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const AuditPage = CursorPage(AuditEntry);

export type ResultsResponse = z.infer<typeof ResultsResponse>;
export type RejectedSubmission = z.infer<typeof RejectedSubmission>;
export type AuditEntry = z.infer<typeof AuditEntry>;
