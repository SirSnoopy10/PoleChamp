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
    // Węzeł bez odpowiedzi nie wstrzymuje emisji – jak klient w `infra.module.ts` (SEC-GAP-05). Subskrybent
    // bez limitu: nieudany `psubscribe` adaptera byłby nieobsłużonym odrzuceniem.
    this.pub = new Valkey(valkeyUrl, { lazyConnect: true, maxRetriesPerRequest: 1, commandTimeout: 500 });
    // Subskrybent czeka na Valkey bez limitu prób: `psubscribe`/`subscribe` adaptera wysłane przy starcie
    // bez Valkey kończyły proces (`MaxRetriesPerRequestError` bez obsługi) – API nie wstawało w czasie
    // awarii Valkey. Teraz subskrypcje czekają w kolejce i wykonują się po powrocie Valkey.
    this.sub = this.pub.duplicate({ commandTimeout: undefined, maxRetriesPerRequest: null });
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
    // Adapter nie obsługuje też odrzuconych (un)subskrypcji – `close()` adaptera przy zamykaniu serwera
    // wywołuje `unsubscribe`/`punsubscribe` bez `catch`; bez Valkey proces kończył się błędem.
    const swallow = (err: Error) => {
      this.logger.warn(`Subskrypcja realtime w Valkey nieudana: ${err.message}`);
      return 0;
    };
    const sub = this.sub as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
    for (const method of ['subscribe', 'psubscribe', 'unsubscribe', 'punsubscribe']) {
      const original = sub[method]?.bind(this.sub);
      if (original) sub[method] = (...args: unknown[]) => original(...args).catch(swallow);
    }
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
