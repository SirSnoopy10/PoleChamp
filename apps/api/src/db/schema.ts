import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  char,
  customType,
  date,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Schemat Drizzle do zapytań typowanych (IMP-103). Źródłem prawdy DDL są migracje SQL w `migrations/`
 * (DEFERRABLE, wyzwalacze, partycje); test `schema-parity` porównuje kolumny z bazą po migracji.
 */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });
const citext = customType<{ data: string }>({ dataType: () => 'citext' });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
const id = () =>
  uuid('id')
    .primaryKey()
    .default(sql`uuidv7()`);
const timestamps = {
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
};

export const tournamentStatus = pgEnum('tournament_status', ['DRAFT', 'IN_PROGRESS', 'FINISHED']);
export const categoryStatus = pgEnum('category_status', ['DRAFT', 'IN_PROGRESS', 'LOCKED']);
export const categoryStyle = pgEnum('category_style', ['POLE_SPORT', 'POLE_ART', 'EXOTIC', 'DOUBLES']);
export const categoryLevel = pgEnum('category_level', [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'PRO',
  'ELITE',
]);
export const aggregationMethod = pgEnum('aggregation_method', ['MEAN', 'TRIMMED_MEAN']);
export const entryStatus = pgEnum('entry_status', ['ACTIVE', 'WITHDRAWN']);
export const rejectionReason = pgEnum('rejection_reason', [
  'CATEGORY_LOCKED',
  'CATEGORY_NOT_STARTED',
  'TOURNAMENT_FINISHED',
  'JUDGE_NOT_IN_PANEL',
  'JUDGE_INACTIVE',
  'ENTRY_WITHDRAWN',
  'PIN_VERSION_OUTDATED',
  'JUDGE_SESSION_INVALID',
]);
export const rejectionResolution = pgEnum('rejection_resolution', ['PENDING', 'ACCEPTED', 'DISCARDED']);
export const actorType = pgEnum('actor_type', ['ORGANIZER', 'JUDGE', 'DEVICE', 'SYSTEM']);
export const authMode = pgEnum('auth_mode', ['ONLINE_PIN', 'OFFLINE_PIN']);
export const exportScope = pgEnum('export_scope', ['TOURNAMENT', 'CATEGORY']);
export const exportStatus = pgEnum('export_status', ['QUEUED', 'RUNNING', 'DONE', 'FAILED']);
export const exportFormat = pgEnum('export_format', ['PDF', 'CSV']);

// §2.1–2.2, 2.22a, 2.23a – konto
export const appUser = pgTable('app_user', {
  id: id(),
  email: citext('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  displayName: varchar('display_name', { length: 80 }).notNull(),
  emailVerifiedAt: ts('email_verified_at'),
  locale: varchar('locale', { length: 5 }).notNull().default('pl'),
  termsAcceptedAt: ts('terms_accepted_at').notNull(),
  termsVersion: varchar('terms_version', { length: 20 }).notNull(),
  failedLoginCount: smallint('failed_login_count').notNull().default(0),
  lockedUntil: ts('locked_until'),
  lockoutLevel: smallint('lockout_level').notNull().default(0),
  deletedAt: ts('deleted_at'),
  ...timestamps,
});

export const authRefreshToken = pgTable('auth_refresh_token', {
  id: id(),
  userId: uuid('user_id').notNull(),
  familyId: uuid('family_id').notNull(),
  tokenHash: bytea('token_hash').notNull(),
  expiresAt: ts('expires_at').notNull(),
  revokedAt: ts('revoked_at'),
  replacedById: uuid('replaced_by_id'),
  userAgent: text('user_agent'),
  ip: inet('ip'),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const authEmailToken = pgTable('auth_email_token', {
  id: id(),
  userId: uuid('user_id').notNull(),
  purpose: varchar('purpose', { length: 20 }).$type<'VERIFY_EMAIL' | 'RESET_PASSWORD'>().notNull(),
  tokenHash: bytea('token_hash').notNull(),
  expiresAt: ts('expires_at').notNull(),
  usedAt: ts('used_at'),
  attempts: smallint('attempts').notNull().default(0),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const idempotencyKey = pgTable(
  'idempotency_key',
  {
    key: uuid('key').notNull(),
    userId: uuid('user_id').notNull(),
    method: varchar('method', { length: 10 }).notNull(),
    path: varchar('path', { length: 200 }).notNull(),
    requestHash: char('request_hash', { length: 64 }).notNull(),
    responseStatus: smallint('response_status').notNull(),
    responseBody: jsonb('response_body'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.key, t.userId] })],
);

// §2.3–2.10 – konfiguracja turnieju
export const tournament = pgTable('tournament', {
  id: id(),
  ownerId: uuid('owner_id').notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  startDate: date('start_date', { mode: 'string' }),
  endDate: date('end_date', { mode: 'string' }),
  venue: varchar('venue', { length: 120 }),
  timezone: varchar('timezone', { length: 40 }).notNull().default('Europe/Warsaw'),
  status: tournamentStatus('status').notNull().default('DRAFT'),
  startedAt: ts('started_at'),
  finishedAt: ts('finished_at'),
  allowOfflinePinLogin: boolean('allow_offline_pin_login').notNull().default(true),
  changeSeq: bigint('change_seq', { mode: 'number' }).notNull().default(0),
  version: integer('version').notNull().default(1),
  deletedAt: ts('deleted_at'),
  ...timestamps,
});

export const category = pgTable('category', {
  id: id(),
  tournamentId: uuid('tournament_id').notNull(),
  name: varchar('name', { length: 80 }).notNull(),
  style: categoryStyle('style').notNull().default('POLE_SPORT'),
  level: categoryLevel('level').notNull().default('BEGINNER'),
  ageGroup: varchar('age_group', { length: 40 }).notNull().default('Open'),
  position: integer('position').notNull(),
  status: categoryStatus('status').notNull().default('DRAFT'),
  aggregationMethod: aggregationMethod('aggregation_method').notNull().default('MEAN'),
  tieBreakCriterionId: uuid('tie_break_criterion_id'),
  startedAt: ts('started_at'),
  lockedAt: ts('locked_at'),
  lockedBy: uuid('locked_by'),
  resultsVersion: integer('results_version').notNull().default(0),
  finalResultsHash: char('final_results_hash', { length: 64 }),
  version: integer('version').notNull().default(1),
  ...timestamps,
});

export const criterion = pgTable('criterion', {
  id: id(),
  categoryId: uuid('category_id').notNull(),
  name: varchar('name', { length: 60 }).notNull(),
  description: varchar('description', { length: 200 }),
  scaleMax: smallint('scale_max').notNull().default(10),
  step: text('step').notNull().default('0.5'),
  weightTenths: smallint('weight_tenths').notNull(),
  position: integer('position').notNull(),
  ...timestamps,
});

export const penaltyType = pgTable('penalty_type', {
  id: id(),
  categoryId: uuid('category_id').notNull(),
  name: varchar('name', { length: 60 }).notNull(),
  pointsTenths: smallint('points_tenths').notNull(),
  maxOccurrences: smallint('max_occurrences').notNull().default(3),
  position: integer('position').notNull(),
  ...timestamps,
});

export const athlete = pgTable('athlete', {
  id: id(),
  tournamentId: uuid('tournament_id').notNull(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  club: varchar('club', { length: 100 }),
  birthYear: smallint('birth_year'),
  isMinor: boolean('is_minor').notNull().default(false),
  guardianConsentConfirmed: boolean('guardian_consent_confirmed').notNull().default(false),
  pseudonymizedAt: ts('pseudonymized_at'),
  ...timestamps,
});

export const entry = pgTable('entry', {
  id: id(),
  tournamentId: uuid('tournament_id').notNull(),
  categoryId: uuid('category_id').notNull(),
  athleteId: uuid('athlete_id').notNull(),
  startNumber: integer('start_number').notNull(),
  startOrder: integer('start_order').notNull(),
  status: entryStatus('status').notNull().default('ACTIVE'),
  withdrawnAt: ts('withdrawn_at'),
  version: integer('version').notNull().default(1),
  ...timestamps,
});

export const judge = pgTable('judge', {
  id: id(),
  tournamentId: uuid('tournament_id').notNull(),
  fullName: varchar('full_name', { length: 80 }).notNull(),
  initials: varchar('initials', { length: 3 }).notNull(),
  pinHash: text('pin_hash').notNull(),
  pinFingerprint: bytea('pin_fingerprint').notNull(),
  pinOfflineSalt: bytea('pin_offline_salt').notNull(),
  pinOfflineVerifier: bytea('pin_offline_verifier').notNull(),
  pinVersion: integer('pin_version').notNull().default(1),
  failedPinCount: smallint('failed_pin_count').notNull().default(0),
  pinLockedAt: ts('pin_locked_at'),
  isActive: boolean('is_active').notNull().default(true),
  position: integer('position').notNull(),
  version: integer('version').notNull().default(1),
  ...timestamps,
});

export const categoryJudge = pgTable(
  'category_judge',
  { categoryId: uuid('category_id').notNull(), judgeId: uuid('judge_id').notNull() },
  (t) => [primaryKey({ columns: [t.categoryId, t.judgeId] })],
);

// §2.11–2.19 – urządzenia i ocenianie
export const device = pgTable('device', {
  id: id(),
  tournamentId: uuid('tournament_id').notNull(),
  name: varchar('name', { length: 60 }).notNull(),
  platform: varchar('platform', { length: 10 }).$type<'ios' | 'android'>().notNull(),
  model: varchar('model', { length: 100 }),
  osVersion: varchar('os_version', { length: 40 }),
  appVersion: varchar('app_version', { length: 40 }),
  secretHash: bytea('secret_hash').notNull(),
  pepper: bytea('pepper').notNull(),
  pairedAt: ts('paired_at').notNull().defaultNow(),
  pairedBy: uuid('paired_by'),
  revokedAt: ts('revoked_at'),
  lastSeenAt: ts('last_seen_at'),
  lastSyncAt: ts('last_sync_at'),
  lastSyncCursor: bigint('last_sync_cursor', { mode: 'number' }),
  pendingMutations: integer('pending_mutations').notNull().default(0),
  activeJudgeId: uuid('active_judge_id'),
  batteryLevel: smallint('battery_level'),
  ...timestamps,
});

export const pairingCode = pgTable('pairing_code', {
  id: id(),
  tournamentId: uuid('tournament_id').notNull(),
  codeHash: bytea('code_hash').notNull(),
  expiresAt: ts('expires_at').notNull(),
  maxUses: smallint('max_uses').notNull().default(10),
  useCount: smallint('use_count').notNull().default(0),
  createdBy: uuid('created_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const judgeSession = pgTable('judge_session', {
  id: uuid('id').primaryKey(),
  judgeId: uuid('judge_id').notNull(),
  deviceId: uuid('device_id').notNull(),
  authMode: authMode('auth_mode').notNull(),
  pinVersion: integer('pin_version').notNull(),
  startedAt: ts('started_at').notNull().defaultNow(),
  endedAt: ts('ended_at'),
  endedReason: varchar('ended_reason', { length: 20 }),
});

export const scoreSheet = pgTable('score_sheet', {
  id: uuid('id').primaryKey(),
  categoryId: uuid('category_id').notNull(),
  entryId: uuid('entry_id').notNull(),
  judgeId: uuid('judge_id').notNull(),
  revision: integer('revision').notNull().default(1),
  criteriaTotalHundredths: integer('criteria_total_hundredths').notNull(),
  penaltyTotalHundredths: integer('penalty_total_hundredths').notNull(),
  totalHundredths: integer('total_hundredths').notNull(),
  clientTotalHundredths: integer('client_total_hundredths'),
  comment: varchar('comment', { length: 500 }).notNull().default(''),
  submittedAt: ts('submitted_at').notNull().defaultNow(),
  clientSubmittedAt: ts('client_submitted_at'),
  deviceId: uuid('device_id'),
  judgeSessionId: uuid('judge_session_id'),
  authMode: authMode('auth_mode').notNull(),
  lastMutationId: uuid('last_mutation_id'),
});

export const scoreValue = pgTable(
  'score_value',
  {
    scoreSheetId: uuid('score_sheet_id').notNull(),
    criterionId: uuid('criterion_id').notNull(),
    valueTenths: smallint('value_tenths').notNull(),
  },
  (t) => [primaryKey({ columns: [t.scoreSheetId, t.criterionId] })],
);

export const scorePenalty = pgTable(
  'score_penalty',
  {
    scoreSheetId: uuid('score_sheet_id').notNull(),
    penaltyTypeId: uuid('penalty_type_id').notNull(),
    count: smallint('count').notNull(),
  },
  (t) => [primaryKey({ columns: [t.scoreSheetId, t.penaltyTypeId] })],
);

export const scoreSheetRevision = pgTable('score_sheet_revision', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  scoreSheetId: uuid('score_sheet_id').notNull(),
  revision: integer('revision').notNull(),
  snapshot: jsonb('snapshot').notNull(),
  actorType: actorType('actor_type').notNull(),
  judgeSessionId: uuid('judge_session_id'),
  deviceId: uuid('device_id'),
  mutationId: uuid('mutation_id'),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const rejectedSubmission = pgTable('rejected_submission', {
  id: id(),
  mutationId: uuid('mutation_id').notNull(),
  tournamentId: uuid('tournament_id').notNull(),
  categoryId: uuid('category_id'),
  entryId: uuid('entry_id'),
  judgeId: uuid('judge_id'),
  deviceId: uuid('device_id'),
  payload: jsonb('payload').notNull(),
  reason: rejectionReason('reason').notNull(),
  receivedAt: ts('received_at').notNull().defaultNow(),
  resolution: rejectionResolution('resolution').notNull().default('PENDING'),
  resolvedBy: uuid('resolved_by'),
  resolvedAt: ts('resolved_at'),
});

export const categoryResult = pgTable(
  'category_result',
  {
    categoryId: uuid('category_id').notNull(),
    entryId: uuid('entry_id').notNull(),
    sheetCount: smallint('sheet_count').notNull(),
    expectedCount: smallint('expected_count').notNull(),
    sumHundredths: integer('sum_hundredths').notNull(),
    officialHundredths: integer('official_hundredths'),
    tieBreakHundredths: integer('tie_break_hundredths'),
    penaltyMeanHundredths: integer('penalty_mean_hundredths'),
    rank: smallint('rank'),
    isComplete: boolean('is_complete').notNull(),
    resultsVersion: integer('results_version').notNull(),
    computedAt: ts('computed_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.categoryId, t.entryId] })],
);

// §2.20–2.24 – tabele techniczne
export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).notNull(),
  occurredAt: ts('occurred_at').notNull().defaultNow(),
  tournamentId: uuid('tournament_id'),
  actorType: actorType('actor_type').notNull(),
  actorId: uuid('actor_id'),
  deviceId: uuid('device_id'),
  action: varchar('action', { length: 60 }).notNull(),
  entityType: varchar('entity_type', { length: 40 }),
  entityId: uuid('entity_id'),
  before: jsonb('before'),
  after: jsonb('after'),
  requestId: uuid('request_id'),
  ip: inet('ip'),
});

export const changeLog = pgTable('change_log', {
  seq: bigserial('seq', { mode: 'number' }).primaryKey(),
  tournamentId: uuid('tournament_id').notNull(),
  entityType: varchar('entity_type', { length: 30 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  op: char('op', { length: 1 }).$type<'U' | 'D'>().notNull(),
  audience: varchar('audience', { length: 50 }).notNull().default('ALL'),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const processedMutation = pgTable('processed_mutation', {
  mutationId: uuid('mutation_id').primaryKey(),
  deviceId: uuid('device_id'),
  requestHash: char('request_hash', { length: 64 }).notNull(),
  result: jsonb('result').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const domainEvent = pgTable('domain_event', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tournamentId: uuid('tournament_id'),
  /** Adresat zdarzeń pokoju `device:{id}` (migracja 0007). */
  deviceId: uuid('device_id'),
  type: varchar('type', { length: 40 }).notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  publishedAt: ts('published_at'),
});

export const exportJob = pgTable('export_job', {
  id: id(),
  tournamentId: uuid('tournament_id').notNull(),
  scope: exportScope('scope').notNull(),
  categoryId: uuid('category_id'),
  format: exportFormat('format').notNull().default('PDF'),
  status: exportStatus('status').notNull().default('QUEUED'),
  resultsVersions: jsonb('results_versions'),
  resultsHash: char('results_hash', { length: 64 }),
  s3Key: text('s3_key'),
  createdBy: uuid('created_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
  finishedAt: ts('finished_at'),
  expiresAt: ts('expires_at'),
  error: text('error'),
});
