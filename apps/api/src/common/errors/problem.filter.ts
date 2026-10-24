import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { errorMessage } from '@polechamp/i18n';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { requestContext } from '../request-context.js';
import { DomainError } from './domain-error.js';

const PROBLEM_BASE = 'https://api.polechamp.app/problems/';
const kebab = (code: string) => code.toLowerCase().replaceAll('_', '-');

/** Błędy frameworka (np. 404 trasy, 413 treści) → kody katalogu. */
function fromHttpException(e: HttpException): DomainError {
  const status = e.getStatus();
  if (status === 404) return new DomainError('NOT_FOUND');
  if (status === 401) return new DomainError('UNAUTHENTICATED');
  if (status === 403) return new DomainError('FORBIDDEN');
  if (status === 429) return new DomainError('RATE_LIMITED');
  if (status === 400 || status === 413 || status === 415)
    return new DomainError('VALIDATION_FAILED', e.message, {}, status);
  if (status === 428) return new DomainError('CONFLICT_VERSION', 'Wymagany nagłówek If-Match.', {}, 428);
  return new DomainError('INTERNAL', undefined, {}, status);
}

/**
 * Globalny filtr RFC 9457 (IMP-101): każdy błąd jako `application/problem+json` z kodem z katalogu
 * i `requestId`; nieznane wyjątki maskowane jako `500 INTERNAL` (stos tylko w logu).
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ProblemDetails');

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      // Kanał realtime: błąd handlera tylko w logu, klient dostaje kod bez szczegółów.
      const code = exception instanceof DomainError ? exception.code : 'INTERNAL';
      if (code === 'INTERNAL') this.logger.error({ err: exception }, 'Błąd handlera realtime');
      host
        .switchToWs()
        .getClient<{ emit: (event: string, data: unknown) => void }>()
        .emit('exception', { code });
      return;
    }
    const http = host.switchToHttp();
    const reply = http.getResponse<FastifyReply>();
    const request = http.getRequest<FastifyRequest>();

    let error: DomainError;
    if (exception instanceof DomainError) error = exception;
    else if (exception instanceof HttpException) error = fromHttpException(exception);
    else if ((exception as { statusCode?: number })?.statusCode === 413) {
      error = new DomainError('VALIDATION_FAILED', 'Treść żądania jest za duża.', {}, 413);
    } else if ((exception as { code?: string })?.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
      error = new DomainError('VALIDATION_FAILED', 'Nieobsługiwany typ treści.', {}, 415);
    } else {
      error = new DomainError('INTERNAL');
      this.logger.error({ err: exception, requestId: requestContext.requestId() }, 'Nieobsłużony wyjątek');
    }

    const { errors, retryAfterSeconds, remainingAttempts, requiresReset, body } = error.extras;
    const problem = {
      type: `${PROBLEM_BASE}${kebab(error.code)}`,
      title: errorMessage(error.code, {}, { requiresReset: requiresReset ?? false }),
      status: error.status,
      code: error.code,
      ...(error.code !== 'INTERNAL' && error.detail ? { detail: error.detail } : {}),
      instance: request.url.split('?')[0],
      requestId: requestContext.requestId() ?? String(request.id),
      ...(errors ? { errors } : {}),
      ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
      ...(remainingAttempts !== undefined ? { remainingAttempts } : {}),
      ...(requiresReset !== undefined ? { requiresReset } : {}),
      ...body,
    };

    if (retryAfterSeconds !== undefined) void reply.header('Retry-After', String(retryAfterSeconds));
    if (error.status === 401) void reply.header('WWW-Authenticate', 'Bearer');
    void reply.status(error.status).type('application/problem+json').send(problem);
  }
}
