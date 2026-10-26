import 'reflect-metadata';
import compress from '@fastify/compress';
import { Logger, type Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { uuidv7, UUID_RE } from './common/ids.js';
import { requestContext, SYSTEM_ACTOR } from './common/request-context.js';
import type { Env } from './config/env.js';
import { Readiness } from './health/health.controller.js';
import { RealtimeAdapter } from './modules/realtime/adapter.js';

type RawRequest = { headers: Record<string, string | string[] | undefined> };

const BODY_LIMIT = 1_048_576;

/**
 * Buduje aplikację API (IMP-100): Fastify z limitem treści 1 MB, prefiks `/v1` (bez `/health/*`),
 * identyfikator żądania z `X-Request-Id`, nagłówek `X-Min-App-Version` w każdej odpowiedzi (IMP-120).
 */
export async function createApp(
  env: Env,
  options: { logger?: boolean; extraModules?: Type[] } = {},
): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter({
    bodyLimit: BODY_LIMIT,
    trustProxy: true,
    genReqId: (req: RawRequest) => {
      const header = req.headers['x-request-id'];
      return typeof header === 'string' && UUID_RE.test(header) ? header : uuidv7();
    },
  });
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.forRoot(env, options.extraModules),
    adapter,
    {
      logger: options.logger === false ? false : undefined,
      bufferLogs: false,
    },
  );
  app.setGlobalPrefix('v1', { exclude: ['health/{*path}', '__e2e/{*path}'] });
  app.useWebSocketAdapter(new RealtimeAdapter(app, env.VALKEY_URL));
  app.enableShutdownHooks();

  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(compress, { global: true, threshold: 1024 });
  fastify.addHook('onRequest', (request, reply, done) => {
    requestContext.enter({ requestId: String(request.id), ip: request.ip ?? null, actor: SYSTEM_ACTOR });
    void reply.header('X-Request-Id', String(request.id));
    done();
  });
  fastify.addHook('onSend', (_request, reply, payload, done) => {
    void reply.header('X-Min-App-Version', env.APP_MIN_VERSION);
    done(null, payload);
  });
  return app;
}

/** Łagodne zamknięcie (IMP-100 krok 5): `ready` → 503, odczekanie na deregistrację ALB, zamknięcie. */
export function installShutdown(app: NestFastifyApplication, env: Env): void {
  const logger = new Logger('Shutdown');
  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    logger.log(`${signal}: przestaję przyjmować ruch`);
    app.get(Readiness).shuttingDown = true;
    await new Promise((resolve) => setTimeout(resolve, env.SHUTDOWN_DELAY_MS));
    await app.close();
    process.exit(0);
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}
