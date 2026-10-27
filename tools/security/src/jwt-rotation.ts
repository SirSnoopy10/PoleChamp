import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { exportJWK, generateKeyPair, type JWK } from 'jose';

/** Sekret `jwt-signing` – ten sam kształt co `JwtKeysSecret` w `apps/api/src/modules/auth/jwt.service.ts`. */
export interface JwtKeys {
  active: { kid: string; privateJwk: JWK; createdAt?: string };
  next?: { kid: string; privateJwk: JWK; createdAt?: string };
  previous?: { kid: string; publicJwk: JWK; retireAfter?: string };
}

/** Okres wygaszenia poprzedniego klucza: dłużej niż refresh (30 dni nieprzezroczysty) i token sędziego (12 h). */
export const RETIRE_AFTER_DAYS = 30;
/** Rotacja co 90 dni; alarm, gdy aktywny klucz starszy niż 100 dni. */
export const ROTATE_EVERY_DAYS = 90;
export const MAX_ACTIVE_AGE_DAYS = 100;

const DAY = 86_400_000;

export async function newKey(now: Date) {
  const { privateKey } = await generateKeyPair('ES256', { extractable: true });
  return { kid: randomUUID(), privateJwk: await exportJWK(privateKey), createdAt: now.toISOString() };
}

/** Krok 1 – publikacja `next`: API zaczyna go akceptować, podpisuje nadal `active`. */
export async function publishNext(keys: JwtKeys, now: Date): Promise<JwtKeys> {
  if (keys.next) throw new Error('Klucz next już opublikowany – najpierw promote');
  return { ...keys, next: await newKey(now) };
}

/**
 * Krok 2 – przełączenie (po wdrożeniu `next` na wszystkie zadania ECS): `active ← next`,
 * `previous ← stary active` (tylko klucz publiczny) z datą wygaszenia.
 */
export function promote(keys: JwtKeys, now: Date): JwtKeys {
  if (!keys.next) throw new Error('Brak klucza next – uruchom publish-next');
  const { d: _private, ...publicJwk } = keys.active.privateJwk;
  return {
    active: keys.next,
    previous: {
      kid: keys.active.kid,
      publicJwk,
      retireAfter: new Date(now.getTime() + RETIRE_AFTER_DAYS * DAY).toISOString(),
    },
  };
}

/** Krok 3 – wygaszenie `previous` po terminie (wcześniej odmowa – tokeny w obiegu). */
export function retire(keys: JwtKeys, now: Date, force = false): JwtKeys {
  if (!keys.previous) return keys;
  const due = keys.previous.retireAfter ? new Date(keys.previous.retireAfter) : now;
  if (!force && due > now) throw new Error(`Klucz previous ważny do ${due.toISOString()}`);
  const { previous: _previous, ...rest } = keys;
  return rest;
}

/** Wiek aktywnego klucza w dniach (alarm CloudWatch > 100 dni – metryka z zadania nocnego). */
export function activeAgeDays(keys: JwtKeys, now: Date): number | null {
  return keys.active.createdAt ? Math.floor((now.getTime() - Date.parse(keys.active.createdAt)) / DAY) : null;
}

/**
 * CLI (runbook `ops/runbooks/jwt-rotation.md`): `node src/jwt-rotation.ts <publish-next|promote|retire|age>
 * --file sekret.json`. W chmurze plik pochodzi z `aws secretsmanager get-secret-value` i wraca przez
 * `put-secret-value` – skrypt nie łączy się z AWS.
 */
async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { file: { type: 'string' }, force: { type: 'boolean', default: false } },
  });
  const [command] = positionals;
  const file = values.file;
  if (!file) throw new Error('Brak --file');
  const now = new Date();
  if (command === 'init') {
    const keys: JwtKeys = { active: await newKey(now) };
    writeFileSync(file, JSON.stringify(keys));
    return;
  }
  const keys = JSON.parse(readFileSync(file, 'utf8')) as JwtKeys;
  const next =
    command === 'publish-next'
      ? await publishNext(keys, now)
      : command === 'promote'
        ? promote(keys, now)
        : command === 'retire'
          ? retire(keys, now, values.force)
          : undefined;
  if (command === 'age') {
    const age = activeAgeDays(keys, now);
    console.log(JSON.stringify({ metric: 'jwt_active_key_age_days', value: age }));
    if (age !== null && age > MAX_ACTIVE_AGE_DAYS) process.exitCode = 2;
    return;
  }
  if (!next) throw new Error('Użycie: jwt-rotation <init|publish-next|promote|retire|age> --file <plik>');
  writeFileSync(file, JSON.stringify(next));
  console.log(
    `kid: active=${next.active.kid} next=${next.next?.kid ?? '-'} previous=${next.previous?.kid ?? '-'}`,
  );
}

if (process.argv[1]?.endsWith('jwt-rotation.ts')) await main();
