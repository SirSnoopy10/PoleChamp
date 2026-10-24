import { Controller, Get, HttpCode, Inject, Injectable } from '@nestjs/common';
import type Valkey from 'iovalkey';
import type pg from 'pg';
import { Public } from '../common/auth/auth.decorators.js';
import { DomainError } from '../common/errors/domain-error.js';
import { DB_POOL } from '../db/client.js';
import { VALKEY } from '../infra/infra.module.js';

const PROBE_TIMEOUT_MS = 1_000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), PROBE_TIMEOUT_MS)),
  ]);
}

/** Stan gotowości – po SIGTERM `ready` zwraca 503, żeby ALB przestał kierować ruch (IMP-100 krok 5). */
@Injectable()
export class Readiness {
  shuttingDown = false;
}

@Controller('health')
@Public()
export class HealthController {
  constructor(
    @Inject(DB_POOL) private readonly pool: pg.Pool,
    @Inject(VALKEY) private readonly valkey: Valkey,
    @Inject(Readiness) private readonly readiness: Readiness,
  ) {}

  @Get('live')
  @HttpCode(200)
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    if (this.readiness.shuttingDown) throw new DomainError('INTERNAL', 'shutting down', {}, 503);
    const checks = await Promise.allSettled([
      withTimeout(this.pool.query('SELECT 1')),
      withTimeout(
        this.valkey.status === 'ready'
          ? this.valkey.ping()
          : this.valkey.connect().then(() => this.valkey.ping()),
      ),
    ]);
    const [database, valkey] = checks.map((c) => (c.status === 'fulfilled' ? 'ok' : 'down'));
    if (database !== 'ok' || valkey !== 'ok') {
      throw new DomainError('INTERNAL', `database=${database} valkey=${valkey}`, {}, 503);
    }
    return { status: 'ok', database, valkey };
  }
}
