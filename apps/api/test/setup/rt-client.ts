import { connect, listen, type RtClient } from '../support/realtime.js';

/** Klient testowy Socket.IO (IMP-451): połączenie, subskrypcja i `waitForEvent`. */
export { connect, listen, type RtClient };

export async function rtClient(baseUrl: string, token: string, tournamentId?: string) {
  const client = await connect(baseUrl, token);
  if (tournamentId) await client.subscribe(tournamentId);
  return {
    ...client,
    waitForEvent: (name: string, predicate?: (payload: any) => boolean, timeoutMs?: number) =>
      client.waitFor(name, predicate, timeoutMs),
  };
}
