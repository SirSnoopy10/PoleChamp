// Połączenia realtime (IMP-461): Socket.IO v4 (Engine.IO 4) na `k6/experimental/websockets` –
// handshake przestrzeni `/rt` z tokenem, `subscribe`, odpowiedzi na ping, utrzymanie połączenia.
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { WebSocket } from 'k6/experimental/websockets';
import { API } from './lib.js';

export const wsEvents = new Counter('ws_events');
export const wsSubscribed = new Counter('ws_subscribed');
const HOLD_MS = Number(__ENV.WS_HOLD_MS || 300_000);

export function realtime(data) {
  const t = data[__VU % data.length];
  // Organizatorzy, tablety i sędziowie – rozkład jak na turnieju (1 : 1 : 5).
  const tokens = [t.org, t.device, ...t.judges.map((j) => j.token)];
  const token = tokens[__VU % tokens.length];
  const url = `${API.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;
  const ws = new WebSocket(url);
  ws.onmessage = (e) => {
    const msg = String(e.data);
    if (msg.startsWith('0')) ws.send(`40/rt,${JSON.stringify({ token })}`);
    else if (msg === '2') ws.send('3');
    else if (msg.startsWith('40/rt'))
      // Pakiet Socket.IO: typ, przestrzeń, id potwierdzenia, treść.
      ws.send(`42/rt,1${JSON.stringify(['subscribe', { tournamentId: t.tournamentId }])}`);
    else if (msg.startsWith('43/rt,1')) {
      const ok = msg.includes('"ok":true');
      check(ok, { 'subscribe ok': (v) => v });
      if (ok) wsSubscribed.add(1);
    } else if (msg.startsWith('42/rt')) wsEvents.add(1);
    else if (msg.startsWith('44/rt')) check(false, { 'handshake /rt przyjęty': (v) => v });
  };
  ws.onerror = () => check(false, { 'ws bez błędu': (v) => v });
  setTimeout(() => ws.close(), HOLD_MS);
}
