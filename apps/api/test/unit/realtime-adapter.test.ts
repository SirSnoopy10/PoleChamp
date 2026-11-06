import { describe, expect, it } from 'vitest';
import type Valkey from 'iovalkey';
import type { INestApplicationContext } from '@nestjs/common';
import { RealtimeAdapter } from '../../src/modules/realtime/adapter';

describe('adapter realtime', () => {
  it('SEC-GAP-05: limit polecenia na publikatorze, subskrybent bez limitu', async () => {
    const app = { getHttpServer: () => ({}) } as unknown as INestApplicationContext;
    const adapter = new RealtimeAdapter(app, 'redis://127.0.0.1:1');
    const clients = adapter as unknown as {
      pub: { options: { commandTimeout?: number } };
      sub: { options: { commandTimeout?: number } };
    };
    expect(clients.pub.options.commandTimeout).toBe(500);
    expect(clients.sub.options.commandTimeout).toBeUndefined();
    await adapter.dispose();
  });

  it('start bez Valkey: subskrypcje adaptera nie kończą procesu (brak nieobsłużonych odrzuceń)', async () => {
    const app = { getHttpServer: () => ({}) } as unknown as INestApplicationContext;
    const adapter = new RealtimeAdapter(app, 'redis://127.0.0.1:1');
    const sub = (adapter as unknown as { sub: Valkey }).sub;
    expect(sub.options.maxRetriesPerRequest).toBeNull();
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on('unhandledRejection', onRejection);
    try {
      // Jak `@socket.io/redis-adapter` – wywołania bez `catch`.
      void sub.psubscribe('socket.io#/rt#*');
      void sub.subscribe('socket.io-request#/rt#');
      // Jak `close()` adaptera przy zamykaniu serwera.
      void sub.punsubscribe('socket.io#/rt#*');
      void sub.unsubscribe('socket.io-request#/rt#');
      await new Promise((r) => setTimeout(r, 300));
      await adapter.dispose();
      await new Promise((r) => setTimeout(r, 100));
    } finally {
      process.off('unhandledRejection', onRejection);
    }
    expect(rejections).toEqual([]);
  });
});
