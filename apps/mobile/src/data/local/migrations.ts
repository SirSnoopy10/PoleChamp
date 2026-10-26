import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Schemat danych offline tabletu (06-offline §2, IMP-350). Wartości punktowe jako liczby całkowite
 * (dziesiąte / setne – jak `@polechamp/scoring`). Dane lokalne (arkusze, sesje, szkice, outbox) nie mają
 * kluczy obcych do danych referencyjnych: migawka podmienia referencje bez ich usuwania (IMP-351).
 */
const SCHEMA_V2 = `
CREATE TABLE sync_meta (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  tournament_id TEXT,
  cursor INTEGER NOT NULL DEFAULT 0,
  last_full_snapshot_at TEXT,
  last_push_at TEXT,
  last_pull_at TEXT,
  last_sync_server_time TEXT,
  last_sync_monotonic_ms INTEGER,
  server_time_offset_ms INTEGER NOT NULL DEFAULT 0,
  schema_version INTEGER,
  tournament_finished_at TEXT
);
INSERT INTO sync_meta (id) VALUES (1);

CREATE TABLE local_tournament (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  allow_offline_pin_login INTEGER NOT NULL
);

CREATE TABLE local_category (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  style TEXT NOT NULL,
  level TEXT NOT NULL,
  age_group TEXT NOT NULL,
  status TEXT NOT NULL,
  position INTEGER NOT NULL,
  aggregation_method TEXT NOT NULL DEFAULT 'MEAN',
  panel_judge_ids TEXT NOT NULL DEFAULT '[]',
  tie_break_criterion_id TEXT,
  updated_seq INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE local_criterion (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL REFERENCES local_category (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  scale_max INTEGER NOT NULL,
  step_tenths INTEGER NOT NULL,
  weight_tenths INTEGER NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE local_penalty_type (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL REFERENCES local_category (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  points_tenths INTEGER NOT NULL,
  max_occurrences INTEGER NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE local_entry (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL REFERENCES local_category (id) ON DELETE CASCADE,
  start_number INTEGER NOT NULL,
  start_order INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  club TEXT,
  status TEXT NOT NULL
);
CREATE INDEX local_entry_category_order ON local_entry (category_id, start_order);

CREATE TABLE local_judge (
  id TEXT PRIMARY KEY NOT NULL,
  full_name TEXT NOT NULL,
  initials TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_active INTEGER NOT NULL,
  pin_locked INTEGER NOT NULL,
  pin_version INTEGER NOT NULL,
  wrapped_verifier TEXT,
  pin_offline_salt TEXT,
  pin_iterations INTEGER,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  lock_level INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT
);

CREATE TABLE local_judge_session (
  id TEXT PRIMARY KEY NOT NULL,
  judge_id TEXT NOT NULL,
  auth_mode TEXT NOT NULL CHECK (auth_mode IN ('ONLINE_PIN', 'OFFLINE_PIN')),
  pin_version INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  ended_at TEXT,
  end_reason TEXT,
  server_token_present INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX local_judge_session_judge ON local_judge_session (judge_id, ended_at);

CREATE TABLE local_score_sheet (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  judge_id TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  server_revision INTEGER NOT NULL DEFAULT 0,
  sync_state TEXT NOT NULL CHECK (sync_state IN ('PENDING', 'SYNCED', 'REJECTED')),
  reject_code TEXT,
  total_hundredths INTEGER NOT NULL,
  server_total_hundredths INTEGER,
  comment TEXT NOT NULL DEFAULT '',
  submitted_at_local TEXT NOT NULL
);
CREATE INDEX local_score_sheet_judge_category ON local_score_sheet (judge_id, category_id);
CREATE UNIQUE INDEX local_score_sheet_entry_judge ON local_score_sheet (entry_id, judge_id);

CREATE TABLE local_score_value (
  score_sheet_id TEXT NOT NULL REFERENCES local_score_sheet (id) ON DELETE CASCADE,
  criterion_id TEXT NOT NULL,
  value_tenths INTEGER NOT NULL,
  PRIMARY KEY (score_sheet_id, criterion_id)
);

CREATE TABLE local_score_penalty (
  score_sheet_id TEXT NOT NULL REFERENCES local_score_sheet (id) ON DELETE CASCADE,
  penalty_type_id TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (score_sheet_id, penalty_type_id)
);

CREATE TABLE local_draft (
  judge_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (judge_id, entry_id)
);

CREATE TABLE outbox (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  mutation_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  judge_id TEXT NOT NULL,
  score_sheet_id TEXT,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  last_error TEXT,
  state TEXT NOT NULL CHECK (state IN ('QUEUED', 'IN_FLIGHT', 'DONE', 'FAILED_PERMANENT')),
  done_at INTEGER
);
CREATE INDEX outbox_state_seq ON outbox (state, seq);
`;

/** Migracje lokalnej bazy tabletu (`PRAGMA user_version`); każda wersja w jednej transakcji. */
export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
  SCHEMA_V2,
];

/** Wersja schematu danych offline (`sync_meta.schema_version`, IMP-352 krok 3). */
export const SCHEMA_VERSION = MIGRATIONS.length;

export function migrate(db: Pick<SQLiteDatabase, 'execSync' | 'getFirstSync'>): number {
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  for (; version < MIGRATIONS.length; version++) {
    db.execSync('BEGIN');
    try {
      db.execSync(`${MIGRATIONS[version]}\nPRAGMA user_version = ${version + 1};`);
      db.execSync('COMMIT');
    } catch (error) {
      db.execSync('ROLLBACK');
      throw error;
    }
  }
  return version;
}
