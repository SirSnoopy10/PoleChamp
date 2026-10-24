import { z } from 'zod';
import { CategoryStatus } from '../schemas/categories.js';
import { Id, IsoDateTime } from '../schemas/common.js';
import { Heartbeat } from '../schemas/judges.js';
import { TournamentStatus } from '../schemas/tournaments.js';

/**
 * Zdarzenia Socket.IO (03-api §6; IMP-065). Ładunki są minimalne – to sygnały unieważnienia,
 * po których klient pobiera dane przez REST albo `sync/changes`.
 */
export const SessionRevokedReason = z.enum([
  'DEVICE_REVOKED',
  'PIN_RESET',
  'REPLACED',
  'JUDGE_DEACTIVATED',
  'TOURNAMENT_FINISHED',
]);

export const serverEvents = {
  'tournament.updated': z.object({ tournamentId: Id, status: TournamentStatus, version: z.number().int() }),
  'category.updated': z.object({ categoryId: Id, status: CategoryStatus, version: z.number().int() }),
  'category.locked': z.object({ categoryId: Id, lockedAt: IsoDateTime }),
  'category.unlocked': z.object({ categoryId: Id }),
  'config.changed': z.object({ categoryId: Id, scope: z.enum(['criteria', 'penalties', 'entries']) }),
  'judges.changed': z.object({ judgeIds: z.array(Id) }),
  'scoresheet.accepted': z.object({ categoryId: Id, entryId: Id, judgeId: Id, revision: z.number().int() }),
  'results.updated': z.object({ categoryId: Id, resultsVersion: z.number().int() }),
  'progress.updated': z.object({
    tournamentId: Id,
    done: z.number().int(),
    expected: z.number().int(),
    categoryId: Id,
    categoryDone: z.number().int(),
    categoryExpected: z.number().int(),
  }),
  'device.status': z.object({
    deviceId: Id,
    online: z.boolean(),
    pendingMutations: z.number().int(),
    lastSeenAt: IsoDateTime.nullable(),
    activeJudgeId: Id.nullable(),
  }),
  'rejected.created': z.object({ rejectedId: Id, categoryId: Id, judgeId: Id }),
  'device.paired': z.object({ deviceId: Id, name: z.string(), platform: z.enum(['ios', 'android']) }),
  'session.revoked': z.object({ judgeId: Id.optional(), reason: SessionRevokedReason }),
  'sync.hint': z.object({ cursor: z.number().int() }),
} as const;

export const clientEvents = {
  subscribe: z.object({ tournamentId: Id }),
  heartbeat: Heartbeat,
} as const;

export type ServerEventName = keyof typeof serverEvents;
export type ClientEventName = keyof typeof clientEvents;
export type ServerEventPayload<E extends ServerEventName> = z.infer<(typeof serverEvents)[E]>;
export type ClientEventPayload<E extends ClientEventName> = z.infer<(typeof clientEvents)[E]>;

/** Mapy w formacie `socket.io` / `socket.io-client` (`Server<ClientToServerEvents, ServerToClientEvents>`). */
export type ServerToClientEvents = { [E in ServerEventName]: (payload: ServerEventPayload<E>) => void };
export type ClientToServerEvents = { [E in ClientEventName]: (payload: ClientEventPayload<E>) => void };

export type Room = 'tournament' | 'org' | 'device';

/** Pokój, do którego publikator emituje zdarzenie (03-api §6). */
export const EVENT_ROOM = {
  'tournament.updated': 'tournament',
  'category.updated': 'tournament',
  'category.locked': 'tournament',
  'category.unlocked': 'tournament',
  'config.changed': 'tournament',
  'judges.changed': 'tournament',
  'scoresheet.accepted': 'org',
  'results.updated': 'org',
  'progress.updated': 'org',
  'device.status': 'org',
  'rejected.created': 'org',
  'device.paired': 'org',
  'session.revoked': 'device',
  'sync.hint': 'tournament',
} as const satisfies Record<ServerEventName, Room>;

/** Nazwy pokoi Socket.IO: `tournament:{id}`, `org:{tournamentId}`, `device:{id}`. */
export const roomName = (room: Room, id: string): string => `${room}:${id}`;
