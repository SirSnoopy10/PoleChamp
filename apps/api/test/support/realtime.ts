import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';

/** Nasłuch na losowym porcie (Socket.IO wymaga prawdziwego serwera HTTP, nie `inject`). */
export async function listen(app: NestFastifyApplication): Promise<string> {
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.getHttpServer().address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

export interface RtClient {
  socket: Socket;
  /** Wszystkie odebrane zdarzenia serwera w kolejności. */
  events: { type: string; payload: any; at: number }[];
  /** Czeka na zdarzenie spełniające warunek (także już odebrane). */
  waitFor(type: string, match?: (payload: any) => boolean, timeoutMs?: number): Promise<any>;
  subscribe(tournamentId: string): Promise<{ ok: boolean; code?: string; rooms?: string[] }>;
  close(): void;
}

/** Klient `/rt` z tokenem w `auth.token`; odrzucenie handshake'u → wyjątek z kodem błędu. */
export function connect(
  baseUrl: string,
  token?: string,
  options: { transports?: ('websocket' | 'polling')[] } = {},
): Promise<RtClient> {
  const socket = io(`${baseUrl}/rt`, {
    transports: options.transports ?? ['websocket'],
    auth: token ? { token } : {},
    reconnection: false,
    forceNew: true,
    timeout: 3_000,
  });
  const events: RtClient['events'] = [];
  socket.onAny((type: string, payload: unknown) => events.push({ type, payload, at: Date.now() }));
  const client: RtClient = {
    socket,
    events,
    waitFor(type, match = () => true, timeoutMs = 3_000) {
      const found = events.find((e) => e.type === type && match(e.payload));
      if (found) return Promise.resolve(found.payload);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          socket.offAny(listener);
          reject(new Error(`Brak zdarzenia ${type} w ${timeoutMs} ms`));
        }, timeoutMs);
        const listener = (t: string, payload: unknown) => {
          if (t !== type || !match(payload)) return;
          clearTimeout(timer);
          socket.offAny(listener);
          resolve(payload);
        };
        socket.onAny(listener);
      });
    },
    subscribe: (tournamentId) => socket.timeout(3_000).emitWithAck('subscribe', { tournamentId }),
    close: () => socket.close(),
  };
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(client));
    socket.once('connect_error', (err: Error & { data?: { code?: string } }) => {
      socket.close();
      reject(Object.assign(new Error(err.data?.code ?? err.message), { code: err.data?.code }));
    });
  });
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
