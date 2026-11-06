import 'reflect-metadata';
import compress from '@fastify/compress';
import { Logger, type Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { safeError } from './common/errors/safe-error.js';
import { uuidv7, UUID_RE } from './common/ids.js';
import { requestContext, SYSTEM_ACTOR } from './common/request-context.js';
import type { Env } from './config/env.js';
import { Readiness } from './health/health.controller.js';
import { RealtimeAdapter } from './modules/realtime/adapter.js';
import { RealtimeGateway } from './modules/realtime/gateway.js';

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
  // Bez `enableShutdownHooks()`: SIGTERM/SIGINT obsługuje wyłącznie `installShutdown` (503 → opóźnienie
  // deregistracji ALB → wygaszenie WS → `app.close()`, które i tak wywołuje haki zamknięcia). Haki Nesta
  // zamykały aplikację natychmiast – połączenia odrzucane w trakcie wdrożenia, a drugi `close()` kończył
  // się błędem „Called end on pool more than once” (próba turnieju 6.11.2026).

  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(compress, { global: true, threshold: 1024 });
  fastify.addHook('onRequest', (request, reply, done) => {
    requestContext.enter({ requestId: String(request.id), ip: request.ip ?? null, actor: SYSTEM_ACTOR });
    void reply.header('X-Request-Id', String(request.id));
    done();
  });
  // Dziennik dostępu (debug): metoda, ścieżka bez zapytania, status, czas i klucz idempotencji –
  // diagnoza powtórzonych żądań klienta (IMP-715). Bez treści i nagłówków uwierzytelniania.
  const access = new Logger('Http');
  fastify.addHook('onResponse', (request, reply, done) => {
    access.debug(
      `${request.method} ${request.url.split('?')[0]} ${reply.statusCode} ${Math.round(reply.elapsedTime)}ms ` +
        `rid=${request.id} idem=${String(request.headers['idempotency-key'] ?? '-')}`,
    );
    done();
  });
  fastify.addHook('onSend', (_request, reply, payload, done) => {
    void reply.header('X-Min-App-Version', env.APP_MIN_VERSION);
    // Nagłówki bezpieczeństwa (05-bezpieczenstwo §7, TC-SEC-003); TLS kończy się na ALB.
    void reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    void reply.header('X-Content-Type-Options', 'nosniff');
    void reply.header('Referrer-Policy', 'no-referrer');
    done(null, payload);
  });
  return app;
}

/**
 * Łagodne zamknięcie (IMP-100 krok 5, IMP-505): `ready` → 503, odczekanie na deregistrację ALB
 * (`SHUTDOWN_DELAY_MS`, w ECS = `deregistration_delay` 30 s), wygaszenie WebSocketów paczkami, zamknięcie.
 */
export function installShutdown(app: NestFastifyApplication, env: Env): void {
  const logger = new Logger('Shutdown');
  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    logger.log(`${signal}: przestaję przyjmować ruch`);
    app.get(Readiness).shuttingDown = true;
    await new Promise((resolve) => setTimeout(resolve, env.SHUTDOWN_DELAY_MS));
    try {
      await app.get(RealtimeGateway, { strict: false }).drain();
    } catch (error) {
      logger.warn(safeError(error), 'Wygaszanie WS nieudane');
    }
    await app.close();
    process.exit(0);
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}
