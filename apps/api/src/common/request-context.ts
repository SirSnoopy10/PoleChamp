import { AsyncLocalStorage } from 'node:async_hooks';

export type ActorType = 'ORGANIZER' | 'JUDGE' | 'DEVICE' | 'SYSTEM';

export interface Actor {
  type: ActorType;
  id: string | null;
  /** Urządzenie, z którego działa sędzia lub tablet. */
  deviceId?: string | null;
  tournamentId?: string | null;
}

export interface RequestContext {
  requestId: string;
  ip: string | null;
  actor: Actor;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const SYSTEM_ACTOR: Actor = { type: 'SYSTEM', id: null };

/** Kontekst bieżącego żądania (requestId, aktor) – używany przez audyt, logi i błędy. */
export const requestContext = {
  run<T>(ctx: RequestContext, fn: () => T): T {
    return storage.run(ctx, fn);
  },
  /** Ustawia kontekst dla bieżącego łańcucha asynchronicznego (hook `onRequest` Fastify). */
  enter(ctx: RequestContext): void {
    storage.enterWith(ctx);
  },
  get(): RequestContext | undefined {
    return storage.getStore();
  },
  requestId(): string | null {
    return storage.getStore()?.requestId ?? null;
  },
  actor(): Actor {
    return storage.getStore()?.actor ?? SYSTEM_ACTOR;
  },
  setActor(actor: Actor): void {
    const ctx = storage.getStore();
    if (ctx) ctx.actor = actor;
  },
};
