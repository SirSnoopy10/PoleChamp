import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { asc, inArray, isNull, lt, min, sql } from 'drizzle-orm';
import type Valkey from 'iovalkey';
import type pg from 'pg';
import { ENV, type Env } from '../../config/env.js';
import { DB, DB_POOL, type Db, type Tx } from '../../db/client.js';
import { domainEvent } from '../../db/schema.js';
import { withTx } from '../../db/tx.js';
import { VALKEY } from '../../infra/infra.module.js';
import { RealtimeGateway } from './gateway.js';
import { safeError } from '../../common/errors/safe-error.js';

/** Klucz blokady advisory lidera publikatora – jeden publikator na klaster (IMP-155). */
export const PUBLISHER_LOCK_KEY = 0x50_43_45_56; // „PCEV”
const BATCH = 100;
const POLL_MS = 200;
const LEADER_RETRY_MS = 2_000;

/**
 * Publikator outboxu `domain_event` (IMP-155, ADR-003): zdarzenia z zatwierdzonych transakcji, co najmniej raz,
 * w kolejności `id`. Lider wybierany blokadą advisory; `LISTEN domain_event` przyspiesza publikację, a odpytywanie
 * co 200 ms jest zabezpieczeniem. Bez Valkey publikacja czeka – zdarzenia zostają w tabeli.
 */
@Injectable()
export class EventPublisher implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('EventPublisher');
  private leader: pg.PoolClient | null = null;
  private nextLeaderAttempt = 0;
  private timer?: NodeJS.Timeout;
  private running: Promise<void> | null = null;
  private again = false;
  private stopped = false;

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(DB_POOL) private readonly pool: pg.Pool,
    @Inject(VALKEY) private readonly valkey: Valkey,
    @Inject(RealtimeGateway) private readonly gateway: RealtimeGateway,
    @Inject(ENV) private readonly env: Env,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.env.EVENT_PUBLISHER_ENABLED) return;
    this.timer = setInterval(() => this.kick(), POLL_MS);
    this.timer.unref();
    this.kick();
  }

  /** Zatrzymanie przed zamknięciem serwera Socket.IO i adaptera Valkey (kolejność hooków NestJS). */
  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    clearInterval(this.timer);
    await this.running;
    await this.releaseLeader();
  }

  get isLeader(): boolean {
    return this.leader !== null;
  }

  /** Uruchamia przebieg publikacji; wywołanie w trakcie przebiegu zleca kolejny (bez równoległości). */
  kick(): void {
    if (this.stopped) return;
    if (this.running) {
      this.again = true;
      return;
    }
    this.running = this.run().finally(() => {
      this.running = null;
      if (this.again) {
        this.again = false;
        this.kick();
      }
    });
  }

  private async run(): Promise<void> {
    try {
      if (!(await this.ensureLeader())) return;
      while (!this.stopped && (await this.publishBatch()) === BATCH);
    } catch (error) {
      this.logger.error({ err: safeError(error) }, 'Błąd publikacji zdarzeń – ponowienie');
      await this.releaseLeader(true);
    }
  }

  private async ensureLeader(): Promise<boolean> {
    if (this.leader) return true;
    if (Date.now() < this.nextLeaderAttempt) return false;
    this.nextLeaderAttempt = Date.now() + LEADER_RETRY_MS;
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query<{ ok: boolean }>('SELECT pg_try_advisory_lock($1) AS ok', [
        PUBLISHER_LOCK_KEY,
      ]);
      if (!rows[0]?.ok) {
        client.release();
        return false;
      }
      client.on('notification', () => this.kick());
      client.on('error', () => void this.releaseLeader(true));
      await client.query('LISTEN domain_event');
      this.leader = client;
      this.logger.log('Publikator zdarzeń: przejęto rolę lidera');
      return true;
    } catch (error) {
      client.release(true);
      throw error;
    }
  }

  private async releaseLeader(broken = false): Promise<void> {
    const client = this.leader;
    this.leader = null;
    if (!client) return;
    try {
      if (!broken) {
        await client.query('UNLISTEN domain_event');
        await client.query('SELECT pg_advisory_unlock($1)', [PUBLISHER_LOCK_KEY]);
      }
    } finally {
      // Zerwane połączenie zwalnia blokadę advisory po stronie serwera.
      client.release(broken);
    }
  }

  /** Paczka zdarzeń: `FOR UPDATE SKIP LOCKED`, emisja, `published_at` – wycofanie = ponowna emisja. */
  async publishBatch(): Promise<number> {
    if ((await this.valkey.ping().catch(() => null)) === null) return 0;
    return withTx(this.db, async (tx) => {
      const rows = await tx
        .select()
        .from(domainEvent)
        .where(isNull(domainEvent.publishedAt))
        .orderBy(asc(domainEvent.id))
        .limit(BATCH)
        .for('update', { skipLocked: true });
      for (const e of rows) this.gateway.emit(e.type, e.payload, e.tournamentId, e.deviceId);
      if (rows.length)
        await this.markPublished(
          tx,
          rows.map((r) => r.id),
        );
      return rows.length;
    });
  }

  private async markPublished(tx: Tx, ids: number[]): Promise<void> {
    await tx.update(domainEvent).set({ publishedAt: new Date() }).where(inArray(domainEvent.id, ids));
  }

  /** `event_publisher_lag_s`: wiek najstarszego nieopublikowanego zdarzenia (0 – brak zaległości). */
  async lagSeconds(): Promise<number> {
    const [row] = await this.db
      .select({ oldest: min(domainEvent.createdAt) })
      .from(domainEvent)
      .where(isNull(domainEvent.publishedAt));
    return row?.oldest ? Math.max(0, (Date.now() - row.oldest.getTime()) / 1000) : 0;
  }

  /** Retencja: opublikowane zdarzenia starsze niż 7 dni (wywoływane przez zadanie retencji – EP-05). */
  async purgePublished(olderThanDays = 7): Promise<number> {
    const rows = await this.db
      .delete(domainEvent)
      .where(lt(domainEvent.publishedAt, sql`now() - make_interval(days => ${olderThanDays})`))
      .returning({ id: domainEvent.id });
    return rows.length;
  }
}
