import { type DynamicModule, Module, type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createTransport } from 'nodemailer';
import { CommonModule } from '../common/common.module.js';
import type { Env } from '../config/env.js';
import { InfraModule } from '../infra/infra.module.js';
import { EmailProcessor } from '../modules/email/email.processor.js';
import { bullConnection } from '../modules/email/email.queue.js';
import { ExportsModule } from '../modules/exports/exports.module.js';
import { PdfProcessor } from '../modules/exports/pdf/pdf.processor.js';
import { WorkerRuntime, type WorkerLogger, type WorkerRuntimeOptions } from './runtime.js';

/** Kontekst DI workera (IMP-170): baza, Valkey i serwisy domenowe bez serwera HTTP. */
@Module({})
export class WorkerModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: WorkerModule,
      imports: [InfraModule.forRoot(env), CommonModule, ExportsModule],
      providers: [PdfProcessor],
    };
  }
}

export interface WorkerHandle {
  context: INestApplicationContext;
  runtime: WorkerRuntime;
  close(): Promise<void>;
}

/** Uruchamia worker: kontekst Nest + kolejki BullMQ z procesorami. */
export async function startWorker(
  env: Env,
  logger: WorkerLogger,
  overrides: Partial<WorkerRuntimeOptions> = {},
): Promise<WorkerHandle> {
  const context = await NestFactory.createApplicationContext(WorkerModule.forRoot(env), { logger: false });
  const pdf = context.get(PdfProcessor);
  const email = new EmailProcessor(
    createTransport(process.env.SMTP_URL ?? 'smtp://localhost:1025'),
    process.env.EMAIL_FROM ?? 'PoleChamp <no-reply@polechamp.app>',
  );
  const runtime = new WorkerRuntime({
    connection: bullConnection(env.VALKEY_URL),
    logger,
    concurrency: { email: 5, pdf: 2, retention: 1 },
    processors: {
      pdf: (job) => pdf.process(job),
      email: (job) => email.process(job),
    },
    ...overrides,
  });
  await runtime.start();
  return {
    context,
    runtime,
    async close() {
      await runtime.close();
      await context.close();
    },
  };
}
