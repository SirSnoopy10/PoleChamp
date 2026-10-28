import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { FastifyReply } from 'fastify';
import { from, type Observable, of, switchMap, catchError, throwError } from 'rxjs';
import { DB, type Db } from '../../db/client.js';
import { idempotencyKey } from '../../db/schema.js';
import type { AuthedRequest } from '../auth/auth.decorators.js';
import { DomainError, validationFailed } from '../errors/domain-error.js';
import { canonical, sha256Hex, UUID_RE } from '../ids.js';
import { PUBLIC_IDEMPOTENT_PATHS, PublicIdempotency } from './public-idempotency.js';

/** Wiersz w toku (odpowiedź jeszcze nie zapisana). */
const IN_PROGRESS = 0;
const WAIT_STEP_MS = 50;
const WAIT_MAX_MS = 5_000;

/**
 * `Idempotency-Key` dla POST organizatora (IMP-110, US-011): pierwszy zapis rezerwuje klucz,
 * powtórka z tą samą treścią zwraca zapisaną odpowiedź (`Idempotent-Replayed: true`), inna treść
 * → `422 IDEMPOTENCY_KEY_REUSED`. Równoległe żądanie czeka na wynik pierwszego. Błędy 5xx zwalniają klucz.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(PublicIdempotency) private readonly publicKeys: PublicIdempotency,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers['idempotency-key'];
    if (request.method !== 'POST' || header === undefined) return next.handle();
    const path = request.url.split('?')[0] ?? request.url;
    const isPublic = !request.auth && PUBLIC_IDEMPOTENT_PATHS.has(path);
    if (request.auth?.typ !== 'org' && !isPublic) return next.handle();
    if (typeof header !== 'string' || !UUID_RE.test(header)) {
      throw validationFailed([{ field: 'Idempotency-Key', code: 'INVALID_FORMAT' }]);
    }
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    if (isPublic) return this.interceptPublic(header, path, request.body, reply, next);
    const userId = (request.auth as NonNullable<AuthedRequest['auth']>).sub;
    const requestHash = sha256Hex(`${request.method} ${path} ${canonical(request.body ?? null)}`);
    const where = and(eq(idempotencyKey.key, header), eq(idempotencyKey.userId, userId));

    return from(this.reserve(header, userId, request.method, path, requestHash)).pipe(
      switchMap((existing) => {
        if (existing) {
          if (existing.requestHash !== requestHash) throw new DomainError('IDEMPOTENCY_KEY_REUSED');
          void reply.status(existing.responseStatus).header('Idempotent-Replayed', 'true');
          return of(existing.responseBody);
        }
        return next.handle().pipe(
          switchMap((body) =>
            from(
              this.db
                .update(idempotencyKey)
                .set({ responseStatus: reply.statusCode, responseBody: body ?? null })
                .where(where),
            ).pipe(switchMap(() => of(body))),
          ),
          catchError((error: unknown) => {
            const status = error instanceof DomainError ? error.status : 500;
            const cleanup =
              status >= 500
                ? this.db.delete(idempotencyKey).where(where)
                : this.db
                    .update(idempotencyKey)
                    .set({ responseStatus: status, responseBody: null })
                    .where(where);
            return from(cleanup).pipe(switchMap(() => throwError(() => error)));
          }),
        );
      }),
    );
  }

  /** Publiczne trasy auth (bez treści odpowiedzi): powtórka → zapisany status. */
  private interceptPublic(
    key: string,
    path: string,
    body: unknown,
    reply: FastifyReply,
    next: CallHandler,
  ): Observable<unknown> {
    const hash = this.publicKeys.hash(path, body);
    return from(this.publicKeys.reserve(key, hash)).pipe(
      switchMap((status) => {
        if (status !== null) {
          void reply.status(status).header('Idempotent-Replayed', 'true');
          return of(undefined);
        }
        return next.handle().pipe(
          switchMap((result) =>
            from(this.publicKeys.finish(key, hash, reply.statusCode)).pipe(switchMap(() => of(result))),
          ),
          catchError((error: unknown) => {
            const code = error instanceof DomainError ? error.status : 500;
            return from(this.publicKeys.finish(key, hash, code)).pipe(
              switchMap(() => throwError(() => error)),
            );
          }),
        );
      }),
    );
  }

  /** Rezerwuje klucz; zwraca zakończony wpis, jeśli już istnieje (czeka na wpis w toku). */
  private async reserve(
    key: string,
    userId: string,
    method: string,
    path: string,
    requestHash: string,
  ): Promise<typeof idempotencyKey.$inferSelect | null> {
    const inserted = await this.db
      .insert(idempotencyKey)
      .values({ key, userId, method, path, requestHash, responseStatus: IN_PROGRESS })
      .onConflictDoNothing()
      .returning();
    if (inserted.length > 0) return null;
    for (let waited = 0; waited <= WAIT_MAX_MS; waited += WAIT_STEP_MS) {
      const [row] = await this.db
        .select()
        .from(idempotencyKey)
        .where(and(eq(idempotencyKey.key, key), eq(idempotencyKey.userId, userId)));
      if (!row) return this.reserve(key, userId, method, path, requestHash);
      if (row.responseStatus !== IN_PROGRESS) {
        if (row.responseStatus >= 400 && row.requestHash === requestHash) {
          // Poprzednia próba zakończyła się błędem 4xx – wykonujemy ponownie z tym samym kluczem.
          await this.db
            .update(idempotencyKey)
            .set({ responseStatus: IN_PROGRESS })
            .where(and(eq(idempotencyKey.key, key), eq(idempotencyKey.userId, userId)));
          return null;
        }
        return row;
      }
      await new Promise((resolve) => setTimeout(resolve, WAIT_STEP_MS));
    }
    throw new DomainError('RATE_LIMITED', 'Poprzednie żądanie z tym kluczem jest w toku.', {
      retryAfterSeconds: 1,
    });
  }
}
