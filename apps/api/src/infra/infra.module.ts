import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import Valkey from 'iovalkey';
import { ENV, type Env } from '../config/env.js';
import { createDb, DB, DB_POOL, type DbHandle } from '../db/client.js';

export const VALKEY = Symbol('VALKEY');
export const DB_HANDLE = Symbol('DB_HANDLE');

/** Zależności infrastrukturalne wspólne dla API i workera: konfiguracja, PostgreSQL, Valkey. */
@Global()
@Module({})
export class InfraModule implements OnApplicationShutdown {
  constructor(
    @Inject(DB_HANDLE) private readonly handle: DbHandle,
    @Inject(VALKEY) private readonly valkey: Valkey,
  ) {}

  static forRoot(env: Env) {
    return {
      module: InfraModule,
      providers: [
        { provide: ENV, useValue: env },
        {
          provide: DB_HANDLE,
          useFactory: () =>
            createDb({ url: env.DATABASE_URL, ssl: env.DATABASE_SSL, max: env.DATABASE_POOL_MAX }),
        },
        { provide: DB, useFactory: (h: DbHandle) => h.db, inject: [DB_HANDLE] },
        { provide: DB_POOL, useFactory: (h: DbHandle) => h.pool, inject: [DB_HANDLE] },
        {
          provide: VALKEY,
          useFactory: () =>
            new Valkey(env.VALKEY_URL, {
              lazyConnect: true,
              maxRetriesPerRequest: 1,
              enableOfflineQueue: false,
              connectTimeout: 1_000,
            }),
        },
      ],
      exports: [ENV, DB, DB_POOL, DB_HANDLE, VALKEY],
    };
  }

  async onApplicationShutdown(): Promise<void> {
    this.valkey.disconnect();
    await this.handle.pool.end();
  }
}
