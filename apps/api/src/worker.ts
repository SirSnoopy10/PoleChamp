import { Worker } from 'bullmq';
import { createTransport } from 'nodemailer';
import { loadEnv } from './config/env.js';
import { EmailProcessor } from './modules/email/email.processor.js';
import { bullConnection, EMAIL_QUEUE_NAME, type EmailJob } from './modules/email/email.queue.js';

/** Worker bez HTTP (IMP-100 krok 2): kolejka e-maili; PDF i retencja dojdą w EP-05. */
const env = loadEnv();
const smtpUrl = process.env.SMTP_URL ?? 'smtp://localhost:1025';
const processor = new EmailProcessor(
  createTransport(smtpUrl),
  process.env.EMAIL_FROM ?? 'PoleChamp <no-reply@polechamp.app>',
);

const worker = new Worker<EmailJob>(EMAIL_QUEUE_NAME, (job) => processor.process(job), {
  connection: bullConnection(env.VALKEY_URL),
  concurrency: 5,
});

const shutdown = async () => {
  await worker.close();
  process.exit(0);
};
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
