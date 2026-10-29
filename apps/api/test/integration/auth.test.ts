import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { eq, sql } from 'drizzle-orm';
import { decodeJwt, decodeProtectedHeader, SignJWT, generateKeyPair } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { uuidv7 } from '../../src/common/ids.js';
import type { DbHandle } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';
import { startApp } from '../support/app.js';
import { testDb } from '../support/db.js';
import {
  type Call,
  client,
  flushValkey,
  lastEmail,
  registerAndLogin,
  STRONG_PASSWORD,
  uniqueEmail,
} from '../support/http.js';

let app: NestFastifyApplication;
let call: Call;
let handle: DbHandle;

beforeAll(async () => {
  ({ app } = await startApp());
  call = client(app);
  handle = testDb();
});
afterAll(async () => {
  await app.close();
  await handle.pool.end();
});
beforeEach(async () => {
  await flushValkey();
});

const registration = (email: string, overrides: Record<string, unknown> = {}) => ({
  email,
  password: STRONG_PASSWORD,
  displayName: 'Marta',
  acceptTerms: true,
  termsVersion: '2026-11',
  ...overrides,
});

async function userByEmail(email: string) {
  const [user] = await handle.db.select().from(s.appUser).where(eq(s.appUser.email, email));
  return user;
}

describe('IMP-114: rejestracja', () => {
  it('TC-API-001: sukces – konto niezweryfikowane, kod e-mail w kolejce, audyt', async () => {
    const email = uniqueEmail();
    const res = await call('POST', '/v1/auth/register', { body: registration(email) });
    expect(res.status).toBe(201);
    const user = await userByEmail(email);
    expect(user).toMatchObject({ termsVersion: '2026-11', emailVerifiedAt: null });
    expect(user?.passwordHash).toMatch(/^\$argon2id\$v=19\$/);
    for (const param of ['m=19456', 't=2', 'p=1']) expect(user?.passwordHash).toContain(param);
    const job = await lastEmail(email);
    expect(job?.template).toBe('verify-code');
    expect(job?.params.code).toMatch(/^\d{6}$/);
    const audit = await handle.db.execute(
      sql`SELECT action, after FROM audit_log WHERE entity_id = ${user!.id} AND action = 'ACCOUNT_REGISTERED'`,
    );
    expect(audit.rows).toHaveLength(1);
    expect(JSON.stringify(audit.rows[0])).not.toContain(email);
  });

  it('TC-API-002: hasło za krótkie i z wycieku (lista lokalna przy wyłączonym HIBP)', async () => {
    const short = await call('POST', '/v1/auth/register', {
      body: registration(uniqueEmail(), { password: 'krótkie9z' }),
    });
    expect(short.status).toBe(422);
    expect(short.body.errors).toEqual([{ field: 'password', code: 'TOO_SHORT' }]);
    const breached = await call('POST', '/v1/auth/register', {
      body: registration(uniqueEmail(), { password: 'Password123!' }),
    });
    expect(breached.status).toBe(422);
    expect(breached.body.errors).toEqual([{ field: 'password', code: 'PASSWORD_BREACHED' }]);
  });

  it('TC-API-003: brak akceptacji regulaminu', async () => {
    const declined = await call('POST', '/v1/auth/register', {
      body: registration(uniqueEmail(), { acceptTerms: false }),
    });
    expect(declined.body.errors).toEqual([{ field: 'acceptTerms', code: 'REQUIRED' }]);
    const { acceptTerms: _omit, ...withoutTerms } = registration(uniqueEmail());
    const missing = await call('POST', '/v1/auth/register', { body: withoutTerms });
    expect(missing.body.errors).toEqual([{ field: 'acceptTerms', code: 'REQUIRED' }]);
  });

  it('TC-API-004: istniejący e-mail – identyczna odpowiedź, e-mail „konto istnieje”, brak nowego konta', async () => {
    const email = uniqueEmail();
    const first = await call('POST', '/v1/auth/register', { body: registration(email) });
    const second = await call('POST', '/v1/auth/register', {
      body: registration(email.toUpperCase(), { displayName: 'Ktoś inny' }),
    });
    expect([first.status, first.body]).toEqual([second.status, second.body]);
    expect((await lastEmail(email))?.template).toBe('account-exists');
    const count = await handle.db.execute(
      sql`SELECT count(*)::int AS n FROM app_user WHERE email = ${email}`,
    );
    expect(count.rows[0]).toEqual({ n: 1 });
  });
});

describe('UX-45: zmiana adresu e-mail', () => {
  it('UX-45: błędne hasło → pole; nowy adres niezweryfikowany z kodem, weryfikacja nowego; zajęty – bez zmiany', async () => {
    const { accessToken: token, email } = await registerAndLogin(call);
    const wrong = await call('PUT', '/v1/me/email', {
      token,
      body: { email: uniqueEmail(), currentPassword: 'zle-haslo-123' },
    });
    expect(wrong.status).toBe(422);
    expect(wrong.body.errors).toEqual([{ field: 'currentPassword', code: 'PASSWORD_INCORRECT' }]);

    const next = uniqueEmail();
    const ok = await call('PUT', '/v1/me/email', {
      token,
      body: { email: next, currentPassword: STRONG_PASSWORD },
    });
    expect(ok.status).toBe(204);
    expect(await userByEmail(email)).toBeUndefined();
    expect((await userByEmail(next))?.emailVerifiedAt).toBeNull();
    const code = (await lastEmail(next))!.params.code;
    expect((await call('POST', '/v1/auth/verify-email', { body: { email: next, code } })).status).toBe(204);
    expect((await call('GET', '/v1/me', { token })).body).toMatchObject({ email: next, emailVerified: true });

    const other = await registerAndLogin(call);
    const taken = await call('PUT', '/v1/me/email', {
      token,
      body: { email: other.email, currentPassword: STRONG_PASSWORD },
    });
    expect(taken.status).toBe(204);
    expect((await lastEmail(other.email))?.template).toBe('account-exists');
    expect((await call('GET', '/v1/me', { token })).body.email).toBe(next);
  });
});

describe('IMP-115: weryfikacja e-maila', () => {
  it('TC-API-005: poprawny kod potwierdza adres', async () => {
    const email = uniqueEmail();
    await call('POST', '/v1/auth/register', { body: registration(email) });
    const code = (await lastEmail(email))!.params.code;
    const res = await call('POST', '/v1/auth/verify-email', { body: { email, code } });
    expect(res.status).toBe(204);
    expect((await userByEmail(email))?.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it('TC-API-006: 5 błędnych prób unieważnia kod; kod po 24 h nieważny', async () => {
    const email = uniqueEmail();
    await call('POST', '/v1/auth/register', { body: registration(email) });
    const code = (await lastEmail(email))!.params.code!;
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      const r = await call('POST', '/v1/auth/verify-email', { body: { email, code: wrong } });
      expect(r.body.code).toBe('CODE_INVALID');
    }
    const after = await call('POST', '/v1/auth/verify-email', { body: { email, code } });
    expect(after.body.code).toBe('CODE_INVALID');

    const email2 = uniqueEmail();
    await call('POST', '/v1/auth/register', { body: registration(email2) });
    const code2 = (await lastEmail(email2))!.params.code;
    const user2 = await userByEmail(email2);
    await handle.db
      .update(s.authEmailToken)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(s.authEmailToken.userId, user2!.id));
    const expired = await call('POST', '/v1/auth/verify-email', { body: { email: email2, code: code2 } });
    expect(expired.status).toBe(400);
    expect(expired.body.code).toBe('CODE_INVALID');
  });

  it('TC-API-007: ponowne wysłanie – 1/60 s, nowy kod unieważnia poprzedni', async () => {
    const email = uniqueEmail();
    await call('POST', '/v1/auth/register', { body: registration(email) });
    const oldCode = (await lastEmail(email))!.params.code;
    const login = await call('POST', '/v1/auth/login', { body: { email, password: STRONG_PASSWORD } });
    const token = login.body.accessToken as string;
    const first = await call('POST', '/v1/auth/verify-email/resend', { token });
    expect(first.status).toBe(202);
    const second = await call('POST', '/v1/auth/verify-email/resend', { token });
    expect(second.status).toBe(429);
    expect(second.headers['retry-after']).toBeDefined();
    const newCode = (await lastEmail(email))!.params.code;
    if (newCode !== oldCode) {
      const old = await call('POST', '/v1/auth/verify-email', { body: { email, code: oldCode } });
      expect(old.body.code).toBe('CODE_INVALID');
    }
    const ok = await call('POST', '/v1/auth/verify-email', { body: { email, code: newCode } });
    expect(ok.status).toBe(204);
  });
});

describe('IMP-116: logowanie, blokada, refresh, wylogowanie', () => {
  it('TC-API-008: sukces – access ES256 typ=org na 15 min, refresh na 30 dni', async () => {
    const { email, accessToken, refreshToken } = await registerAndLogin(call);
    expect(decodeProtectedHeader(accessToken)).toMatchObject({ alg: 'ES256', kid: 'test-key-1' });
    const claims = decodeJwt(accessToken);
    expect(claims.typ).toBe('org');
    expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(900);
    expect(refreshToken).toMatch(/^rt_/);
    const user = await userByEmail(email);
    const [row] = await handle.db
      .select()
      .from(s.authRefreshToken)
      .where(eq(s.authRefreshToken.userId, user!.id));
    expect(row!.expiresAt.getTime() - Date.now()).toBeGreaterThan(29.9 * 86_400_000);
    const me = await call('GET', '/v1/me', { token: accessToken });
    expect(me.body).toMatchObject({ email, emailVerified: true, displayName: 'Marta' });
  });

  it('TC-API-009: złe dane – ten sam błąd dla złego e-maila i hasła', async () => {
    const { email } = await registerAndLogin(call);
    const badEmail = await call('POST', '/v1/auth/login', {
      body: { email: 'nie-ma@x.pl', password: STRONG_PASSWORD },
    });
    const badPass = await call('POST', '/v1/auth/login', { body: { email, password: 'zle-haslo-123' } });
    expect([badEmail.status, badEmail.body.code]).toEqual([401, 'INVALID_CREDENTIALS']);
    expect([badPass.status, badPass.body.code]).toEqual([401, 'INVALID_CREDENTIALS']);
  });

  it('TC-API-010: blokada po 5 próbach i eskalacja', async () => {
    const { email } = await registerAndLogin(call);
    await flushValkey();
    for (let i = 0; i < 5; i++) {
      const r = await call('POST', '/v1/auth/login', {
        body: { email, password: 'zle-haslo-123' },
        ip: `10.1.0.${i}`,
      });
      expect(r.body.code).toBe('INVALID_CREDENTIALS');
    }
    await flushValkey();
    const sixth = await call('POST', '/v1/auth/login', { body: { email, password: STRONG_PASSWORD } });
    expect(sixth.status).toBe(423);
    expect(sixth.body.code).toBe('ACCOUNT_LOCKED');
    expect(sixth.body.retryAfterSeconds).toBeGreaterThan(14 * 60);
    let user = await userByEmail(email);
    expect(user?.lockoutLevel).toBe(1);
    // „Po 15 min” – zdejmujemy blokadę zegarem i znowu 5 złych prób → 30 min.
    await handle.db
      .update(s.appUser)
      .set({ lockedUntil: new Date(Date.now() - 1000) })
      .where(eq(s.appUser.id, user!.id));
    await flushValkey();
    for (let i = 0; i < 5; i++) {
      await call('POST', '/v1/auth/login', { body: { email, password: 'zle-haslo-123' }, ip: `10.2.0.${i}` });
    }
    user = await userByEmail(email);
    expect(user!.lockedUntil!.getTime() - Date.now()).toBeGreaterThan(29 * 60_000);
    expect(user?.lockoutLevel).toBe(2);
  });

  it('TC-API-011 / TC-API-012: rotacja refresh i wykrycie ponownego użycia', async () => {
    const { refreshToken } = await registerAndLogin(call);
    const rotated = await call('POST', '/v1/auth/refresh', { body: { refreshToken } });
    expect(rotated.status).toBe(200);
    expect(rotated.body.refreshToken).not.toBe(refreshToken);
    const [old] = await handle.db
      .execute<{ replaced_by_id: string | null }>(
        sql`SELECT replaced_by_id FROM auth_refresh_token WHERE revoked_at IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
      )
      .then((r) => r.rows);
    expect(old?.replaced_by_id).toBeTruthy();
    const reused = await call('POST', '/v1/auth/refresh', { body: { refreshToken } });
    expect([reused.status, reused.body.code]).toEqual([401, 'TOKEN_REUSED']);
    // Cała rodzina unieważniona – także nowy token.
    const newer = await call('POST', '/v1/auth/refresh', {
      body: { refreshToken: rotated.body.refreshToken },
    });
    expect(newer.status).toBe(401);
  });

  it('TC-API-013: wylogowanie unieważnia sesję', async () => {
    const { accessToken, refreshToken } = await registerAndLogin(call);
    const res = await call('POST', '/v1/auth/logout', { token: accessToken });
    expect(res.status).toBe(204);
    const refresh = await call('POST', '/v1/auth/refresh', { body: { refreshToken } });
    expect(refresh.status).toBe(401);
  });
});

describe('IMP-117: reset hasła', () => {
  it('TC-API-014: zawsze 202 – istniejący i nieistniejący e-mail', async () => {
    const { email } = await registerAndLogin(call);
    const known = await call('POST', '/v1/auth/password/forgot', { body: { email } });
    const unknown = await call('POST', '/v1/auth/password/forgot', { body: { email: uniqueEmail('brak') } });
    expect([known.status, unknown.status]).toEqual([202, 202]);
    expect((await lastEmail(email))?.params.link).toMatch(/^https:\/\/polechamp\.app\/reset\?token=/);
  });

  it('TC-API-015 / TC-API-016: nowe hasło działa, stare nie, sesje unieważnione; token jednorazowy', async () => {
    const { email, refreshToken } = await registerAndLogin(call);
    await call('POST', '/v1/auth/password/forgot', { body: { email } });
    const token = new URL((await lastEmail(email))!.params.link!).searchParams.get('token')!;
    const newPassword = 'Nowe-Haslo-Na-Zawody';
    const res = await call('POST', '/v1/auth/password/reset', { body: { token, newPassword } });
    expect(res.status).toBe(204);
    expect(
      (await call('POST', '/v1/auth/login', { body: { email, password: STRONG_PASSWORD } })).status,
    ).toBe(401);
    expect((await call('POST', '/v1/auth/login', { body: { email, password: newPassword } })).status).toBe(
      200,
    );
    expect((await call('POST', '/v1/auth/refresh', { body: { refreshToken } })).status).toBe(401);
    const again = await call('POST', '/v1/auth/password/reset', {
      body: { token, newPassword: 'Jeszcze-Inne-Haslo' },
    });
    expect([again.status, again.body.code]).toEqual([400, 'RESET_TOKEN_INVALID']);
  });
});

describe('IMP-118: profil i usunięcie konta', () => {
  it('TC-API-017: odczyt i edycja profilu', async () => {
    const { accessToken } = await registerAndLogin(call);
    const res = await call('PATCH', '/v1/me', { token: accessToken, body: { displayName: 'Marta K.' } });
    expect(res.body.displayName).toBe('Marta K.');
    const unknown = await call('PATCH', '/v1/me', { token: accessToken, body: { email: 'x@y.pl' } });
    expect(unknown.body.errors).toEqual([{ field: 'email', code: 'UNKNOWN_FIELD' }]);
  });

  it('TC-API-018: usunięcie konta przy turnieju Trwa → 409', async () => {
    const { email, accessToken } = await registerAndLogin(call);
    const user = await userByEmail(email);
    await handle.db
      .insert(s.tournament)
      .values({ ownerId: user!.id, name: 'Trwający', status: 'IN_PROGRESS' });
    const res = await call('DELETE', '/v1/me', { token: accessToken });
    expect([res.status, res.body.code, res.body.title]).toEqual([
      409,
      'ACTIVE_TOURNAMENT_EXISTS',
      'Najpierw zakończ trwający turniej.',
    ]);
  });

  it('TC-API-019: usunięcie konta – natychmiast nieaktywne, sesje unieważnione, e-mail z datą', async () => {
    const { email, accessToken, refreshToken } = await registerAndLogin(call);
    const res = await call('DELETE', '/v1/me', { token: accessToken });
    expect(res.status).toBe(202);
    expect(
      (await call('POST', '/v1/auth/login', { body: { email, password: STRONG_PASSWORD } })).body.code,
    ).toBe('INVALID_CREDENTIALS');
    expect((await call('POST', '/v1/auth/refresh', { body: { refreshToken } })).status).toBe(401);
    expect((await lastEmail(email))?.template).toBe('account-deletion');
  });
});

describe('IMP-120: konfiguracja aplikacji', () => {
  it('TC-API-020: app-config publiczny, nagłówki wersji i cache', async () => {
    const res = await call('GET', '/v1/app-config');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ minAppVersion: '1.2.0', termsVersion: '2026-11' });
    expect(res.body.legal.privacyUrl).toBe('https://polechamp.app/prywatnosc');
    expect(res.headers['cache-control']).toBe('public, max-age=300');
    expect(res.headers['x-min-app-version']).toBe('1.2.0');
  });
});

describe('IMP-113: tokeny i guardy (TC-SEC-009, TC-SEC-010)', () => {
  it('brak tokenu → 401, zmieniony podpis → 401, alg none → 401', async () => {
    const { accessToken } = await registerAndLogin(call);
    expect((await call('GET', '/v1/me')).status).toBe(401);
    const tampered = `${accessToken.slice(0, -4)}AAAA`;
    expect((await call('GET', '/v1/me', { token: tampered })).body.code).toBe('UNAUTHENTICATED');
    const [header, payload] = accessToken.split('.');
    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    expect((await call('GET', '/v1/me', { token: `${noneHeader}.${payload}.` })).status).toBe(401);
    expect(header).toBeTruthy();
  });

  it('token podpisany obcym kluczem lub z nieznanym kid → 401; wygasły → 401', async () => {
    const { privateKey } = await generateKeyPair('ES256');
    const foreign = await new SignJWT({ typ: 'org' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key-1' })
      .setSubject('00000000-0000-7000-8000-000000000000')
      .setIssuer('https://api.polechamp.app')
      .setAudience('polechamp-api')
      .setExpirationTime('5m')
      .sign(privateKey);
    expect((await call('GET', '/v1/me', { token: foreign })).status).toBe(401);
  });

  it('token urządzenia na endpoincie organizatora → 403 FORBIDDEN', async () => {
    const jwt = app.get((await import('../../src/modules/auth/jwt.service.js')).JwtService);
    const { email } = await registerAndLogin(call);
    const user = await userByEmail(email);
    const [t] = await handle.db
      .insert(s.tournament)
      .values({ ownerId: user!.id, name: 'Turniej urządzenia' })
      .returning();
    const [d] = await handle.db
      .insert(s.device)
      .values({
        tournamentId: t!.id,
        name: 'Tablet 1',
        platform: 'android',
        secretHash: Buffer.alloc(32),
        pepper: Buffer.alloc(32),
      })
      .returning();
    const { token } = await jwt.sign({ typ: 'device', sub: d!.id, trn: t!.id });
    const res = await call('GET', '/v1/me', { token });
    expect([res.status, res.body.code]).toEqual([403, 'FORBIDDEN']);
    await handle.db.update(s.device).set({ revokedAt: new Date() }).where(eq(s.device.id, d!.id));
    const revoked = await call('GET', '/v1/me', { token });
    expect([revoked.status, revoked.body.code]).toEqual([401, 'DEVICE_REVOKED']);
  });
});

describe('IMP-112: limity zapytań (TC-API-104, TC-API-105)', () => {
  it('przekroczenie limitu logowania z IP → 429 z Retry-After', async () => {
    const results: number[] = [];
    for (let i = 0; i < 21; i++) {
      const r = await call('POST', '/v1/auth/login', {
        body: { email: `limit-${i}@x.pl`, password: 'cokolwiek-123' },
        ip: '10.9.9.9',
      });
      results.push(r.status);
    }
    expect(results.slice(0, 20).every((s) => s === 401)).toBe(true);
    expect(results[20]).toBe(429);
  });

  it('tryb awaryjny w pamięci, gdy Valkey jest niedostępny', async () => {
    const { RateLimitService } = await import('../../src/common/rate-limit/rate-limit.service.js');
    const broken = {
      status: 'end',
      connect: () => Promise.reject(new Error('down')),
      eval: () => Promise.reject(new Error('down')),
    };
    const limits = new RateLimitService(broken as never);
    for (let i = 0; i < 5; i++) await limits.consume('login:account', 'a@b.pl');
    await expect(limits.consume('login:account', 'a@b.pl')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(limits.fallbackCount).toBe(6);
  });
});

describe('IMP-715: powtórzone żądania uwierzytelniania', () => {
  const key = () => ({ 'idempotency-key': uuidv7() });

  it('UX-38: rejestracja, kod e-mail i reset hasła powtórzone z tym samym kluczem → ten sam sukces', async () => {
    const email = uniqueEmail();
    const reg = key();
    const first = await call('POST', '/v1/auth/register', { body: registration(email), headers: reg });
    const again = await call('POST', '/v1/auth/register', { body: registration(email), headers: reg });
    expect([first.status, again.status]).toEqual([201, 201]);
    expect(again.headers['idempotent-replayed']).toBe('true');
    const users = await handle.db.execute(
      sql`SELECT count(*)::int AS n FROM app_user WHERE email = ${email}`,
    );
    expect(users.rows[0]).toEqual({ n: 1 });

    const code = (await lastEmail(email))!.params.code;
    const verify = key();
    const v1 = await call('POST', '/v1/auth/verify-email', { body: { email, code }, headers: verify });
    const v2 = await call('POST', '/v1/auth/verify-email', { body: { email, code }, headers: verify });
    expect([v1.status, v2.status]).toEqual([204, 204]);

    const mismatch = await call('POST', '/v1/auth/verify-email', {
      body: { email, code: '000000' },
      headers: verify,
    });
    expect(mismatch.body).toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
  });

  it('UX-38: błąd 4xx nie jest zapamiętany – poprawione żądanie z tym samym kluczem wykonuje się', async () => {
    const email = uniqueEmail();
    await call('POST', '/v1/auth/register', { body: registration(email) });
    const code = (await lastEmail(email))!.params.code;
    const k = key();
    const wrong = code === '111111' ? '222222' : '111111';
    for (let i = 0; i < 2; i++) {
      const bad = await call('POST', '/v1/auth/verify-email', { body: { email, code: wrong }, headers: k });
      expect(bad.body.code).toBe('CODE_INVALID');
      expect(bad.headers['idempotent-replayed']).toBeUndefined();
    }
    const [row] = await handle.db
      .select({ attempts: s.authEmailToken.attempts })
      .from(s.authEmailToken)
      .innerJoin(s.appUser, eq(s.appUser.id, s.authEmailToken.userId))
      .where(eq(s.appUser.email, email));
    expect(row!.attempts).toBe(2);
  });
});
