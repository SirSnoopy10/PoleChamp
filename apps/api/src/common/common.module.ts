import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditService, ChangeLogService, DomainEventService } from '../modules/audit/audit.service.js';
import { JwtService } from '../modules/auth/jwt.service.js';
import { AuthGuard } from './auth/auth.guard.js';
import { PrincipalService } from './auth/principal.service.js';
import { EtagInterceptor } from './concurrency/etag.js';
import { IdempotencyInterceptor } from './idempotency/idempotency.interceptor.js';
import { PublicIdempotency } from './idempotency/public-idempotency.js';
import { RateLimitGuard } from './rate-limit/rate-limit.guard.js';
import { RateLimitService } from './rate-limit/rate-limit.service.js';

/**
 * Mechanizmy przekrojowe: uwierzytelnianie (domyślna odmowa), limity, idempotencja, ETag,
 * audyt / dziennik zmian / outbox zdarzeń. Kolejność guardów: najpierw token, potem limity.
 */
@Global()
@Module({
  providers: [
    JwtService,
    PrincipalService,
    RateLimitService,
    AuditService,
    ChangeLogService,
    DomainEventService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_INTERCEPTOR, useClass: EtagInterceptor },
    PublicIdempotency,
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
  exports: [
    JwtService,
    PrincipalService,
    RateLimitService,
    AuditService,
    ChangeLogService,
    DomainEventService,
  ],
})
export class CommonModule {}
