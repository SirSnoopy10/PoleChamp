import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { createHmac, pbkdf2, randomBytes, randomInt } from 'node:crypto';
import { promisify } from 'node:util';
import { ENV, type Env } from '../../config/env.js';
import type { Tx } from '../../db/client.js';
import { judge } from '../../db/schema.js';
import { PasswordService } from '../auth/password.service.js';

const pbkdf2Async = promisify(pbkdf2);

/** Weryfikator offline: PBKDF2-HMAC-SHA256, 600 000 iteracji, sól 16 B (TL-04, ADR-005). */
export const PIN_OFFLINE_ITERATIONS = 600_000;
const DEMO_PINS = new Set(['1234', '2345', '3456', '4567', '5678']);
const MAX_ATTEMPTS = 200;

/** Zakazane wzorce PIN-u (05-bezpieczenstwo §3.1). */
export function isForbiddenPin(pin: string): boolean {
  const digits = [...pin].map(Number);
  const steps = digits.slice(1).map((d, i) => d - (digits[i] as number));
  return (
    steps.every((s) => s === 0) ||
    steps.every((s) => s === 1) ||
    steps.every((s) => s === -1) ||
    /^(19|20)\d\d$/.test(pin) ||
    DEMO_PINS.has(pin)
  );
}

export interface GeneratedPin {
  pin: string;
  pinHash: string;
  pinFingerprint: Buffer;
  pinOfflineSalt: Buffer;
  pinOfflineVerifier: Buffer;
}

/**
 * PIN sędziego (IMP-130): CSPRNG, bez zakazanych wzorców, unikalny w turnieju dzięki `pin_fingerprint`
 * (HMAC kluczem serwera – TL-06). Jedyny moment, gdy serwer zna PIN: liczy hash Argon2id i weryfikator offline.
 */
@Injectable()
export class PinService {
  private readonly fingerprintKey: Buffer;

  constructor(
    @Inject(ENV) env: Env,
    @Inject(PasswordService) private readonly passwords: PasswordService,
  ) {
    this.fingerprintKey = Buffer.from(env.PIN_FINGERPRINT_KEY, 'base64');
  }

  fingerprint(tournamentId: string, pin: string): Buffer {
    return createHmac('sha256', this.fingerprintKey).update(`${tournamentId}:${pin}`).digest();
  }

  async generate(tx: Tx, tournamentId: string): Promise<GeneratedPin> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const pin = String(randomInt(0, 10_000)).padStart(4, '0');
      if (isForbiddenPin(pin)) continue;
      const pinFingerprint = this.fingerprint(tournamentId, pin);
      const [taken] = await tx
        .select({ id: judge.id })
        .from(judge)
        .where(and(eq(judge.tournamentId, tournamentId), eq(judge.pinFingerprint, pinFingerprint)));
      if (taken) continue;
      return this.secrets(tournamentId, pin);
    }
    throw new Error('Nie udało się wylosować unikalnego PIN-u');
  }

  /** Hash, odcisk i weryfikator offline danego PIN-u (także dane testowe E2E z PIN-ami seedu). */
  async secrets(tournamentId: string, pin: string): Promise<GeneratedPin> {
    const pinOfflineSalt = randomBytes(16);
    const [pinHash, pinOfflineVerifier] = await Promise.all([
      this.passwords.hash(pin),
      pbkdf2Async(pin, pinOfflineSalt, PIN_OFFLINE_ITERATIONS, 32, 'sha256'),
    ]);
    return {
      pin,
      pinHash,
      pinFingerprint: this.fingerprint(tournamentId, pin),
      pinOfflineSalt,
      pinOfflineVerifier,
    };
  }
}
