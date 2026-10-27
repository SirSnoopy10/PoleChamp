import {
  Queue,
  Worker,
  type ConnectionOptions,
  type Job,
  type JobsOptions,
  type WorkerOptions,
} from 'bullmq';
import { safeError } from '../common/errors/safe-error.js';

/** Kolejki workera (IMP-170, ADR-002). `email` ma własne opcje producenta (IMP-119). */
export const PDF_QUEUE_NAME = 'pdf';
export const RETENTION_QUEUE_NAME = 'retention';
export const DEAD_LETTER_QUEUE_NAME = 'dead-letter';
export const WORKER_QUEUES = [PDF_QUEUE_NAME, 'email', RETENTION_QUEUE_NAME] as const;
export type WorkerQueueName = (typeof WORKER_QUEUES)[number];

/** Domyślne opcje zadań (IMP-170 krok 2): 3 próby z backoffem wykładniczym od 10 s. */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 10_000 },
  removeOnComplete: 1_000,
  removeOnFail: 5_000,
};

/** Zadania cykliczne (krok 3): retencja o 3:00 i partycje audytu o 2:00 czasu warszawskiego. */
export const SCHEDULES = [
  { id: 'retention:daily', name: 'retention:daily', pattern: '0 3 * * *' },
  { id: 'audit:partitions', name: 'audit:partitions', pattern: '0 2 * * *' },
] as const;

export interface DeadLetterJob {
  queue: string;
  jobId: string | undefined;
  name: string;
  data: unknown;
  error: string;
  attemptsMade: number;
}

export type Processor = (job: Job) => Promise<unknown>;

export interface WorkerLogger {
  info(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
}

export interface WorkerRuntimeOptions {
  connection: ConnectionOptions;
  processors: Partial<Record<WorkerQueueName, Processor>>;
  logger: WorkerLogger;
  /** Okres metryk EMF (krok 4); 0 = wyłączone. */
  metricsIntervalMs?: number;
  /** Maksymalne oczekiwanie na bieżące zadania przy zamykaniu (krok 5). */
  closeTimeoutMs?: number;
  concurrency?: Partial<Record<WorkerQueueName, number>>;
  workerOptions?: Partial<WorkerOptions>;
  /** Prefiks kluczy BullMQ (izolacja testów). */
  prefix?: string;
  /** Rejestracja zadań cyklicznych (w testach wyłączona). */
  schedules?: boolean;
}

/**
 * Środowisko workera (IMP-170): po jednym `Worker` BullMQ na kolejkę, zadania wyczerpujące próby
 * trafiają do `dead-letter` (z logiem błędu = alert), metryki długości kolejek i czasu zadań
 * w formacie EMF, zamknięcie z oczekiwaniem na bieżące zadania.
 */
export class WorkerRuntime {
  readonly workers: Worker[] = [];
  readonly queues = new Map<string, Queue>();
  private readonly durations = new Map<string, number[]>();
  private metricsTimer: NodeJS.Timeout | undefined;

  constructor(private readonly options: WorkerRuntimeOptions) {}

  async start(): Promise<void> {
    const { connection, processors, logger, prefix } = this.options;
    for (const name of [...WORKER_QUEUES, DEAD_LETTER_QUEUE_NAME]) {
      this.queues.set(name, new Queue(name, { connection, prefix, defaultJobOptions: DEFAULT_JOB_OPTIONS }));
    }
    for (const name of WORKER_QUEUES) {
      const processor = processors[name];
      if (!processor) continue;
      const worker = new Worker(
        name,
        async (job) => {
          const started = Date.now();
          try {
            return await processor(job);
          } finally {
            this.recordDuration(name, Date.now() - started);
          }
        },
        {
          connection,
          prefix,
          concurrency: this.options.concurrency?.[name] ?? 2,
          ...this.options.workerOptions,
        },
      );
      worker.on('failed', (job, err) => void this.onFailed(name, job, err));
      worker.on('error', (err) => logger.error({ err, queue: name }, 'błąd workera'));
      this.workers.push(worker);
    }
    if (this.options.schedules !== false) {
      const retention = this.queue(RETENTION_QUEUE_NAME);
      for (const s of SCHEDULES) {
        await retention.upsertJobScheduler(
          s.id,
          { pattern: s.pattern, tz: 'Europe/Warsaw' },
          { name: s.name },
        );
      }
    }
    const interval = this.options.metricsIntervalMs ?? 30_000;
    if (interval > 0) {
      this.metricsTimer = setInterval(() => void this.reportMetrics(), interval);
      this.metricsTimer.unref();
    }
  }

  queue(name: string): Queue {
    const q = this.queues.get(name);
    if (!q) throw new Error(`Nieznana kolejka ${name}`);
    return q;
  }

  private async onFailed(queue: string, job: Job | undefined, err: Error): Promise<void> {
    if (!job) return;
    const attempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < attempts) return;
    const dead: DeadLetterJob = {
      queue,
      jobId: job.id,
      name: job.name,
      data: job.data,
      error: err.message,
      attemptsMade: job.attemptsMade,
    };
    this.options.logger.error({ alert: 'worker_dead_letter', ...dead }, 'zadanie przeniesione do DLQ');
    try {
      await this.queue(DEAD_LETTER_QUEUE_NAME).add(`${queue}:${job.name}`, dead, {
        jobId: `${queue}-${job.id}`,
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      });
    } catch (e) {
      this.options.logger.error({ err: safeError(e) }, 'nie udało się zapisać zadania w DLQ');
    }
  }

  private recordDuration(queue: string, ms: number): void {
    const list = this.durations.get(queue) ?? [];
    list.push(ms);
    this.durations.set(queue, list);
  }

  /** Metryki EMF (CloudWatch Embedded Metric Format) – jeden rekord na kolejkę. */
  async collectMetrics(): Promise<object[]> {
    const records: object[] = [];
    for (const [name, queue] of this.queues) {
      const counts = await queue.getJobCounts('waiting', 'delayed', 'active', 'failed');
      const durations = this.durations.get(name) ?? [];
      this.durations.set(name, []);
      const metrics = [{ Name: 'queue_depth', Unit: 'Count' }];
      if (durations.length) metrics.push({ Name: 'job_duration_ms', Unit: 'Milliseconds' });
      records.push({
        _aws: {
          Timestamp: Date.now(),
          CloudWatchMetrics: [{ Namespace: 'PoleChamp/Worker', Dimensions: [['queue']], Metrics: metrics }],
        },
        queue: name,
        queue_depth: (counts.waiting ?? 0) + (counts.delayed ?? 0) + (counts.active ?? 0),
        ...(durations.length ? { job_duration_ms: durations } : {}),
      });
    }
    return records;
  }

  private async reportMetrics(): Promise<void> {
    try {
      for (const record of await this.collectMetrics()) this.options.logger.info(record);
    } catch (err) {
      this.options.logger.error({ err }, 'metryki kolejek niedostępne');
    }
  }

  /** Zamknięcie (krok 5): czeka na bieżące zadania maks. `closeTimeoutMs`, potem zamyka siłowo. */
  async close(): Promise<void> {
    clearInterval(this.metricsTimer);
    const timeout = this.options.closeTimeoutMs ?? 25_000;
    await Promise.all(
      this.workers.map(async (w) => {
        let timer: NodeJS.Timeout | undefined;
        const graceful = w.close().then(() => true);
        const expired = new Promise<boolean>((r) => (timer = setTimeout(() => r(false), timeout)));
        const done = await Promise.race([graceful, expired]);
        clearTimeout(timer);
        if (!done) await w.close(true);
      }),
    );
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }
}
