import type { Heartbeat } from '@polechamp/contracts';
import { unwrap, type ApiClient } from '../api';
import type { Db } from '../local/LocalDb';
import { outbox } from '../outbox/outbox';
import type { RtSocket } from '../realtime/socket';
import { readMeta } from './meta';

/** Interwał heartbeatu i timera synchronizacji (06-offline §3.1, FR-806). */
export const HEARTBEAT_MS = 30_000;

export interface HeartbeatDeps {
  api: ApiClient;
  db: Db;
  /** Poziom baterii 0–1 (`expo-battery`); `null`, gdy niedostępny. */
  batteryLevel: () => Promise<number | null>;
  activeJudgeId: () => string | null;
  socket?: () => RtSocket | null;
}

export async function buildHeartbeat(deps: HeartbeatDeps): Promise<Heartbeat> {
  const level = await deps.batteryLevel().catch(() => null);
  return {
    pendingMutations: outbox.countPending(deps.db),
    lastSyncCursor: readMeta(deps.db).cursor,
    batteryLevel: level === null || level < 0 ? null : Math.min(1, level),
    activeJudgeId: deps.activeJudgeId(),
  };
}

/** Heartbeat przez WebSocket (połączony) albo `POST /v1/devices/me/heartbeat` (IMP-355 krok 4). */
export async function sendHeartbeat(deps: HeartbeatDeps): Promise<'ws' | 'rest'> {
  const body = await buildHeartbeat(deps);
  const socket = deps.socket?.() ?? null;
  if (socket?.connected) {
    socket.emit('heartbeat', body);
    return 'ws';
  }
  await unwrap(deps.api.POST('/v1/devices/me/heartbeat', { body }));
  return 'rest';
}
