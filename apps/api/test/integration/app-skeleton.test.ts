import { Body, Controller, Get, Module, Post } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { TournamentCreate } from '@polechamp/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Public } from '../../src/common/auth/auth.decorators.js';
import { DomainError } from '../../src/common/errors/domain-error.js';
import { zod } from '../../src/common/validation/zod.pipe.js';
import { startApp } from '../support/app.js';

@Controller('test-errors')
@Public()
class ErrorsController {
  @Get('not-found')
  notFound() {
    throw new DomainError('NOT_FOUND', 'Turniej t9 nie istnieje.');
  }

  @Get('lock-warnings')
  lockWarnings() {
    throw new DomainError('LOCK_WARNINGS', undefined, {
      body: { missingSheets: 15, devicesWithPending: [] },
    });
  }

  @Get('crash')
  crash() {
    throw new TypeError('cannot read properties of undefined (secret internals)');
  }

  @Post('validate')
  validate(@Body(zod(TournamentCreate)) body: unknown) {
    return body;
  }
}

@Module({ controllers: [ErrorsController] })
class ErrorsModule {}

let app: NestFastifyApplication;
beforeAll(async () => {
  ({ app } = await startApp({ extraModules: [ErrorsModule] }));
});
afterAll(async () => {
  await app.close();
});

describe('IMP-100: szkielet API', () => {
  it('/health/live i /health/ready bez prefiksu /v1', async () => {
    const live = await app.inject({ method: 'GET', url: '/health/live' });
    expect(live.statusCode).toBe(200);
    const ready = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(ready.json()).toEqual({ status: 'ok', database: 'ok', valkey: 'ok' });
  });

  it('identyfikator żądania z X-Request-Id i nagłówek X-Min-App-Version (IMP-120)', async () => {
    const id = '0192f1d4-7a1e-7c3b-9a55-3c1f0e2b8d10';
    const res = await app.inject({ method: 'GET', url: '/health/live', headers: { 'x-request-id': id } });
    expect(res.headers['x-request-id']).toBe(id);
    expect(res.headers['x-min-app-version']).toBe('1.2.0');
    const generated = await app.inject({
      method: 'GET',
      url: '/health/live',
      headers: { 'x-request-id': 'niepoprawny' },
    });
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('IMP-101: błędy RFC 9457 (TC-API-108)', () => {
  it('NOT_FOUND z katalogu, application/problem+json, requestId', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/test-errors/not-found' });
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.json()).toMatchObject({
      type: 'https://api.polechamp.app/problems/not-found',
      title: 'Nie znaleziono.',
      status: 404,
      code: 'NOT_FOUND',
      detail: 'Turniej t9 nie istnieje.',
      instance: '/v1/test-errors/not-found',
      requestId: res.headers['x-request-id'],
    });
  });

  it('nieznana trasa → NOT_FOUND w tym samym formacie i z nagłówkiem wersji', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/nie-ma' });
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe('NOT_FOUND');
    expect(res.headers['x-min-app-version']).toBe('1.2.0');
  });

  it('VALIDATION_FAILED z errors[] dla kilku pól i nieznanego pola', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/test-errors/validate',
      payload: {
        name: 'ab',
        startDate: '2027-04-18',
        endDate: '2027-04-01',
        venue: null,
        status: 'FINISHED',
      },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().code).toBe('VALIDATION_FAILED');
    expect(res.json().errors).toEqual(
      expect.arrayContaining([
        { field: 'name', code: 'TOO_SHORT' },
        { field: 'status', code: 'UNKNOWN_FIELD' },
      ]),
    );
  });

  it('LOCK_WARNINGS z treścią rozszerzoną', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/test-errors/lock-warnings' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'LOCK_WARNINGS', missingSheets: 15, devicesWithPending: [] });
  });

  it('wyjątek TypeError maskowany jako 500 INTERNAL bez szczegółów', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/test-errors/crash' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ code: 'INTERNAL', title: 'Coś poszło nie tak. Spróbuj ponownie.' });
    expect(res.body).not.toContain('secret internals');
  });

  it('treść powyżej 1 MB odrzucona', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/test-errors/validate',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ name: 'x'.repeat(1_100_000) }),
    });
    expect(res.statusCode).toBe(413);
    expect(res.json().code).toBe('VALIDATION_FAILED');
  });
});
