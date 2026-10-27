import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { routes } from '@polechamp/contracts';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authWorld } from '../setup/tokens.js';
import { startApp } from '../support/app.js';
import { withoutContractCheck } from '../support/contract.js';
import {
  type Call,
  client,
  flushValkey,
  registerAndLogin,
  STRONG_PASSWORD,
  uniqueEmail,
} from '../support/http.js';

/**
 * Zestaw testów nadużyć (IMP-404): enumeracja kont, brute force logowania i PIN-u, wstrzyknięcia i fuzzing
 * wejścia na podstawie kontraktu. Wersja „sieciowa” (k6, Schemathesis na staging) – `tools/security`.
 */
let app: NestFastifyApplication;
let call: Call;
let ipSeq = 0;
const nextIp = () => `10.77.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;

beforeAll(async () => {
  await flushValkey();
  ({ app } = await startApp());
  call = client(app);
});
afterAll(async () => {
  await app.close();
});

/** Treść odpowiedzi bez pól zależnych od żądania. */
const stable = (body: Record<string, unknown> | undefined) => {
  const { requestId: _r, instance: _i, ...rest } = body ?? {};
  return rest;
};
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

async function timed(fn: () => Promise<{ status: number; body: Record<string, unknown> }>) {
  const start = performance.now();
  const res = await fn();
  return { ...res, ms: performance.now() - start };
}

describe('IMP-404: enumeracja kont', () => {
  it('TC-SEC-012: logowanie, reset i rejestracja – identyczne treści, różnica median czasu < 50 ms', async () => {
    const existing = await Promise.all([1, 2, 3].map(() => registerAndLogin(call)));
    const samples = { login: [[], []], forgot: [[], []], register: [[], []] } as Record<string, number[][]>;
    const bodies = { login: new Set<string>(), forgot: new Set<string>(), register: new Set<string>() };
    // 4 próby na konto (poniżej progu blokady 5), na przemian istniejący / nieistniejący.
    for (let i = 0; i < 12; i++) {
      const known = existing[i % 3]!.email;
      for (const [k, email] of [known, uniqueEmail()].entries()) {
        const login = await timed(() =>
          call('POST', '/v1/auth/login', { body: { email, password: 'zle-haslo-123' }, ip: nextIp() }),
        );
        samples.login![k]!.push(login.ms);
        bodies.login.add(JSON.stringify([login.status, stable(login.body)]));
        const forgot = await timed(() =>
          call('POST', '/v1/auth/password/forgot', { body: { email }, ip: nextIp() }),
        );
        samples.forgot![k]!.push(forgot.ms);
        bodies.forgot.add(JSON.stringify([forgot.status, stable(forgot.body)]));
        const register = await timed(() =>
          call('POST', '/v1/auth/register', {
            body: {
              email: k === 0 ? email : uniqueEmail(),
              password: STRONG_PASSWORD,
              displayName: 'Organizator',
              acceptTerms: true,
              termsVersion: '2026-11',
            },
            ip: nextIp(),
          }),
        );
        samples.register![k]!.push(register.ms);
        bodies.register.add(JSON.stringify([register.status, stable(register.body)]));
      }
    }
    for (const [name, set] of Object.entries(bodies)) expect(set.size, name).toBe(1);
    for (const [name, [known, unknown]] of Object.entries(samples)) {
      expect(Math.abs(median(known!) - median(unknown!)), `${name}: różnica median (ms)`).toBeLessThan(50);
    }
  });
});

describe('IMP-404: brute force', () => {
  it('TC-SEC-013: 30 prób na konto z rotacją IP – blokada po 5, potem także poprawne hasło odrzucone', async () => {
    const { email } = await registerAndLogin(call);
    await flushValkey();
    const codes: string[] = [];
    for (let i = 0; i < 30; i++) {
      const r = await call('POST', '/v1/auth/login', {
        body: { email, password: `proba-${i}-haslo` },
        ip: nextIp(),
      });
      codes.push(String(r.body.code));
    }
    expect(codes.slice(0, 5)).toEqual(Array(5).fill('INVALID_CREDENTIALS'));
    // Po piątej próbie: blokada konta w bazie, a limit konta w Valkey (5 / 15 min) odcina kolejne próby.
    expect([...new Set(codes.slice(5))].every((c) => ['ACCOUNT_LOCKED', 'RATE_LIMITED'].includes(c))).toBe(
      true,
    );
    await flushValkey();
    const correct = await call('POST', '/v1/auth/login', {
      body: { email, password: STRONG_PASSWORD },
      ip: nextIp(),
    });
    expect(correct.body.code).toBe('ACCOUNT_LOCKED');
  });

  it('TC-SEC-013: jedno IP na różne konta – limit 20 / 15 min', async () => {
    const ip = nextIp();
    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) {
      statuses.push(
        (
          await call('POST', '/v1/auth/login', {
            body: { email: uniqueEmail(), password: 'x-haslo-123' },
            ip,
          })
        ).status,
      );
    }
    expect(statuses.slice(0, 20).every((s) => s === 401)).toBe(true);
    expect(new Set(statuses.slice(20))).toEqual(new Set([429]));
  });

  it('TC-SEC-014: PIN-ów nie da się sprawdzić bez tokenu urządzenia ani tokenem organizatora', async () => {
    const { accessToken } = await registerAndLogin(call);
    const body = { judgeId: randomUUID(), pin: '1234' };
    expect((await call('POST', '/v1/judge-sessions', { body })).status).toBe(401);
    expect((await call('POST', '/v1/judge-sessions', { body, token: accessToken })).status).toBe(403);
  });
});

/** Wartości wrogie: wstrzyknięcia SQL, za długie, złe typy, znaki sterujące, prototype pollution. */
const HOSTILE: unknown[] = [
  "' OR '1'='1' --",
  '1; DROP TABLE athlete; --',
  'x'.repeat(10_000),
  -1,
  1e308,
  null,
  true,
  ['a'],
  { $ne: null },
  '\u0000‮<script>alert(1)</script>',
  '../../etc/passwd',
];

/**
 * Treści: każda wroga wartość w każdym polu w 3 rotacjach (pole i → wartość i + 4k) – mniej żądań niż
 * iloczyn pól × wartości (worker Vitest na Windows pada natywnie przy kilku tysiącach żądań w jednym procesie).
 */
function hostileBodies(): unknown[] {
  const fields = [
    'name',
    'email',
    'password',
    'fullName',
    'club',
    'startNumber',
    'pin',
    'mutations',
    'force',
  ];
  const rotations = [0, 1, 2, 3].map((k) =>
    Object.fromEntries(fields.map((f, i) => [f, HOSTILE[(i + k * 4) % HOSTILE.length]])),
  );
  return [
    {},
    [],
    'tekst',
    ...rotations,
    Object.fromEntries(fields.map((f) => [f, HOSTILE[2]])), // wszystkie pola za długie
    JSON.parse('{"__proto__":{"admin":true},"constructor":{"prototype":{"x":1}}}'),
  ];
}

describe('IMP-404: wstrzyknięcia i fuzzing wejścia', () => {
  it('TC-SEC-022: każda trasa kontraktu × wrogie parametry i treści – brak 5xx', async () => {
    const w = await authWorld(call);
    const tokenFor = (permission: string) =>
      permission.startsWith('ORG') ? w.owner.token : permission === 'DEV' ? w.tokens.device : w.tokens.judge;
    const failures: string[] = [];
    await withoutContractCheck(async () => {
      for (const route of routes) {
        await flushValkey();
        // Dwa warianty parametru ścieżki (UUID i wstrzyknięcie) – mniej żądań przy tej samej pokryciu tras.
        for (const param of [randomUUID(), "1' OR '1'='1"]) {
          const path = route.path.replace(/\{[^}]+\}/g, encodeURIComponent(param));
          const bodies = route.method === 'get' || route.method === 'delete' ? [undefined] : hostileBodies();
          for (const body of bodies) {
            const res = await call(
              route.method.toUpperCase() as 'GET',
              `${path}?q=${encodeURIComponent("'--")}`,
              {
                body: body as Record<string, unknown>,
                token: tokenFor(route.permission),
                headers: route.ifMatch ? { 'if-match': '"1"' } : {},
              },
            );
            if (res.status >= 500) failures.push(`${route.method} ${path.slice(0, 80)} → ${res.status}`);
          }
        }
      }
    });
    expect(failures).toEqual([]);
  }, 600_000);
});
