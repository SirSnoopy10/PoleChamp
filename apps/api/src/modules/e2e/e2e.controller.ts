import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { Queue } from 'bullmq';
import { sql } from 'drizzle-orm';
import type Valkey from 'iovalkey';
import { z } from 'zod';
import { Public } from '../../common/auth/auth.decorators.js';
import { validationFailed } from '../../common/errors/domain-error.js';
import { zod } from '../../common/validation/zod.pipe.js';
import { ENV, type Env } from '../../config/env.js';
import { DB, type Db } from '../../db/client.js';
import { VALKEY } from '../../infra/infra.module.js';
import { bullConnection, EMAIL_QUEUE_NAME, type EmailJob } from '../email/email.queue.js';
import { E2eSeedService } from './e2e-seed.service.js';

/** Kolumny czasu, które wolno cofać helperem zegara (wygasanie kodów, blokad, sesji, heartbeat). */
const CLOCK_COLUMNS: Record<string, readonly string[]> = {
  pairing_code: ['created_at', 'expires_at'],
  judge: ['pin_locked_at'],
  judge_session: ['started_at'],
  device: ['last_seen_at', 'last_sync_at', 'paired_at'],
  tournament: ['finished_at'],
  app_user: ['locked_until'],
};

const ClockShift = z.strictObject({
  table: z.string(),
  column: z.string(),
  id: z.uuid(),
  /** Przesunięcie w przeszłość, np. `16 minutes`, `25 hours`. */
  interval: z.string().regex(/^\d+ (seconds|minutes|hours|days)$/),
});

/**
 * Helpery przygotowania stanu dla Maestro (IMP-454). Rejestrowane tylko przy `E2E_HELPERS=1`
 * (dev, staging); w produkcji start z tą flagą jest odrzucany przez walidację środowiska.
 * Trasy poza kontraktem OpenAPI – nie są częścią API aplikacji.
 */
@Controller('__e2e')
export class E2eController {
  constructor(
    @Inject(E2eSeedService) private readonly seeds: E2eSeedService,
    @Inject(DB) private readonly db: Db,
    @Inject(VALKEY) private readonly valkey: Valkey,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Czyści limity zapytań i blokady w Valkey; dane izoluje nowe konto każdej fikstury. */
  @Post('reset')
  @Public()
  @HttpCode(200)
  async reset() {
    const keys = await this.valkey.keys('rl:*');
    if (keys.length > 0) await this.valkey.del(...keys);
    return { cleared: keys.length };
  }

  @Post('seed/:fixture')
  @Public()
  @HttpCode(201)
  seed(@Param('fixture') fixture: string) {
    if (!/^FX-[A-Z0-9-]+$/.test(fixture))
      throw validationFailed([{ field: 'fixture', code: 'INVALID_FORMAT' }]);
    return this.seeds.seed(fixture);
  }

  /** Cofnięcie kolumny czasu jednego wiersza (zegar bazy pozostaje `now()`). */
  @Post('clock')
  @Public()
  @HttpCode(200)
  async clock(@Body(zod(ClockShift)) body: z.output<typeof ClockShift>) {
    if (!CLOCK_COLUMNS[body.table]?.includes(body.column)) {
      throw validationFailed([{ field: 'column', code: 'INVALID_FORMAT' }]);
    }
    const res = await this.db.execute(
      sql`UPDATE ${sql.identifier(body.table)} SET ${sql.identifier(body.column)} = ${sql.identifier(body.column)} - ${body.interval}::interval WHERE id = ${body.id}::uuid`,
    );
    return { updated: res.rowCount ?? 0, serverTime: new Date().toISOString() };
  }

  /** Ostatni kod z e-maila (weryfikacja, reset) – z kolejki e-mail; lokalnie także w Mailpit. */
  @Get('emails/last')
  @Public()
  async lastEmail(@Query('to') to: string) {
    const queue = new Queue<EmailJob>(EMAIL_QUEUE_NAME, { connection: bullConnection(this.env.VALKEY_URL) });
    try {
      const jobs = await queue.getJobs(['waiting', 'delayed', 'prioritized', 'completed', 'active']);
      const job = jobs
        .filter((j) => j.data.to.toLowerCase() === String(to).toLowerCase())
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      return { template: job?.data.template ?? null, params: job?.data.params ?? null };
    } finally {
      await queue.close();
    }
  }
}
