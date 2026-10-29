import type { Db } from '../local/LocalDb';

/**
 * Odczyty ekranów sędziego z lokalnej SQLite (ADR-004 – żaden ekran nie czeka na sieć).
 * Zapytania o arkusze zawsze z warunkiem `judge_id` (FR-610, TC-STATE-008).
 */

export interface LocalTournament {
  id: string;
  name: string;
  status: string;
  allowOfflinePinLogin: boolean;
}

export function readTournament(db: Db): LocalTournament | null {
  const row = db.getFirstSync<{ id: string; name: string; status: string; allow: number }>(
    'SELECT id, name, status, allow_offline_pin_login AS allow FROM local_tournament LIMIT 1',
  );
  return row
    ? { id: row.id, name: row.name, status: row.status, allowOfflinePinLogin: row.allow === 1 }
    : null;
}

export interface LocalJudge {
  id: string;
  fullName: string;
  initials: string;
  position: number;
  isActive: boolean;
  pinLocked: boolean;
  pinVersion: number;
  wrappedVerifier: string | null;
  pinOfflineSalt: string | null;
  pinIterations: number | null;
  failedAttempts: number;
  lockLevel: number;
  lockedUntil: string | null;
}

interface JudgeRow {
  id: string;
  full_name: string;
  initials: string;
  position: number;
  is_active: number;
  pin_locked: number;
  pin_version: number;
  wrapped_verifier: string | null;
  pin_offline_salt: string | null;
  pin_iterations: number | null;
  failed_attempts: number;
  lock_level: number;
  locked_until: string | null;
}

const judgeOf = (r: JudgeRow): LocalJudge => ({
  id: r.id,
  fullName: r.full_name,
  initials: r.initials,
  position: r.position,
  isActive: r.is_active === 1,
  pinLocked: r.pin_locked === 1,
  pinVersion: r.pin_version,
  wrappedVerifier: r.wrapped_verifier,
  pinOfflineSalt: r.pin_offline_salt,
  pinIterations: r.pin_iterations,
  failedAttempts: r.failed_attempts,
  lockLevel: r.lock_level,
  lockedUntil: r.locked_until,
});

/** Aktywni sędziowie turnieju w kolejności `position` (SCR-JDG-01). */
export const listActiveJudges = (db: Db): LocalJudge[] =>
  db.getAllSync<JudgeRow>('SELECT * FROM local_judge WHERE is_active = 1 ORDER BY position, id').map(judgeOf);

export function readJudge(db: Db, judgeId: string): LocalJudge | null {
  const row = db.getFirstSync<JudgeRow>('SELECT * FROM local_judge WHERE id = ?', judgeId);
  return row ? judgeOf(row) : null;
}

export type CategoryStatus = 'DRAFT' | 'IN_PROGRESS' | 'LOCKED';

export interface JudgeCategory {
  id: string;
  name: string;
  style: string;
  level: string;
  status: CategoryStatus;
  /** Aktywne starty kategorii (wycofane nie są pokazywane – FR-404). */
  total: number;
  /** Oceny tego sędziego wysłane lub czekające (TL-46); odrzucone się nie liczą (UX-35). */
  scored: number;
}

interface CategoryRow {
  id: string;
  name: string;
  style: string;
  level: string;
  status: CategoryStatus;
  panel_judge_ids: string;
  total: number;
  scored: number;
}

/**
 * Kategorie widoczne dla sędziego (TC-STATE-009): `W przygotowaniu` – każdy aktywny sędzia,
 * `Trwa`/`Zakończona` – tylko sędziowie z panelu kategorii. Kolejność `position` (jak u organizatora).
 */
export function visibleCategories(db: Db, judgeId: string): JudgeCategory[] {
  return db
    .getAllSync<CategoryRow>(
      `SELECT c.id, c.name, c.style, c.level, c.status, c.panel_judge_ids,
         (SELECT COUNT(*) FROM local_entry e WHERE e.category_id = c.id AND e.status = 'ACTIVE') AS total,
         (SELECT COUNT(*) FROM local_score_sheet s JOIN local_entry e ON e.id = s.entry_id
           WHERE s.category_id = c.id AND s.judge_id = ? AND e.status = 'ACTIVE'
             AND s.sync_state <> 'REJECTED') AS scored
       FROM local_category c ORDER BY c.position, c.id`,
      judgeId,
    )
    .filter((c) => c.status === 'DRAFT' || (JSON.parse(c.panel_judge_ids) as string[]).includes(judgeId))
    .map(({ panel_judge_ids: _panel, ...c }) => c);
}

export function readCategory(db: Db, judgeId: string, categoryId: string): JudgeCategory | null {
  return visibleCategories(db, judgeId).find((c) => c.id === categoryId) ?? null;
}

export interface QueueEntry {
  id: string;
  startNumber: number;
  fullName: string;
  club: string | null;
  /** Sędzia ma szkic tej oceny (`local_draft`, UX-14); bez `judgeId` w zapytaniu – `false`. */
  hasDraft?: boolean;
}

export interface LocalEntry extends QueueEntry {
  categoryId: string;
  status: 'ACTIVE' | 'WITHDRAWN';
}

export const readEntry = (db: Db, entryId: string): LocalEntry | null =>
  db.getFirstSync<LocalEntry>(
    `SELECT id, category_id AS categoryId, start_number AS startNumber, full_name AS fullName, club, status
     FROM local_entry WHERE id = ?`,
    entryId,
  );

/** Kolejka kategorii: aktywne starty w kolejności listy startowej (SCR-JDG-04). */
export const listQueue = (db: Db, categoryId: string, judgeId?: string): QueueEntry[] =>
  db
    .getAllSync<QueueEntry & { draft: number }>(
      `SELECT e.id, e.start_number AS startNumber, e.full_name AS fullName, e.club,
         EXISTS (SELECT 1 FROM local_draft d WHERE d.judge_id = ? AND d.entry_id = e.id) AS draft
       FROM local_entry e
       WHERE e.category_id = ? AND e.status = 'ACTIVE' ORDER BY e.start_order, e.start_number`,
      judgeId ?? '',
      categoryId,
    )
    .map(({ draft, ...e }) => ({ ...e, hasDraft: draft === 1 }));

export interface RejectedSheet {
  entryId: string;
  categoryId: string;
  startNumber: number;
  fullName: string;
  code: string;
}

/** Odrzucone oceny sędziego z powodem (popover SCR-JDG-07). */
export const listRejected = (db: Db, judgeId: string): RejectedSheet[] =>
  db.getAllSync<RejectedSheet>(
    `SELECT s.entry_id AS entryId, s.category_id AS categoryId, e.start_number AS startNumber,
       e.full_name AS fullName, COALESCE(s.reject_code, 'INTERNAL') AS code
     FROM local_score_sheet s JOIN local_entry e ON e.id = s.entry_id
     WHERE s.judge_id = ? AND s.sync_state = 'REJECTED' ORDER BY e.start_number`,
    judgeId,
  );

export interface StuckSheet {
  entryId: string;
  categoryId: string;
  startNumber: number;
  fullName: string;
  attempts: number;
}

/** Oceny bez rozstrzygnięcia po `minAttempts` próbach wysyłki (UX-01) – „Wymaga uwagi” w popoverze. */
export const listStuck = (db: Db, judgeId: string, minAttempts: number): StuckSheet[] =>
  db.getAllSync<StuckSheet>(
    `SELECT s.entry_id AS entryId, s.category_id AS categoryId, e.start_number AS startNumber,
       e.full_name AS fullName, o.attempts AS attempts
     FROM outbox o JOIN local_score_sheet s ON s.id = o.score_sheet_id JOIN local_entry e ON e.id = s.entry_id
     WHERE o.judge_id = ? AND o.state IN ('QUEUED', 'IN_FLIGHT') AND o.attempts >= ?
     ORDER BY e.start_number`,
    judgeId,
    minAttempts,
  );

export interface FormCriterion {
  id: string;
  name: string;
  description: string | null;
  scaleMax: number;
  stepTenths: number;
  weightTenths: number;
}

export interface FormPenalty {
  id: string;
  name: string;
  pointsTenths: number;
  maxOccurrences: number;
}

/** Konfiguracja formularza oceny kategorii (kryteria i kary wg `position`). */
export function readCategoryConfig(db: Db, categoryId: string) {
  return {
    criteria: db.getAllSync<FormCriterion>(
      `SELECT id, name, description, scale_max AS scaleMax, step_tenths AS stepTenths,
         weight_tenths AS weightTenths FROM local_criterion WHERE category_id = ? ORDER BY position, id`,
      categoryId,
    ),
    penalties: db.getAllSync<FormPenalty>(
      `SELECT id, name, points_tenths AS pointsTenths, max_occurrences AS maxOccurrences
       FROM local_penalty_type WHERE category_id = ? ORDER BY position, id`,
      categoryId,
    ),
  };
}
