/** Zdarzenia synchronizacji dla ekranów sędziego (IMP-352 krok 6) – emitowane po `COMMIT`. */
export type SyncEvent =
  | { type: 'startListChanged'; categoryId: string }
  | { type: 'categoryStatusChanged'; categoryId: string; status: string }
  | { type: 'judgesChanged' }
  | { type: 'judgeSessionEnded'; judgeId: string; reason: JudgeSessionEndReason }
  | { type: 'judgeLocked'; judgeId: string }
  | { type: 'sheetsChanged'; judgeIds: string[] }
  | { type: 'snapshotApplied' };

export type JudgeSessionEndReason =
  | 'PIN_CHANGED'
  | 'PIN_LOCKED'
  | 'JUDGE_INACTIVE'
  | 'JUDGE_REMOVED'
  | 'PIN_VERSION_OUTDATED'
  | 'JUDGE_SESSION_INVALID'
  | 'DEVICE_REVOKED'
  | 'LOGOUT';

type Listener = (event: SyncEvent) => void;
const listeners = new Set<Listener>();

export const syncEvents = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  emit(events: readonly SyncEvent[]): void {
    for (const e of events) listeners.forEach((l) => l(e));
  },
  /** Tylko testy. */
  reset() {
    listeners.clear();
  },
};
