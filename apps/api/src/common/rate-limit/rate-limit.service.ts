import { Inject, Injectable, Logger } from '@nestjs/common';
import type Valkey from 'iovalkey';
import { uuidv7 } from '../ids.js';
import { VALKEY } from '../../infra/infra.module.js';
import { DomainError } from '../errors/domain-error.js';

/** Polityki limitów (03-api §1, NFR-405). */
export const RATE_POLICIES = {
  token: { limit: 120, windowMs: 60_000 },
  'login:account': { limit: 5, windowMs: 15 * 60_000 },
  'login:ip': { limit: 20, windowMs: 15 * 60_000 },
  'register:ip': { limit: 20, windowMs: 15 * 60_000 },
  'forgot:ip': { limit: 10, windowMs: 15 * 60_000 },
  'pair:ip': { limit: 10, windowMs: 10 * 60_000 },
  'resend:account:minute': { limit: 1, windowMs: 60_000 },
  'resend:account:hour': { limit: 5, windowMs: 60 * 60_000 },
} as const;

export type RatePolicy = keyof typeof RATE_POLICIES;

/** Przesuwne okno w sorted set: usuń stare wpisy, policz, dodaj bieżący (atomowo). */
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  return {0, tonumber(oldest[2]) + window - now}
end
redis.call('ZADD', key, now, ARGV[4])
redis.call('PEXPIRE', key, window)
return {1, 0}
`;

const MEMORY_MAX_KEYS = 10_000;

/**
 * Limity zapytań (IMP-112): przesuwne okno w Valkey; przy awarii Valkey licznik w pamięci procesu
 * (te same limity per zadanie – NFR-307), żeby API działało dalej.
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger('RateLimit');
  private readonly memory = new Map<string, number[]>();
  fallbackCount = 0;

  constructor(@Inject(VALKEY) private readonly valkey: Valkey) {}

  /** Zużywa jedno zapytanie; przekroczenie → `429 RATE_LIMITED` z `retryAfterSeconds`. */
  async consume(policy: RatePolicy, key: string, now = Date.now()): Promise<void> {
    const { limit, windowMs } = RATE_POLICIES[policy];
    const redisKey = `rl:${policy}:${key}`;
    let allowed: boolean;
    let retryMs: number;
    try {
      if (this.valkey.status !== 'ready') await this.valkey.connect().catch(() => undefined);
      const [ok, wait] = (await this.valkey.eval(
        SLIDING_WINDOW_LUA,
        1,
        redisKey,
        now,
        windowMs,
        limit,
        `${now}:${uuidv7()}`,
      )) as [number, number];
      allowed = ok === 1;
      retryMs = wait;
    } catch {
      this.fallbackCount++;
      if (this.fallbackCount % 100 === 1) this.logger.warn('Valkey niedostępny – limity w pamięci procesu');
      [allowed, retryMs] = this.consumeInMemory(redisKey, now, windowMs, limit);
    }
    if (!allowed) {
      throw new DomainError('RATE_LIMITED', undefined, {
        retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)),
      });
    }
  }

  private consumeInMemory(key: string, now: number, windowMs: number, limit: number): [boolean, number] {
    const hits = (this.memory.get(key) ?? []).filter((t) => t > now - windowMs);
    if (hits.length >= limit) return [false, (hits[0] as number) + windowMs - now];
    hits.push(now);
    this.memory.delete(key);
    this.memory.set(key, hits);
    if (this.memory.size > MEMORY_MAX_KEYS) this.memory.delete(this.memory.keys().next().value as string);
    return [true, 0];
  }
}
