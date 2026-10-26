import type { Db } from '../local/LocalDb';
import { upsertScoreSheet } from '../local/scoreSheets';
import type { JudgeSessionEndReason, SyncEvent } from './events';

/** Punkty (do 2 miejsc) → liczby całkowite jak w `@polechamp/scoring`. */
export const toTenths = (v: number) => Math.round(v * 10);
export const toHundredths = (v: number) => Math.round(v * 100);

export interface TournamentData {
  id: string;
  name: string;
  status: string;
  allowOfflinePinLogin: boolean;
}

export interface CategoryData {
  id: string;
  name: string;
  style: string;
  level: string;
  ageGroup: string;
  position: number;
  status: string;
  aggregationMethod?: string;
  tieBreakCriterionId: string | null;
  panelJudgeIds: string[];
}

export interface CriterionData {
  id: string;
  name: string;
  description?: string | null;
  scaleMax: number;
  step: number;
  weight: number;
  position: number;
}

export interface PenaltyTypeData {
  id: string;
  name: string;
  points: number;
  maxOccurrences: number;
  position: number;
}

export interface EntryData {
  id: string;
  startNumber: number;
  startOrder: number;
  fullName: string;
  club?: string | null;
  status: string;
}

export interface JudgeData {
  id: string;
  fullName: string;
  initials: string;
  isActive: boolean;
  pinLocked: boolean;
  position: number;
  pinVersion: number;
  pinVerifier: { iterations: number; salt: string; wrapped: string } | null;
}

/** Arkusz z serwera (`JudgeScoreSheet` / zmiana `score_sheet`, TL-49). */
export interface ServerSheet {
  scoreSheetId: string;
  judgeId: string;
  categoryId: string;
  entryId: string;
  criteria: { criterionId: string; value: number }[];
  penalties: { penaltyTypeId: string; count: number }[];
  comment: string;
  revision: number;
  total: number;
  updatedAt: string;
}

/** Wstawianie paczkami (`INSERT … VALUES (…), (…)` po `size` wierszy – IMP-351 krok 5). */
export function insertMany(
  db: Db,
  table: string,
  columns: readonly string[],
  rows: readonly unknown[][],
  size = 500,
): void {
  const tuple = `(${columns.map(() => '?').join(', ')})`;
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    db.runSync(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${chunk.map(() => tuple).join(', ')}`,
      chunk.flat() as never,
    );
  }
}

export const TOURNAMENT_COLUMNS = ['id', 'name', 'status', 'allow_offline_pin_login'] as const;
export const tournamentRow = (t: TournamentData) => [t.id, t.name, t.status, t.allowOfflinePinLogin ? 1 : 0];

export const CATEGORY_COLUMNS = [
  'id',
  'name',
  'style',
  'level',
  'age_group',
  'status',
  'position',
  'aggregation_method',
  'panel_judge_ids',
  'tie_break_criterion_id',
  'updated_seq',
] as const;
export const categoryRow = (c: CategoryData, seq: number) => [
  c.id,
  c.name,
  c.style,
  c.level,
  c.ageGroup,
  c.status,
  c.position,
  c.aggregationMethod ?? 'MEAN',
  JSON.stringify(c.panelJudgeIds),
  c.tieBreakCriterionId,
  seq,
];

export const CRITERION_COLUMNS = [
  'id',
  'category_id',
  'name',
  'description',
  'scale_max',
  'step_tenths',
  'weight_tenths',
  'position',
] as const;
export const criterionRow = (categoryId: string, c: CriterionData) => [
  c.id,
  categoryId,
  c.name,
  c.description ?? null,
  c.scaleMax,
  toTenths(c.step),
  toTenths(c.weight),
  c.position,
];

export const PENALTY_COLUMNS = [
  'id',
  'category_id',
  'name',
  'points_tenths',
  'max_occurrences',
  'position',
] as const;
export const penaltyRow = (categoryId: string, p: PenaltyTypeData) => [
  p.id,
  categoryId,
  p.name,
  toTenths(p.points),
  p.maxOccurrences,
  p.position,
];

export const ENTRY_COLUMNS = [
  'id',
  'category_id',
  'start_number',
  'start_order',
  'full_name',
  'club',
  'status',
] as const;
export const entryRow = (categoryId: string, e: EntryData) => [
  e.id,
  categoryId,
  e.startNumber,
  e.startOrder,
  e.fullName,
  e.club ?? null,
  e.status,
];

/** `INSERT … ON CONFLICT DO UPDATE` (nie `REPLACE` – ten usuwa wiersz i kaskadowo jego dzieci). */
function upsert(db: Db, table: string, columns: readonly string[], row: unknown[]) {
  const updates = columns
    .filter((c) => c !== 'id')
    .map((c) => `${c} = excluded.${c}`)
    .join(', ');
  db.runSync(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})
     ON CONFLICT (id) DO UPDATE SET ${updates}`,
    row as never,
  );
}

export const putTournament = (db: Db, t: TournamentData) =>
  upsert(db, 'local_tournament', TOURNAMENT_COLUMNS, tournamentRow(t));

/** Zmiana kategorii; zwraca zdarzenia (status, lista startowa przy zmianie panelu – TC-SYNC-038). */
export function putCategory(db: Db, c: CategoryData, seq: number): SyncEvent[] {
  const prev = db.getFirstSync<{ status: string; panel_judge_ids: string }>(
    'SELECT status, panel_judge_ids FROM local_category WHERE id = ?',
    c.id,
  );
  upsert(db, 'local_category', CATEGORY_COLUMNS, categoryRow(c, seq));
  const events: SyncEvent[] = [];
  if (!prev || prev.status !== c.status) {
    events.push({ type: 'categoryStatusChanged', categoryId: c.id, status: c.status });
  }
  if (!prev || prev.panel_judge_ids !== JSON.stringify(c.panelJudgeIds))
    events.push({ type: 'judgesChanged' });
  return events;
}

export const putCriterion = (db: Db, categoryId: string, c: CriterionData) =>
  upsert(db, 'local_criterion', CRITERION_COLUMNS, criterionRow(categoryId, c));

export const putPenaltyType = (db: Db, categoryId: string, p: PenaltyTypeData) =>
  upsert(db, 'local_penalty_type', PENALTY_COLUMNS, penaltyRow(categoryId, p));

export const putEntry = (db: Db, categoryId: string, e: EntryData) =>
  upsert(db, 'local_entry', ENTRY_COLUMNS, entryRow(categoryId, e));

/** Zakończenie otwartych sesji sędziego (wszystkich albo tylko `OFFLINE_PIN`). */
export function endJudgeSessions(
  db: Db,
  judgeId: string,
  reason: JudgeSessionEndReason,
  now: string,
  onlyOffline = false,
): boolean {
  const { changes } = db.runSync(
    `UPDATE local_judge_session SET ended_at = ?, end_reason = ?
     WHERE judge_id = ? AND ended_at IS NULL ${onlyOffline ? "AND auth_mode = 'OFFLINE_PIN'" : ''}`,
    now,
    reason,
    judgeId,
  );
  return changes > 0;
}

interface JudgeState {
  pin_version: number;
  pin_locked: number;
  is_active: number;
}

/**
 * Sędzia z migawki lub zmiany. Lokalne liczniki prób PIN zostają (IMP-351 krok 3); nowa wersja PIN-u
 * zeruje liczniki i kończy sesję `OFFLINE_PIN`, blokada PIN-u lub dezaktywacja – każdą sesję (TC-STATE-010).
 */
export function putJudge(db: Db, j: JudgeData, now: string): SyncEvent[] {
  const prev = db.getFirstSync<JudgeState>(
    'SELECT pin_version, pin_locked, is_active FROM local_judge WHERE id = ?',
    j.id,
  );
  db.runSync(
    `INSERT INTO local_judge (id, full_name, initials, position, is_active, pin_locked, pin_version,
       wrapped_verifier, pin_offline_salt, pin_iterations)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET full_name = excluded.full_name, initials = excluded.initials,
       position = excluded.position, is_active = excluded.is_active, pin_locked = excluded.pin_locked,
       pin_version = excluded.pin_version, wrapped_verifier = excluded.wrapped_verifier,
       pin_offline_salt = excluded.pin_offline_salt, pin_iterations = excluded.pin_iterations`,
    j.id,
    j.fullName,
    j.initials,
    j.position,
    j.isActive ? 1 : 0,
    j.pinLocked ? 1 : 0,
    j.pinVersion,
    j.pinVerifier?.wrapped ?? null,
    j.pinVerifier?.salt ?? null,
    j.pinVerifier?.iterations ?? null,
  );
  const events: SyncEvent[] = [];
  const end = (reason: JudgeSessionEndReason, onlyOffline = false) => {
    if (endJudgeSessions(db, j.id, reason, now, onlyOffline)) {
      events.push({ type: 'judgeSessionEnded', judgeId: j.id, reason });
    }
  };
  if (prev && prev.pin_version !== j.pinVersion) {
    db.runSync(
      'UPDATE local_judge SET failed_attempts = 0, lock_level = 0, locked_until = NULL WHERE id = ?',
      j.id,
    );
    end('PIN_CHANGED', true);
  }
  if (!j.isActive) end('JUDGE_INACTIVE');
  if (j.pinLocked) {
    end('PIN_LOCKED');
    if (!prev?.pin_locked) events.push({ type: 'judgeLocked', judgeId: j.id });
  }
  if (!prev || prev.is_active !== (j.isActive ? 1 : 0) || prev.pin_locked !== (j.pinLocked ? 1 : 0)) {
    events.push({ type: 'judgesChanged' });
  }
  return events;
}

export function deleteJudge(db: Db, judgeId: string, now: string): SyncEvent[] {
  db.runSync('DELETE FROM local_judge WHERE id = ?', judgeId);
  const events: SyncEvent[] = [{ type: 'judgesChanged' }];
  if (endJudgeSessions(db, judgeId, 'JUDGE_REMOVED', now)) {
    events.push({ type: 'judgeSessionEnded', judgeId, reason: 'JUDGE_REMOVED' });
  }
  return events;
}

/**
 * Arkusz z serwera (audience `JUDGE`/`DEVICE` – TL-49). Arkusz czekający lokalnie na wysyłkę (`PENDING`)
 * zachowuje treść – zmienia się tylko znana rewizja serwera; pozostałe są nadpisywane wersją serwera.
 */
export function putServerSheet(db: Db, s: ServerSheet): void {
  const local = db.getFirstSync<{ id: string; sync_state: string; server_revision: number }>(
    'SELECT id, sync_state, server_revision FROM local_score_sheet WHERE entry_id = ? AND judge_id = ?',
    s.entryId,
    s.judgeId,
  );
  if (local?.sync_state === 'PENDING') {
    if (local.id === s.scoreSheetId && s.revision > local.server_revision) {
      db.runSync(
        'UPDATE local_score_sheet SET server_revision = ?, server_total_hundredths = ? WHERE id = ?',
        s.revision,
        toHundredths(s.total),
        local.id,
      );
    }
    return;
  }
  if (local && local.id !== s.scoreSheetId)
    db.runSync('DELETE FROM local_score_sheet WHERE id = ?', local.id);
  upsertScoreSheet(db, {
    id: s.scoreSheetId,
    categoryId: s.categoryId,
    entryId: s.entryId,
    judgeId: s.judgeId,
    revision: s.revision,
    serverRevision: s.revision,
    syncState: 'SYNCED',
    rejectCode: null,
    totalHundredths: toHundredths(s.total),
    serverTotalHundredths: toHundredths(s.total),
    comment: s.comment,
    submittedAtLocal: s.updatedAt,
    values: s.criteria.map((c) => ({ criterionId: c.criterionId, valueTenths: toTenths(c.value) })),
    penalties: s.penalties.map((p) => ({ penaltyTypeId: p.penaltyTypeId, count: p.count })),
  });
}
