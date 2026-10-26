/** Zdarzenia synchronizacji dla ekranów sędziego (IMP-352 krok 6) – emitowane po `COMMIT`. */
export type SyncEvent =
  | { type: 'startListChanged'; categoryId: string }
  | { type: 'categoryStatusChanged'; categoryId: string; status: string }
  | { type: 'judgesChanged' }
  | { type: 'judgeSessionEnded'; judgeId: string; reason: JudgeSessionEndReason }
  | { type: 'judgeLocked'; judgeId: string }
  | { type: 'sheetsChanged'; judgeIds: string[] }
  | { type: 'snapshotApplied' }
  /** Odrzucona mutacja (IMP-357): baner z `messageKey`, ikona `warning-circle` w kolejce. */
  | {
      type: 'rejected';
      judgeId: string;
      entryId: string | null;
      categoryId: string | null;
      code: string;
      messageKey: string;
      banner: RejectionBanner;
    }
  /** `SCHEMA_MISMATCH`: migawka pobrana, szkic zmapowany po `criterion_id` – formularz do edycji. */
  | { type: 'formOutdated'; judgeId: string; entryId: string };

/** Gdzie pokazać odrzucenie: formularz (decyzja sędziego), baner kolejki SCR-JDG-04, komunikat sesji. */
export type RejectionBanner = 'form' | 'queue' | 'session';

export type JudgeSessionEndReason =
  | 'PIN_CHANGED'
  | 'PIN_LOCKED'
  | 'JUDGE_INACTIVE'
  | 'JUDGE_REMOVED'
  | 'PIN_VERSION_OUTDATED'
  | 'JUDGE_SESSION_INVALID'
  | 'DEVICE_REVOKED'
  | 'REPLACED'
  | 'TOURNAMENT_FINISHED'
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
