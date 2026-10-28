import { createStore, useStore } from 'zustand';
import { network } from '../network/online';
import type { Db } from '../local/LocalDb';
import type { SheetSyncState } from '../local/scoreSheets';
import { ATTENTION_ATTEMPTS, outbox } from '../outbox/outbox';
import { diagLog } from './diagLog';
import { readMeta } from './meta';

const ms = (iso: string | null) => (iso ? Date.parse(iso) : null);

/** Stan synchronizacji tabletu (IMP-358) – jedno źródło dla `SyncPill`, `QueuePanel` i `LogoutDialog`. */
export interface SyncState {
  /** TL-45: WebSocket połączony lub udane żądanie HTTP < 60 s (z `network`). */
  online: boolean;
  /** Mutacje niewysłane (`QUEUED` + `IN_FLIGHT`). */
  pending: number;
  inFlight: number;
  /** Odrzucone przez serwer (`FAILED_PERMANENT`). */
  rejected: number;
  /** Najwięcej prób wśród niewysłanych (≥ 20 → „Wymaga uwagi”). */
  maxAttempts: number;
  lastSyncAt: number | null;
  /** Ostatnia przyjęta wysyłka i ostatnie pobranie zmian (`sync_meta`, UX-15). */
  lastPushAt: number | null;
  lastPullAt: number | null;
  isSyncing: boolean;
  /** `DEVICE_REVOKED` – SCR-JDG-10, wysyłka zatrzymana. */
  revoked: boolean;
  /** Stan arkuszy sędziego wg startu (ikony kolejki SCR-JDG-04). */
  entries: Record<string, SheetSyncState>;
}

const initial = (): SyncState => ({
  online: network.isOnline(),
  pending: 0,
  inFlight: 0,
  rejected: 0,
  maxAttempts: 0,
  lastSyncAt: null,
  lastPushAt: null,
  lastPullAt: null,
  isSyncing: false,
  revoked: false,
  entries: {},
});

export const syncStore = createStore<SyncState>()(() => initial());

network.subscribe(() => {
  const online = network.isOnline();
  if (online !== syncStore.getState().online) {
    diagLog.add({
      event: online ? 'online' : 'offline',
      status: 'changed',
      pending: syncStore.getState().pending,
    });
  }
  syncStore.setState({ online });
});

/** Odczyt liczników outboxu i stanów arkuszy sędziego z bazy (po każdym przebiegu i zatwierdzeniu). */
export function refreshFromDb(db: Db, judgeId: string | null = null): void {
  const inFlight =
    db.getFirstSync<{ n: number }>("SELECT COUNT(*) AS n FROM outbox WHERE state = 'IN_FLIGHT'")?.n ?? 0;
  const entries: Record<string, SheetSyncState> = {};
  if (judgeId) {
    for (const r of db.getAllSync<{ entry_id: string; sync_state: SheetSyncState }>(
      'SELECT entry_id, sync_state FROM local_score_sheet WHERE judge_id = ?',
      judgeId,
    )) {
      entries[r.entry_id] = r.sync_state;
    }
  }
  const meta = readMeta(db);
  syncStore.setState({
    lastPushAt: ms(meta.lastPushAt),
    lastPullAt: ms(meta.lastPullAt),
    pending: outbox.countPending(db),
    inFlight,
    rejected: outbox.countFailed(db),
    maxAttempts: outbox.maxAttempts(db),
    entries,
  });
}

export type SyncPillState =
  | { kind: 'synced' }
  | { kind: 'sending'; count: number }
  | { kind: 'offlineQueue'; count: number }
  | { kind: 'offline' }
  | { kind: 'attention' };

/** Maszyna stanów pigułki (06-offline §8.1, TC-STATE-003). */
export function selectSyncPillState(s: SyncState): SyncPillState {
  if (s.revoked || s.rejected > 0 || s.maxAttempts >= ATTENTION_ATTEMPTS) return { kind: 'attention' };
  if (!s.online) return s.pending > 0 ? { kind: 'offlineQueue', count: s.pending } : { kind: 'offline' };
  if (s.pending > 0 || s.isSyncing) return { kind: 'sending', count: s.pending };
  return { kind: 'synced' };
}

export const selectPendingCount = (s: SyncState) => s.pending;

export type EntrySyncState = 'none' | 'synced' | 'pending' | 'rejected';

/** Ikona wiersza kolejki (06-offline §8.2). */
export const selectEntrySyncState =
  (entryId: string) =>
  (s: SyncState): EntrySyncState => {
    const state = s.entries[entryId];
    if (state === 'SYNCED') return 'synced';
    if (state === 'PENDING') return 'pending';
    if (state === 'REJECTED') return 'rejected';
    return 'none';
  };

export function useSyncStore<T>(selector: (s: SyncState) => T): T {
  return useStore(syncStore, selector);
}

/** Tylko testy. */
export function resetSyncStore(): void {
  syncStore.setState(initial(), true);
}
