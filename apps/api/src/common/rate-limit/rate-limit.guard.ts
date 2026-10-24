import { type CanActivate, type ExecutionContext, Inject, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthedRequest } from '../auth/auth.decorators.js';
import { type RatePolicy, RateLimitService } from './rate-limit.service.js';

export const RATE_LIMIT_METADATA = 'polechamp:rate-limit';

export interface RateLimitRule {
  policy: RatePolicy;
  key: (request: AuthedRequest) => string | null | undefined;
}

/** Limity trasy, np. `@RateLimit({ policy: 'login:ip', key: (r) => r.ip })`. Klucz null = pomiń regułę. */
export const RateLimit = (...rules: RateLimitRule[]) => SetMetadata(RATE_LIMIT_METADATA, rules);

/** Limity trasy oraz domyślny limit 120/min na token (IMP-112) – po uwierzytelnieniu. */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(RateLimitService) private readonly limits: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const rules =
      this.reflector.get<RateLimitRule[] | undefined>(RATE_LIMIT_METADATA, context.getHandler()) ?? [];
    for (const rule of rules) {
      const key = rule.key(request);
      if (key) await this.limits.consume(rule.policy, key.toLowerCase());
    }
    if (request.auth) await this.limits.consume('token', `${request.auth.typ}:${request.auth.sub}`);
    return true;
  }
}
