import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ENV, type Env } from '../../config/env.js';
import { DEFAULT_JOB_OPTIONS, PDF_QUEUE_NAME } from '../../worker/runtime.js';
import { bullConnection } from '../email/email.queue.js';

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

  async enqueue(exportId: string): Promise<void> {
    await this.queue.add('export', { exportId }, { jobId: exportId });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
