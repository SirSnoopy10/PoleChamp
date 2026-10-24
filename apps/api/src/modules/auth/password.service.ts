import { Inject, Injectable, Logger } from '@nestjs/common';
import argon2 from 'argon2';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ENV, type Env } from '../../config/env.js';

/** Argon2id – minimum OWASP: m = 19 MiB, t = 2, p = 1 (02-model §2.1). */
const ARGON2 = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

@Injectable()
export class PasswordService {
  /** Hash atrapy – logowanie nieistniejącego konta trwa tyle samo co istniejącego. */
  private dummy?: Promise<string>;

  hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2);
  }

  async verify(hash: string | null, password: string): Promise<boolean> {
    this.dummy ??= this.hash('dummy-password-for-timing');
    const target = hash ?? (await this.dummy);
    const ok = await argon2.verify(target, password).catch(() => false);
    return hash !== null && ok;
  }
}

/** Najczęstsze hasła – zapas, gdy HIBP i lista top-100k są niedostępne (Q-12). */
const BUILT_IN_BREACHED = [
  '123456789',
  '1234567890',
  'password1',
  'password123',
  'Password123!',
  'qwerty123',
  'qwertyuiop',
  'zaq12wsx',
  'polska123',
  '1q2w3e4r5t',
  'iloveyou1',
  'admin12345',
];

export type FetchLike = (
  url: string,
  init: { headers: Record<string, string>; signal: AbortSignal },
) => Promise<{
  ok: boolean;
  text(): Promise<string>;
}>;

export const BREACH_FETCH = Symbol('BREACH_FETCH');
const HIBP_TIMEOUT_MS = 1_500;

/**
 * Hasła z wycieków (IMP-114, US-001): HIBP k-anonymity (`/range/{prefiks SHA-1}`, `Add-Padding`)
 * z limitem 1,5 s; przy błędzie lub wyłączeniu – lista lokalna top-100k + wbudowana.
 */
@Injectable()
export class PasswordBreachService {
  private readonly logger = new Logger('PasswordBreach');
  private readonly local: Set<string>;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(BREACH_FETCH) private readonly fetchImpl: FetchLike,
  ) {
    this.local = new Set(BUILT_IN_BREACHED.map((p) => p.toLowerCase()));
    if (env.PASSWORD_LIST_FILE) {
      for (const line of readFileSync(env.PASSWORD_LIST_FILE, 'utf8').split(/\r?\n/)) {
        if (line) this.local.add(line.toLowerCase());
      }
    }
  }

  async isBreached(password: string): Promise<boolean> {
    if (this.env.HIBP_ENABLED) {
      const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
      try {
        const response = await this.fetchImpl(`https://api.pwnedpasswords.com/range/${sha1.slice(0, 5)}`, {
          headers: { 'Add-Padding': 'true', 'User-Agent': 'PoleChamp' },
          signal: AbortSignal.timeout(HIBP_TIMEOUT_MS),
        });
        if (response.ok) {
          const suffix = sha1.slice(5);
          return (await response.text())
            .split(/\r?\n/)
            .some((line) => line.startsWith(`${suffix}:`) && Number(line.split(':')[1]) > 0);
        }
      } catch (error) {
        this.logger.warn(`HIBP niedostępne – lista lokalna (${(error as Error).name})`);
      }
    }
    return this.local.has(password.toLowerCase());
  }
}
