import { Snapshot } from '@polechamp/contracts';
import { unwrap, type ApiClient } from '../api';
import type { LocalDb } from '../local/LocalDb';
import { SCHEMA_VERSION } from '../local/migrations';
import {
  CATEGORY_COLUMNS,
  categoryRow,
  CRITERION_COLUMNS,
  criterionRow,
  ENTRY_COLUMNS,
  entryRow,
  insertMany,
  PENALTY_COLUMNS,
  penaltyRow,
  putJudge,
  TOURNAMENT_COLUMNS,
  tournamentRow,
} from './apply';
import { syncMark, type SyncClock } from './clock';
import type { SyncEvent } from './events';
import { readMeta, serverOffset, writeMeta } from './meta';

/** Chwila zakończenia turnieju widziana przez tablet (retencja danych po 7 dniach – 06-offline §7). */
export function finishedAt(db: Parameters<typeof readMeta>[0], status: string, now: string): string | null {
  return status === 'FINISHED' ? (readMeta(db).tournamentFinishedAt ?? now) : null;
}

export type SnapshotData = ReturnType<typeof Snapshot.parse>;

/** `GET /v1/sync/snapshot` (token urządzenia lub sędziego) z walidacją schematem `Snapshot`. */
export async function fetchSnapshot(api: ApiClient): Promise<SnapshotData> {
  return Snapshot.parse(await unwrap(api.GET('/v1/sync/snapshot')));
}

/**
 * Podmiana danych referencyjnych w jednej transakcji (IMP-351). Arkusze (`local_score_*`), szkice,
 * sesje i outbox zostają; sędziowie są aktualizowani wierszami, żeby zachować lokalne liczniki PIN.
 */
export async function applySnapshot(
  local: LocalDb,
  snap: SnapshotData,
  clock: SyncClock,
): Promise<SyncEvent[]> {
  const deviceNow = clock.now();
  const nowIso = new Date(deviceNow).toISOString();
  const events = await local.tx((db) => {
    const out: SyncEvent[] = [];
    db.execSync('DELETE FROM local_category; DELETE FROM local_tournament;');
    insertMany(db, 'local_tournament', TOURNAMENT_COLUMNS, [tournamentRow(snap.tournament)]);
    insertMany(
      db,
      'local_category',
      CATEGORY_COLUMNS,
      snap.categories.map((c) => categoryRow(c, snap.cursor)),
    );
    insertMany(
      db,
      'local_criterion',
      CRITERION_COLUMNS,
      snap.categories.flatMap((c) => c.criteria.map((k) => criterionRow(c.id, k))),
    );
    insertMany(
      db,
      'local_penalty_type',
      PENALTY_COLUMNS,
      snap.categories.flatMap((c) => c.penaltyTypes.map((p) => penaltyRow(c.id, p))),
    );
    insertMany(
      db,
      'local_entry',
      ENTRY_COLUMNS,
      snap.categories.flatMap((c) => c.entries.map((e) => entryRow(c.id, e))),
    );

    const keep = new Set(snap.judges.map((j) => j.id));
    for (const { id } of db.getAllSync<{ id: string }>('SELECT id FROM local_judge')) {
      if (!keep.has(id)) db.runSync('DELETE FROM local_judge WHERE id = ?', id);
    }
    for (const j of snap.judges) out.push(...putJudge(db, j, nowIso));

    writeMeta(db, {
      tournamentId: snap.tournament.id,
      cursor: snap.cursor,
      lastFullSnapshotAt: nowIso,
      lastPullAt: nowIso,
      lastSyncServerTime: snap.serverTime,
      ...syncMark(clock),
      serverTimeOffsetMs: serverOffset(snap.serverTime, deviceNow),
      schemaVersion: SCHEMA_VERSION,
      tournamentFinishedAt: finishedAt(db, snap.tournament.status, nowIso),
    });
    return out;
  });
  return [
    ...events.filter((e) => e.type === 'judgeSessionEnded' || e.type === 'judgeLocked'),
    {
      type: 'snapshotApplied',
    },
  ];
}
