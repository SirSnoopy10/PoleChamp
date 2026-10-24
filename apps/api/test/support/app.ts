import type { Type } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { randomBytes } from 'node:crypto';
import { exportJWK, generateKeyPair } from 'jose';
import { inject } from 'vitest';
import { createApp } from '../../src/bootstrap.js';
import { loadEnv, type Env } from '../../src/config/env.js';

/** Para kluczy ES256 w formacie sekretu `jwt-signing` (IMP-014). */
export async function generateJwtKeys(kid = 'test-key-1'): Promise<string> {
  const { privateKey } = await generateKeyPair('ES256', { extractable: true });
  return JSON.stringify({ active: { kid, privateJwk: await exportJWK(privateKey) } });
}

/** Środowisko testowe – baza i Valkey z kontenerów (test/setup/containers.ts). */
export async function testEnv(overrides: Record<string, string> = {}): Promise<Env> {
  return loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: inject('databaseUrl'),
    VALKEY_URL: inject('valkeyUrl'),
    JWT_KEYS: await generateJwtKeys(),
    PIN_FINGERPRINT_KEY: randomBytes(32).toString('base64'),
    APP_MIN_VERSION: '1.2.0',
    SHUTDOWN_DELAY_MS: '0',
    ...overrides,
  });
}

export async function startApp(
  options: { env?: Env; extraModules?: Type[] } = {},
): Promise<{ app: NestFastifyApplication; env: Env }> {
  const env = options.env ?? (await testEnv());
  const app = await createApp(env, { logger: false, extraModules: options.extraModules });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return { app, env };
}
