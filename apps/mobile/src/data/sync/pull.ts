import { ChangesResponse } from '@polechamp/contracts';
import { ApiError, unwrap, type ApiClient } from '../api';
import type { Db, LocalDb } from '../local/LocalDb';
import { SCHEMA_VERSION } from '../local/migrations';
import {
  deleteJudge,
  putCategory,
  putCriterion,
  putEntry,
  putJudge,
  putPenaltyType,
  putServerSheet,
  putTournament,
  type CategoryData,
  type CriterionData,
  type EntryData,
  type JudgeData,
  type PenaltyTypeData,
  type ServerSheet,
  type TournamentData,
} from './apply';
import { syncMark, type SyncClock } from './clock';
import { syncEvents, type SyncEvent } from './events';
import { readMeta, writeMeta } from './meta';
import { applySnapshot, fetchSnapshot, finishedAt } from './snapshot';

export const PULL_PAGE_SIZE = 500;

export interface SyncDeps {
  api: ApiClient;
  local: LocalDb;
  clock: SyncClock;
}

type ChangePage = ReturnType<typeof ChangesResponse.parse>;
type Change = ChangePage['changes'][number];

/** Kolejność stosowania w obrębie strony: rodzice przed dziećmi (klucze obce), usunięcia odwrotnie. */
const ORDER: Change['entityType'][] = [
  'tournament',
  'category',
  'criterion',
  'penalty_type',
  'entry',
  'athlete',
  'judge',
  'score_sheet',
];

/** Pełna migawka i zdarzenia dla ekranów (IMP-351; także `CURSOR_EXPIRED` i nowy schemat lokalny). */
export async function syncSnapshot(deps: SyncDeps): Promise<void> {
  const snap = await fetchSnapshot(deps.api);
  syncEvents.emit(await applySnapshot(deps.local, snap, deps.clock));
}

/** Zastosowanie jednej strony zmian (wywołujący otwiera transakcję) – IMP-352 kroki 2, 4–6. */
export function applyChanges(db: Db, page: ChangePage, now: string): SyncEvent[] {
  const events: SyncEvent[] = [];
  const rank = (c: Change) => ORDER.indexOf(c.entityType);
  const upserts = page.changes.filter((c) => c.op === 'U').sort((a, b) => rank(a) - rank(b));
  const deletes = page.changes.filter((c) => c.op === 'D').sort((a, b) => rank(b) - rank(a));
  const categoryOfEntry = (id: string) =>
    db.getFirstSync<{ category_id: string }>('SELECT category_id FROM local_entry WHERE id = ?', id)
      ?.category_id;
  const listChanged = (categoryId: string | undefined) => {
    if (categoryId) events.push({ type: 'startListChanged', categoryId });
  };

  for (const { entityType, entity, seq } of upserts) {
    const e = entity as Record<string, unknown> & { id: string };
    const categoryId = e.categoryId as string;
    switch (entityType) {
      case 'tournament': {
        const t = e as unknown as TournamentData;
        putTournament(db, t);
        writeMeta(db, { tournamentFinishedAt: finishedAt(db, t.status, now) });
        events.push({ type: 'tournamentChanged', status: t.status });
        break;
      }
      case 'category':
        events.push(...putCategory(db, e as unknown as CategoryData, seq));
        break;
      case 'criterion':
        putCriterion(db, categoryId, e as unknown as CriterionData);
        break;
      case 'penalty_type':
        putPenaltyType(db, categoryId, e as unknown as PenaltyTypeData);
        break;
      case 'entry':
        putEntry(db, categoryId, e as unknown as EntryData);
        listChanged(categoryId);
        break;
      case 'athlete':
        for (const entryId of (e.entryIds as string[] | undefined) ?? []) {
          db.runSync(
            'UPDATE local_entry SET full_name = ?, club = ? WHERE id = ?',
            e.fullName as string,
            (e.club as string | null | undefined) ?? null,
            entryId,
          );
          listChanged(categoryOfEntry(entryId));
        }
        break;
      case 'judge':
        events.push(...putJudge(db, e as unknown as JudgeData, now));
        break;
      case 'score_sheet': {
        const s = e as unknown as ServerSheet;
        putServerSheet(db, s);
        events.push({ type: 'sheetsChanged', judgeIds: [s.judgeId] });
        break;
      }
    }
  }

  for (const { entityType, entity } of deletes) {
    const { id } = entity;
    switch (entityType) {
      case 'category':
        db.runSync('DELETE FROM local_category WHERE id = ?', id);
        events.push({ type: 'categoryStatusChanged', categoryId: id, status: 'DELETED' });
        break;
      case 'criterion':
        db.runSync('DELETE FROM local_criterion WHERE id = ?', id);
        break;
      case 'penalty_type':
        db.runSync('DELETE FROM local_penalty_type WHERE id = ?', id);
        break;
      case 'entry': {
        const categoryId = categoryOfEntry(id);
        db.runSync('DELETE FROM local_entry WHERE id = ?', id);
        listChanged(categoryId);
        break;
      }
      case 'judge':
        events.push(...deleteJudge(db, id, now));
        break;
      case 'score_sheet':
        db.runSync("DELETE FROM local_score_sheet WHERE id = ? AND sync_state <> 'PENDING'", id);
        break;
      case 'tournament':
      case 'athlete':
        break;
    }
  }
  return dedupe(events);
}

function dedupe(events: SyncEvent[]): SyncEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = JSON.stringify(e);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Pobieranie zmian od kursora (IMP-352): strony po 500 do `hasMore = false`, każda w jednej transakcji
 * z kursorem zapisanym na końcu. `CURSOR_EXPIRED` lub inny schemat lokalny → pełna migawka.
 */
export async function pull(deps: SyncDeps): Promise<void> {
  const meta = readMeta(deps.local.read);
  if (meta.tournamentId === null || meta.schemaVersion !== SCHEMA_VERSION) return syncSnapshot(deps);
  let since = meta.cursor;
  for (;;) {
    let page: ChangePage;
    try {
      page = ChangesResponse.parse(
        await unwrap(
          deps.api.GET('/v1/sync/changes', { params: { query: { since, limit: PULL_PAGE_SIZE } } }),
        ),
      );
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CURSOR_EXPIRED') return syncSnapshot(deps);
      throw error;
    }
    const now = new Date(deps.clock.now()).toISOString();
    const events = await deps.local.tx((db) => {
      const out = applyChanges(db, page, now);
      writeMeta(db, { cursor: page.cursor, lastPullAt: now, ...syncMark(deps.clock) });
      return out;
    });
    syncEvents.emit(events);
    since = page.cursor;
    if (!page.hasMore) return;
  }
}
