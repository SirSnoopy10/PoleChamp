import { Inject, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { clientEvents, EVENT_ROOM, roomName, type ServerEventName } from '@polechamp/contracts';
import { eq } from 'drizzle-orm';
import type { Namespace, Socket } from 'socket.io';
import { type Principal, PrincipalService } from '../../common/auth/principal.service.js';
import { DomainError } from '../../common/errors/domain-error.js';
import { DB, type Db } from '../../db/client.js';
import { OwnershipRepository } from '../../db/repositories/ownership.repository.js';
import { device } from '../../db/schema.js';
import { DevicesService } from '../devices/devices.service.js';

interface SocketData {
  principal: Principal;
  expiry?: NodeJS.Timeout;
}
type RtSocket = Socket & { data: SocketData };
type Ack = { ok: true; rooms: string[] } | { ok: false; code: string };

const deviceOf = (p: Principal) => (p.typ === 'device' ? p.sub : p.typ === 'judge' ? p.dev : null);

/**
 * Kanał realtime `/rt` (03-api §6; IMP-154): tylko transport WebSocket, token w `auth.token` handshake'u,
 * pokoje turnieju po `subscribe` z autoryzacją (05-bezpieczenstwo §4.1), `auth.expired` po wygaśnięciu tokenu.
 */
@WebSocketGateway({ namespace: '/rt', transports: ['websocket'], pingInterval: 25_000 })
export class RealtimeGateway
  implements OnGatewayInit<Namespace>, OnGatewayConnection<RtSocket>, OnGatewayDisconnect<RtSocket>
{
  @WebSocketServer() private readonly nsp!: Namespace;
  private readonly logger = new Logger('Realtime');

  constructor(
    @Inject(PrincipalService) private readonly principals: PrincipalService,
    @Inject(OwnershipRepository) private readonly owned: OwnershipRepository,
    @Inject(DevicesService) private readonly devices: DevicesService,
    @Inject(DB) private readonly db: Db,
  ) {}

  afterInit(nsp: Namespace): void {
    nsp.use((socket, next) => {
      const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
      this.principals
        .verify(typeof token === 'string' ? token : null)
        .then((principal) => {
          (socket.data as SocketData).principal = principal;
          next();
        })
        .catch((error: unknown) => {
          const code = error instanceof DomainError ? error.code : 'UNAUTHENTICATED';
          next(Object.assign(new Error(code), { data: { code } }));
        });
    });
  }

  async handleConnection(socket: RtSocket): Promise<void> {
    const { principal } = socket.data;
    if (principal.exp) {
      const ms = principal.exp * 1000 - Date.now();
      socket.data.expiry = setTimeout(
        () => {
          socket.emit('auth.expired');
          socket.disconnect(true);
        },
        Math.max(0, ms),
      );
    }
    const deviceId = deviceOf(principal);
    // Połączony tablet jest online (TL-35).
    if (deviceId) await this.db.update(device).set({ lastSeenAt: new Date() }).where(eq(device.id, deviceId));
  }

  handleDisconnect(socket: RtSocket): void {
    clearTimeout(socket.data.expiry);
  }

  /** Organizator-właściciel → `tournament` i `org`; tablet i sędzia własnego turnieju → `tournament` i `device`. */
  @SubscribeMessage('subscribe')
  async subscribe(@ConnectedSocket() socket: RtSocket, @MessageBody() body: unknown): Promise<Ack> {
    const parsed = clientEvents.subscribe.safeParse(body);
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' };
    const { tournamentId } = parsed.data;
    const { principal } = socket.data;
    let rooms: string[];
    if (principal.typ === 'org') {
      const owns = await this.owned.tournament(this.db, tournamentId, principal.sub).then(
        () => true,
        () => false,
      );
      if (!owns) return { ok: false, code: 'FORBIDDEN' };
      rooms = [roomName('tournament', tournamentId), roomName('org', tournamentId)];
    } else {
      if (principal.trn !== tournamentId) return { ok: false, code: 'FORBIDDEN' };
      rooms = [roomName('tournament', tournamentId), roomName('device', deviceOf(principal) as string)];
    }
    await socket.join(rooms);
    return { ok: true, rooms };
  }

  /** Heartbeat tabletu przez WebSocket – alternatywa dla `POST /devices/me/heartbeat` (IMP-142). */
  @SubscribeMessage('heartbeat')
  async heartbeat(@ConnectedSocket() socket: RtSocket, @MessageBody() body: unknown): Promise<Ack> {
    const deviceId = deviceOf(socket.data.principal);
    if (!deviceId) return { ok: false, code: 'FORBIDDEN' };
    const parsed = clientEvents.heartbeat.safeParse(body);
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' };
    await this.devices.heartbeat(deviceId, parsed.data);
    return { ok: true, rooms: [...socket.rooms] };
  }

  /** Emisja zdarzenia z outboxu do pokoju wg `EVENT_ROOM` (IMP-155); brak adresata → pominięte. */
  emit(type: string, payload: unknown, tournamentId: string | null, deviceId: string | null): boolean {
    const room = EVENT_ROOM[type as ServerEventName];
    const target = room === 'device' ? deviceId : tournamentId;
    if (!room || !target) {
      this.logger.warn({ type }, 'Zdarzenie bez pokoju docelowego');
      return false;
    }
    this.nsp.to(roomName(room, target)).emit(type, payload);
    return true;
  }

  get connections(): number {
    return this.nsp.sockets.size;
  }

  /**
   * Wygaszanie przy wdrożeniu (IMP-505, ADR-003): `server.restarting` do połączeń tego procesu
   * (`local` – nie przez adapter do innych zadań), potem rozłączanie paczkami po `batch` co
   * `intervalMs`. Klienci łączą się ponownie z losowym opóźnieniem 0,5–5 s i robią `pull`,
   * więc nowe zadania nie dostają lawiny połączeń, a zdarzenia z przerwy wracają z `sync/changes`.
   */
  async drain({ batch = DRAIN_BATCH, intervalMs = DRAIN_INTERVAL_MS } = {}): Promise<number> {
    const sockets = [...this.nsp.sockets.values()];
    this.nsp.local.emit('server.restarting' as ServerEventName, { reconnectInMs: RECONNECT_JITTER_MS });
    for (let i = 0; i < sockets.length; i += batch) {
      if (i > 0) await new Promise((resolve) => setTimeout(resolve, intervalMs));
      for (const socket of sockets.slice(i, i + batch)) socket.disconnect(true);
    }
    if (sockets.length) this.logger.log({ closed: sockets.length }, 'WS wygaszone przed zamknięciem');
    return sockets.length;
  }
}

export const DRAIN_BATCH = 50;
export const DRAIN_INTERVAL_MS = 1_000;
/** Zakres losowego opóźnienia ponownego połączenia klienta (ms) – informacyjnie w `server.restarting`. */
export const RECONNECT_JITTER_MS = [500, 5_000] as const;
