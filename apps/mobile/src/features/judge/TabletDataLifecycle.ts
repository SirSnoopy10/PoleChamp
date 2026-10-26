import { clearDeviceCredentials } from '../../data/auth/deviceAuth';
import { judgeSessionStore } from '../../data/judge/session';
import type { LocalDb } from '../../data/local/LocalDb';
import { outbox } from '../../data/outbox/outbox';
import { syncEvents } from '../../data/sync/events';
import { readMeta } from '../../data/sync/meta';
import { refreshFromDb, syncStore } from '../../data/sync/syncStore';

/** Dane turnieju zostają na tablecie 7 dni po zakończeniu (05-bezpieczeństwo §5.5, NFR-506). */
export const TOURNAMENT_RETENTION_MS = 7 * 24 * 3600_000;

const TOURNAMENT_TABLES = [
  'local_score_value',
  'local_score_penalty',
  'local_score_sheet',
  'local_draft',
  'local_judge_session',
  'local_entry',
  'local_criterion',
  'local_penalty_type',
  'local_category',
  'local_judge',
  'local_tournament',
] as const;

const RESET_META = `UPDATE sync_meta SET tournament_id = NULL, cursor = 0, last_full_snapshot_at = NULL,
  last_push_at = NULL, last_pull_at = NULL, last_sync_server_time = NULL, last_sync_monotonic_ms = NULL,
  last_sync_boot_id = NULL, last_sync_wall_ms = NULL, server_time_offset_ms = 0, schema_version = NULL,
  tournament_finished_at = NULL WHERE id = 1`;

function afterWipe(local: LocalDb) {
  judgeSessionStore.setState({ active: null, reauth: false });
  syncStore.setState({ revoked: false, lastSyncAt: null });
  refreshFromDb(local.read, null);
  syncEvents.emit([{ type: 'snapshotApplied' }]);
}

/**
 * Cykl życia danych tabletu (IMP-319). Dane osobowe turnieju (listy startowe, sędziowie, oceny)
 * znikają po zakończeniu (7 dni, pusta kolejka), przed parowaniem z nowym turniejem i po odłączeniu.
 */
export const TabletDataLifecycle = {
  /**
   * Dane turnieju w jednej transakcji: tabele `local_*`, wysłane wpisy outboxu i `sync_meta`.
   * `keepPending` – niewysłane mutacje zostają (ponowne parowanie po odłączeniu: eksport, SCR-JDG-10).
   */
  async wipeTournament(local: LocalDb, { keepPending = false }: { keepPending?: boolean } = {}) {
    await local.tx((db) => {
      for (const table of TOURNAMENT_TABLES) db.runSync(`DELETE FROM ${table}`);
      db.runSync(keepPending ? "DELETE FROM outbox WHERE state = 'DONE'" : 'DELETE FROM outbox');
      db.runSync(RESET_META);
    });
    afterWipe(local);
  },

  /** „Wyczyść dane” (SCR-JDG-10): wszystko, łącznie z SecureStore (identyfikator, sekret, pepper, tokeny). */
  async wipeAll(local: LocalDb) {
    await this.wipeTournament(local);
    await clearDeviceCredentials();
    afterWipe(local);
  },

  /**
   * Start aplikacji i powrót na pierwszy plan: 7 dni po zakończeniu turnieju przy pustej kolejce
   * usuwa dane i poświadczenia (tablet sparowany z zakończonym turniejem nie ma już zastosowania).
   */
  async autoWipe(local: LocalDb, now: number): Promise<boolean> {
    const { tournamentFinishedAt } = readMeta(local.read);
    if (!tournamentFinishedAt || now - Date.parse(tournamentFinishedAt) < TOURNAMENT_RETENTION_MS)
      return false;
    if (outbox.countPending(local.read) > 0) return false;
    await this.wipeAll(local);
    return true;
  },
};
