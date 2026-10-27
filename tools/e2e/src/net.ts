import { execFileSync } from 'node:child_process';

/**
 * Sterowanie siecią urządzeń testowych (IMP-458): emulator/urządzenie Android (`adb`), symulator iOS
 * (Network Link Conditioner – tylko ręcznie; tryb samolotowy przez Maestro) i proxy toxiproxy przed API
 * staging-e2e (utrata pakietów, zablokowany WebSocket). Polecenia budowane czysto – testowalne bez urządzeń.
 */
export type NetAction = 'offline' | 'online' | 'lossy' | 'blockWs' | 'unblockWs';

export interface Command {
  bin: string;
  args: string[];
}

export function androidCommands(serial: string, action: 'offline' | 'online'): Command[] {
  const adb = (...args: string[]): Command => ({ bin: 'adb', args: ['-s', serial, 'shell', ...args] });
  return action === 'offline'
    ? [
        adb('cmd', 'connectivity', 'airplane-mode', 'enable'),
        adb('svc', 'wifi', 'disable'),
        adb('svc', 'data', 'disable'),
      ]
    : [
        adb('cmd', 'connectivity', 'airplane-mode', 'disable'),
        adb('svc', 'wifi', 'enable'),
        adb('svc', 'data', 'enable'),
      ];
}

/** Toxiproxy (API HTTP 8474): proxy `api` przed API, toksyny dla utraty pakietów i WebSocketu. */
export function toxiproxyRequests(base: string, action: NetAction, pct = 30) {
  const proxy = `${base}/proxies/api`;
  switch (action) {
    case 'lossy':
      // `timeout` z prawdopodobieństwem = porzucone połączenia (odpowiednik utraty pakietów na TCP).
      return [
        {
          method: 'POST',
          url: `${proxy}/toxics`,
          body: { name: 'loss', type: 'timeout', toxicity: pct / 100, attributes: { timeout: 0 } },
        },
      ];
    case 'blockWs':
      return [
        {
          method: 'POST',
          url: `${base}/proxies/rt/toxics`,
          body: { name: 'ws-block', type: 'reset_peer', attributes: { timeout: 0 } },
        },
      ];
    case 'unblockWs':
      return [{ method: 'DELETE', url: `${base}/proxies/rt/toxics/ws-block` }];
    case 'online':
      return [{ method: 'DELETE', url: `${proxy}/toxics/loss` }];
    case 'offline':
      return [{ method: 'POST', url: proxy, body: { enabled: false } }];
  }
}

export function run(commands: Command[]): void {
  for (const c of commands) execFileSync(c.bin, c.args, { stdio: 'inherit' });
}

/** `node tools/e2e/src/net.ts offline emulator-5556` | `lossy 30` (toxiproxy z TOXIPROXY_URL). */
if (/net\.ts$/.test(process.argv[1] ?? '')) {
  const [action, target] = process.argv.slice(2) as [NetAction, string | undefined];
  if (action === 'offline' || action === 'online') {
    if (!target) throw new Error('Podaj numer seryjny urządzenia (adb devices)');
    run(androidCommands(target, action));
  } else {
    const base = process.env.TOXIPROXY_URL ?? 'http://localhost:8474';
    for (const r of toxiproxyRequests(base, action, Number(target ?? 30))) {
      await fetch(r.url, {
        method: r.method,
        headers: { 'content-type': 'application/json' },
        body: 'body' in r ? JSON.stringify(r.body) : undefined,
      });
    }
  }
}
