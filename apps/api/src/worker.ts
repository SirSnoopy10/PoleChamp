import 'reflect-metadata';
import { pino } from 'pino';
import { loadEnv } from './config/env.js';
import { startWorker } from './worker/bootstrap.js';

/** Proces `worker` bez HTTP (IMP-170): kolejki `pdf`, `email`, `retention` z DLQ i metrykami. */
const env = loadEnv();
const logger = pino({ level: env.LOG_LEVEL });
const worker = await startWorker(env, logger);
logger.info('worker uruchomiony');

const shutdown = async () => {
  logger.info('zamykanie workera');
  await worker.close();
  process.exit(0);
};
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
