import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Queue, type ConnectionOptions } from 'bullmq';
import { ENV, type Env } from '../../config/env.js';
import type { EmailParams, EmailTemplate } from './email.templates.js';

export const EMAIL_QUEUE_NAME = 'email';

export interface EmailJob {
  template: EmailTemplate;
  to: string;
  params: EmailParams;
}

/** Połączenie BullMQ z adresu `redis://[:hasło@]host:port` (Valkey). */
export function bullConnection(url: string): ConnectionOptions {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    password: u.password ? decodeURIComponent(u.password) : undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

/**
 * Producent e-maili (IMP-119): API tylko zleca – wysyłkę z ponowieniami (5×, backoff od 30 s)
 * wykonuje worker, więc chwilowa awaria SES nie przerywa rejestracji.
 */
@Injectable()
export class EmailProducer implements OnModuleDestroy {
  readonly queue: Queue<EmailJob>;

  constructor(@Inject(ENV) env: Env) {
    this.queue = new Queue<EmailJob>(EMAIL_QUEUE_NAME, {
      connection: bullConnection(env.VALKEY_URL),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      },
    });
  }

  async enqueue(template: EmailTemplate, to: string, params: EmailParams): Promise<void> {
    await this.queue.add(template, { template, to, params });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
