import type { Db } from '../local/LocalDb';

/** Wiersz `sync_meta` (06-offline §2). */
export interface SyncMeta {
  tournamentId: string | null;
  cursor: number;
  lastFullSnapshotAt: string | null;
  lastPushAt: string | null;
  lastPullAt: string | null;
  lastSyncServerTime: string | null;
  lastSyncMonotonicMs: number | null;
  serverTimeOffsetMs: number;
  schemaVersion: number | null;
  tournamentFinishedAt: string | null;
}

const COLUMN: Record<keyof SyncMeta, string> = {
  tournamentId: 'tournament_id',
  cursor: 'cursor',
  lastFullSnapshotAt: 'last_full_snapshot_at',
  lastPushAt: 'last_push_at',
  lastPullAt: 'last_pull_at',
  lastSyncServerTime: 'last_sync_server_time',
  lastSyncMonotonicMs: 'last_sync_monotonic_ms',
  serverTimeOffsetMs: 'server_time_offset_ms',
  schemaVersion: 'schema_version',
  tournamentFinishedAt: 'tournament_finished_at',
};

export function readMeta(db: Db): SyncMeta {
  const select = Object.entries(COLUMN)
    .map(([key, col]) => `${col} AS ${key}`)
    .join(', ');
  return db.getFirstSync<SyncMeta>(`SELECT ${select} FROM sync_meta WHERE id = 1`) as SyncMeta;
}

export function writeMeta(db: Db, patch: Partial<SyncMeta>): void {
  const keys = Object.keys(patch) as (keyof SyncMeta)[];
  if (!keys.length) return;
  db.runSync(
    `UPDATE sync_meta SET ${keys.map((k) => `${COLUMN[k]} = ?`).join(', ')} WHERE id = 1`,
    keys.map((k) => patch[k] ?? null) as never,
  );
}

/** Przesunięcie zegara serwera względem urządzenia (wyłącznie do wyświetlania – 06-offline §3.4). */
export const serverOffset = (serverTime: string, deviceNow: number) => Date.parse(serverTime) - deviceNow;
