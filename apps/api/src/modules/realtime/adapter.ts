import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Valkey from 'iovalkey';
import type { Server, ServerOptions } from 'socket.io';

/**
 * Socket.IO z adapterem Redis na Valkey (IMP-154, ADR-003): emisja z dowolnego zadania API dociera
 * do klientów połączonych z innymi zadaniami. Bez Valkey działa emisja lokalna (degradacja – NFR-307).
 */
export class RealtimeAdapter extends IoAdapter {
  private readonly pub: Valkey;
  private readonly sub: Valkey;

  constructor(app: INestApplicationContext, valkeyUrl: string) {
    super(app);
    this.pub = new Valkey(valkeyUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
    this.sub = this.pub.duplicate();
    for (const client of [this.pub, this.sub]) {
      let lastError = '';
      client.on('error', (err: Error) => {
        if (err.message !== lastError) this.logger.warn(`Valkey (realtime) niedostępny: ${err.message}`);
        lastError = err.message;
      });
      client.on('ready', () => (lastError = ''));
    }
    // Adapter nie obsługuje odrzuconego `publish` (zerwane połączenie) – bez tego proces dostałby
    // nieobsłużone odrzucenie. Emisja lokalna i tak się odbywa, klienci innych zadań odpytują REST.
    const publish = this.pub.publish.bind(this.pub);
    this.pub.publish = ((...args: Parameters<typeof publish>) =>
      publish(...args).catch((err: Error) => {
        this.logger.warn(`Publikacja realtime przez Valkey nieudana: ${err.message}`);
        return 0;
      })) as typeof this.pub.publish;
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, { ...options, transports: ['websocket'] } as ServerOptions);
    server.adapter(createAdapter(this.pub, this.sub));
    return server;
  }

  override async dispose(): Promise<void> {
    this.pub.disconnect();
    this.sub.disconnect();
  }
}
