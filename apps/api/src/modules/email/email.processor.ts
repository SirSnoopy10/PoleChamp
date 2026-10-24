import type { Job } from 'bullmq';
import type { Transporter } from 'nodemailer';
import type { EmailJob } from './email.queue.js';
import { renderEmail } from './email.templates.js';

/**
 * Procesor kolejki `email` w workerze (IMP-119). Transport SMTP: lokalnie Mailpit, w chmurze SES
 * (konfiguracja `transactional` – po utworzeniu konta AWS, IMP-013). Błąd transportu = ponowienie BullMQ.
 */
export class EmailProcessor {
  constructor(
    private readonly transport: Transporter,
    private readonly from: string,
  ) {}

  async process(job: Job<EmailJob>): Promise<void> {
    const { subject, text, html } = renderEmail(job.data.template, job.data.params);
    await this.transport.sendMail({ from: this.from, to: job.data.to, subject, text, html });
  }
}
