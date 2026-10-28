import { Inject, Injectable, Logger } from '@nestjs/common';
import type Valkey from 'iovalkey';
import { VALKEY } from '../../infra/infra.module.js';
import { DomainError } from '../errors/domain-error.js';
import { canonical, sha256Hex } from '../ids.js';

/** Publiczne trasy uwierzytelniania bez treści odpowiedzi – powtórka zwraca zapisany status (UX-38). */
export const PUBLIC_IDEMPOTENT_PATHS = new Set([
  '/v1/auth/register',
  '/v1/auth/verify-email',
  '/v1/auth/password/forgot',
  '/v1/auth/password/reset',
]);

const TTL_S = 600;
const IN_PROGRESS_TTL_S = 30;
const WAIT_STEP_MS = 50;
const WAIT_MAX_MS = 5_000;
/** Hasła nie wchodzą do skrótu treści (skrót leży w Valkey). */
const SECRET_FIELDS = new Set(['password', 'newPassword']);

interface Entry {
  hash: string;
  /** 0 = w toku. */
  status: number;
}

/**
 * `Idempotency-Key` dla publicznych POST uwierzytelniania (IMP-715): ciche ponowienie żądania przez warstwę
 * HTTP (rejestracja, kod e-mail, reset hasła) nie może skończyć się błędem po udanej operacji. Wpis w Valkey
 * (TTL 10 min); powtórka udanego żądania → zapisany status, po błędzie 4xx – ponowne wykonanie. Awaria
 * Valkey nie blokuje trasy (żądanie wykonywane bez idempotencji).
 */
@Injectable()
export class PublicIdempotency {
  private readonly logger = new Logger('PublicIdempotency');

  constructor(@Inject(VALKEY) private readonly valkey: Valkey) {}

  hash(path: string, body: unknown): string {
    const safe =
      body && typeof body === 'object'
        ? Object.fromEntries(Object.entries(body).filter(([k]) => !SECRET_FIELDS.has(k)))
        : body;
    return sha256Hex(`POST ${path} ${canonical(safe ?? null)}`);
  }

  /** Rezerwuje klucz; zwraca status zakończonej powtórki albo `null`, gdy żądanie trzeba wykonać. */
  async reserve(key: string, hash: string): Promise<number | null> {
    const redisKey = `idem:pub:${key}`;
    try {
      for (let waited = 0; waited <= WAIT_MAX_MS; waited += WAIT_STEP_MS) {
        const fresh: Entry = { hash, status: 0 };
        const ok = await this.valkey.set(redisKey, JSON.stringify(fresh), 'EX', IN_PROGRESS_TTL_S, 'NX');
        if (ok) return null;
        const raw = await this.valkey.get(redisKey);
        if (!raw) continue;
        const entry = JSON.parse(raw) as Entry;
        if (entry.hash !== hash) throw new DomainError('IDEMPOTENCY_KEY_REUSED');
        if (entry.status >= 400) {
          await this.valkey.set(redisKey, JSON.stringify(fresh), 'EX', IN_PROGRESS_TTL_S);
          return null;
        }
        if (entry.status > 0) return entry.status;
        await new Promise((resolve) => setTimeout(resolve, WAIT_STEP_MS));
      }
    } catch (error) {
      if (error instanceof DomainError) throw error;
      this.logger.warn('Valkey niedostępny – publiczne POST bez idempotencji');
      return null;
    }
    throw new DomainError('RATE_LIMITED', 'Poprzednie żądanie z tym kluczem jest w toku.', {
      retryAfterSeconds: 1,
    });
  }

  /** Wynik żądania; błąd 5xx zwalnia klucz. */
  async finish(key: string, hash: string, status: number): Promise<void> {
    const redisKey = `idem:pub:${key}`;
    try {
      if (status >= 500) await this.valkey.del(redisKey);
      else await this.valkey.set(redisKey, JSON.stringify({ hash, status } satisfies Entry), 'EX', TTL_S);
    } catch {
      // Brak zapisu = brak idempotencji dla powtórki; sama operacja się udała.
    }
  }
}
