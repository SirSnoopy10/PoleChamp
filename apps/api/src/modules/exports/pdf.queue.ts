import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ENV, type Env } from '../../config/env.js';
import { DEFAULT_JOB_OPTIONS, PDF_QUEUE_NAME } from '../../worker/runtime.js';
import { bullConnection } from '../email/email.queue.js';

/** Limit czekania na dodanie zlecenia do kolejki (awaria Valkey). */
export const ENQUEUE_TIMEOUT_MS = 3_000;

export interface PdfJob {
  exportId: string;
}

/** Producent zleceń PDF (IMP-171): `jobId = exportId`, więc ponowne zlecenie nie dubluje zadania. */
@Injectable()
export class PdfProducer implements OnModuleDestroy {
  readonly queue: Queue<PdfJob>;

  constructor(@Inject(ENV) env: Env) {
    this.queue = new Queue<PdfJob>(PDF_QUEUE_NAME, {
      connection: bullConnection(env.VALKEY_URL),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }

  /**
   * Połączenie BullMQ czeka na Valkey bez limitu (`maxRetriesPerRequest: null`) – przy awarii żądanie
   * wisiałoby do powrotu Valkey. Po `ENQUEUE_TIMEOUT_MS` odrzuca; zlecenie może jeszcze trafić do kolejki.
   */
  async enqueue(exportId: string): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Kolejka PDF niedostępna')), ENQUEUE_TIMEOUT_MS);
    });
    try {
      await Promise.race([this.queue.add('export', { exportId }, { jobId: exportId }), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
