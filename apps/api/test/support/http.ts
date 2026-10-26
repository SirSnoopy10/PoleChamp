import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Queue } from 'bullmq';
import Valkey from 'iovalkey';
import { inject } from 'vitest';
import { assertContract } from './contract.js';
import { bullConnection, EMAIL_QUEUE_NAME, type EmailJob } from '../../src/modules/email/email.queue.js';

export interface CallOptions {
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
  ip?: string;
}

/** Skrót do `app.inject` z tokenem Bearer i adresem IP klienta. */
export function client(app: NestFastifyApplication) {
  return async (
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    url: string,
    options: CallOptions = {},
  ) => {
    const res = await app.inject({
      method,
      url,
      remoteAddress: options.ip ?? '10.0.0.1',
      headers: {
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
        ...options.headers,
      },
      ...(options.body !== undefined ? { payload: options.body as object } : {}),
    });
    const body = res.body ? (JSON.parse(res.body) as Record<string, unknown>) : undefined;
    assertContract(method, url, res.statusCode, body);
    return { status: res.statusCode, headers: res.headers, body: body as Record<string, any> };
  };
}

export type Call = ReturnType<typeof client>;

/** Czyści limity i kolejki (Valkey wspólny dla plików testowych). */
export async function flushValkey(): Promise<void> {
  const valkey = new Valkey(inject('valkeyUrl'));
  await valkey.flushdb();
  valkey.disconnect();
}

/** Ostatni e-mail w kolejce dla adresu (zadanie BullMQ – IMP-119). */
export async function lastEmail(to: string): Promise<EmailJob | undefined> {
  const queue = new Queue<EmailJob>(EMAIL_QUEUE_NAME, { connection: bullConnection(inject('valkeyUrl')) });
  try {
    const jobs = await queue.getJobs(['waiting', 'delayed', 'prioritized']);
    return jobs
      .filter((j) => j.data.to.toLowerCase() === to.toLowerCase())
      .sort((a, b) => b.timestamp - a.timestamp || Number(b.id) - Number(a.id))[0]?.data;
  } finally {
    await queue.close();
  }
}

let counter = 0;
export const uniqueEmail = (prefix = 'org') => `${prefix}-${Date.now()}-${++counter}@studio-test.pl`;
export const STRONG_PASSWORD = 'Rura-Na-Scenie-2026';

/** Rejestracja + weryfikacja + logowanie – zwraca tokeny organizatora. */
export async function registerAndLogin(call: Call, email = uniqueEmail()) {
  await call('POST', '/v1/auth/register', {
    body: {
      email,
      password: STRONG_PASSWORD,
      displayName: 'Marta',
      acceptTerms: true,
      termsVersion: '2026-11',
    },
  });
  const code = (await lastEmail(email))?.params.code;
  await call('POST', '/v1/auth/verify-email', { body: { email, code } });
  const login = await call('POST', '/v1/auth/login', { body: { email, password: STRONG_PASSWORD } });
  return {
    email,
    accessToken: login.body.accessToken as string,
    refreshToken: login.body.refreshToken as string,
  };
}
