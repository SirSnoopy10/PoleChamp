import {
  type CallHandler,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { map, type Observable } from 'rxjs';
import { DomainError } from '../errors/domain-error.js';

export const etag = (version: number): string => `W/"${version}"`;

/** `If-Match: W/"7"` → 7. Brak → 428 (klient mapuje jak CONFLICT_VERSION), zły format → 409. */
export function parseIfMatch(header: string | string[] | undefined): number {
  if (header === undefined) throw new DomainError('CONFLICT_VERSION', 'Wymagany nagłówek If-Match.', {}, 428);
  const value = Array.isArray(header) ? header[0] : header;
  const match = /^(?:W\/)?"(\d+)"$/.exec(value?.trim() ?? '');
  if (!match) throw new DomainError('CONFLICT_VERSION', 'Niepoprawny nagłówek If-Match.');
  return Number(match[1]);
}

/** Wersja oczekiwana przez klienta – wymagana w PATCH/DELETE zasobów wersjonowanych (IMP-111). */
export const IfMatch = createParamDecorator((_data: unknown, ctx: ExecutionContext): number =>
  parseIfMatch(ctx.switchToHttp().getRequest<FastifyRequest>().headers['if-match']),
);

/** Odpowiedź z polem `version` dostaje nagłówek `ETag: W/"<version>"`. */
@Injectable()
export class EtagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    return next.handle().pipe(
      map((body: unknown) => {
        const version = (body as { version?: unknown } | null)?.version;
        if (typeof version === 'number') void reply.header('ETag', etag(version));
        return body;
      }),
    );
  }
}
