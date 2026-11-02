import { describe, expect, it } from 'vitest';
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
});
