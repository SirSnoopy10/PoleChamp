import { describe, expect, it } from 'vitest';
import { killLoop } from '../src/kill-loop.ts';
import { androidCommands, toxiproxyRequests } from '../src/net.ts';

describe('narzędzia sieci i pętla kill (IMP-458)', () => {
  it('Android offline/online przez adb', () => {
    const off = androidCommands('emulator-5556', 'offline').map((c) => c.args.join(' '));
    expect(off).toEqual([
      '-s emulator-5556 shell cmd connectivity airplane-mode enable',
      '-s emulator-5556 shell svc wifi disable',
      '-s emulator-5556 shell svc data disable',
    ]);
    expect(androidCommands('x', 'online')[0]!.args).toContain('disable');
  });

  it('toxiproxy: utrata 30%, blokada WebSocketu', () => {
    expect(toxiproxyRequests('http://t', 'lossy', 30)[0]).toMatchObject({
      url: 'http://t/proxies/api/toxics',
      body: { toxicity: 0.3 },
    });
    expect(toxiproxyRequests('http://t', 'blockWs')[0]!.url).toBe('http://t/proxies/rt/toxics');
  });

  it('TC-SYNC-004: pętla wykrywa brak arkusza i duplikat', async () => {
    const calls: string[] = [];
    const res = await killLoop(4, {
      submit: (i) => calls.push(`submit ${i}`),
      kill: () => calls.push('kill'),
      restart: () => calls.push('restart'),
      sheetCount: async (i) => (i === 2 ? 0 : i === 3 ? 2 : 1),
    });
    expect(calls.slice(0, 3)).toEqual(['submit 1', 'kill', 'restart']);
    expect(res.failures).toEqual([
      { iteration: 2, sheets: 0 },
      { iteration: 3, sheets: 2 },
    ]);
  });
});
