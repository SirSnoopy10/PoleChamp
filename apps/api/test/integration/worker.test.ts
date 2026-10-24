import { randomUUID } from 'node:crypto';
import type { Job } from 'bullmq';
import { afterEach, describe, expect, inject, it } from 'vitest';
import { bullConnection } from '../../src/modules/email/email.queue.js';
import {
  DEAD_LETTER_QUEUE_NAME,
  PDF_QUEUE_NAME,
  WorkerRuntime,
  type Processor,
  type WorkerRuntimeOptions,
} from '../../src/worker/runtime.js';

const silent = { info: () => undefined, error: () => undefined };
const runtimes: WorkerRuntime[] = [];

function runtime(
  prefix: string,
  processors: WorkerRuntimeOptions['processors'],
  extra: Partial<WorkerRuntimeOptions> = {},
): WorkerRuntime {
  const r = new WorkerRuntime({
    connection: bullConnection(inject('valkeyUrl')),
    processors,
    logger: silent,
    prefix,
    schedules: false,
    metricsIntervalMs: 0,
    workerOptions: { lockDuration: 1_000, stalledInterval: 500 },
    ...extra,
  });
  runtimes.push(r);
  return r;
}

async function until<T>(fn: () => Promise<T | undefined>, timeoutMs = 15_000): Promise<T> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v !== undefined) return v;
    if (Date.now() > end) throw new Error('przekroczono czas oczekiwania');
    await new Promise((r) => setTimeout(r, 100));
  }
}

const fastRetry = { backoff: { type: 'fixed', delay: 10 } } as const;

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map((r) => r.close()));
});

describe('worker BullMQ (IMP-170)', () => {
  it('TC-REL-007: zadanie przerwane zatrzymaniem workera wykonuje się po ponownym starcie, bez duplikatu', async () => {
    const prefix = `t-${randomUUID()}`;
    const outputs = new Map<string, number>();
    let hang = () => undefined as unknown;
    const first = runtime(prefix, {
      pdf: () => new Promise((resolve) => (hang = () => resolve(undefined))),
    });
    await first.start();
    const job = await first.queue(PDF_QUEUE_NAME).add('export', { exportId: 'e1' });
    await until(async () => ((await job.getState()) === 'active' ? true : undefined));
    // Awaria procesu: brak odnowienia blokady, zadanie bez wyniku.
    await first.workers[0]!.close(true);
    hang();

    const write: Processor = async (j: Job) => {
      const key = `exports/${String(j.data.exportId)}.pdf`;
      outputs.set(key, (outputs.get(key) ?? 0) + 1);
      return { key };
    };
    const second = runtime(prefix, { pdf: write });
    await second.start();
    const state = await until(async () => {
      const s = await second.queue(PDF_QUEUE_NAME).getJobState(job.id!);
      return s === 'completed' ? s : undefined;
    });
    expect(state).toBe('completed');
    expect([...outputs.entries()]).toEqual([['exports/e1.pdf', 1]]);
  });

  it('TC-REL-007: zadanie wyczerpujące 3 próby trafia do kolejki dead-letter', async () => {
    const prefix = `t-${randomUUID()}`;
    let calls = 0;
    const r = runtime(prefix, {
      pdf: async () => {
        calls += 1;
        throw new Error('S3 niedostępne');
      },
    });
    await r.start();
    const job = await r.queue(PDF_QUEUE_NAME).add('export', { exportId: 'e2' }, fastRetry);
    expect(job.opts.attempts).toBe(3);
    const dead = await until(() => r.queue(DEAD_LETTER_QUEUE_NAME).getJob(`pdf-${job.id}`));
    expect(calls).toBe(3);
    expect(dead.data).toMatchObject({ queue: 'pdf', error: 'S3 niedostępne', attemptsMade: 3 });
  });

  it('metryki EMF queue_depth i job_duration_ms dla każdej kolejki', async () => {
    const prefix = `t-${randomUUID()}`;
    const r = runtime(prefix, { pdf: async () => 'ok' });
    await r.start();
    const job = await r.queue(PDF_QUEUE_NAME).add('export', {});
    await until(async () => ((await job.getState()) === 'completed' ? true : undefined));
    await r.queue('retention').add('x', {}, { delay: 60_000 });
    const records = (await r.collectMetrics()) as Array<Record<string, unknown>>;
    const byQueue = new Map(records.map((m) => [m.queue, m]));
    expect([...byQueue.keys()].sort()).toEqual(['dead-letter', 'email', 'pdf', 'retention']);
    expect(byQueue.get('retention')!.queue_depth).toBe(1);
    expect(byQueue.get('pdf')!.job_duration_ms).toHaveLength(1);
  });

  it('zamknięcie czeka na bieżące zadanie (graceful shutdown)', async () => {
    const prefix = `t-${randomUUID()}`;
    let finished = false;
    const r = runtime(prefix, {
      pdf: async () => {
        await new Promise((res) => setTimeout(res, 500));
        finished = true;
      },
    });
    await r.start();
    const job = await r.queue(PDF_QUEUE_NAME).add('export', {});
    await until(async () => ((await job.getState()) === 'active' ? true : undefined));
    runtimes.splice(runtimes.indexOf(r), 1);
    await r.close();
    expect(finished).toBe(true);
  });
});
