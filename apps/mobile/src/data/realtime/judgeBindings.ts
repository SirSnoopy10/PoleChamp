import type { ServerEventPayload } from '@polechamp/contracts';
import type { RtSocket } from './socket';
import { createVersionGate } from './versions';

/** Silnik synchronizacji tabletu (EP-08) – zakres potrzebny powiązaniom realtime. */
export interface SyncEngineHooks {
  /** Pobranie `GET /v1/sync/changes` od lokalnego kursora. */
  pull: () => void;
  /** Kursor znany lokalnie (`sync.hint` ze starszym kursorem jest ignorowany). */
  cursor: () => number;
  /** `category.locked` – natychmiastowy tryb tylko do odczytu i wstrzymanie wysyłki. */
  lockCategory: (categoryId: string) => void;
  unlockCategory: (categoryId: string) => void;
  /** `session.revoked` – obsługa sesji sędziego / urządzenia (IMP-306). */
  onSessionRevoked: (e: ServerEventPayload<'session.revoked'>) => void;
}

/** Zdarzenia realtime tabletu → `SyncEngine.pull()` i stan lokalny (IMP-216 krok 4). */
export function bindJudgeEvents(socket: RtSocket, engine: SyncEngineHooks): () => void {
  const gate = createVersionGate();
  const pull = () => engine.pull();
  const handlers = {
    'sync.hint': (e: ServerEventPayload<'sync.hint'>) => {
      if (e.cursor > engine.cursor()) engine.pull();
    },
    'category.updated': (e: ServerEventPayload<'category.updated'>) => {
      if (gate.accept(`category:${e.categoryId}`, e.version)) engine.pull();
    },
    'category.locked': (e: ServerEventPayload<'category.locked'>) => {
      engine.lockCategory(e.categoryId);
      engine.pull();
    },
    'category.unlocked': (e: ServerEventPayload<'category.unlocked'>) => {
      engine.unlockCategory(e.categoryId);
      engine.pull();
    },
    'tournament.updated': (e: ServerEventPayload<'tournament.updated'>) => {
      if (gate.accept(`tournament:${e.tournamentId}`, e.version)) engine.pull();
    },
    'config.changed': pull,
    'judges.changed': pull,
    'session.revoked': (e: ServerEventPayload<'session.revoked'>) => engine.onSessionRevoked(e),
  } as const;
  for (const [event, handler] of Object.entries(handlers)) socket.on(event as never, handler as never);
  return () => {
    for (const [event, handler] of Object.entries(handlers)) socket.off(event as never, handler as never);
  };
}
