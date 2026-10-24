import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type {
  Claims,
  DeviceClaims,
  JudgeClaims,
  OrgClaims,
  TokenType,
} from '../../modules/auth/jwt.service.js';

export const AUTH_METADATA = 'polechamp:auth';

/** `public` – bez tokenu (limity per IP); inaczej dozwolone typy tokenów (03-api §2). */
export type AuthRequirement = { public: true } | { public: false; types: TokenType[] };

/** Trasa bez uwierzytelnienia (PUBLIC w 03-api §2). */
export const Public = () => SetMetadata(AUTH_METADATA, { public: true } satisfies AuthRequirement);

/** Trasa wymagająca tokenu jednego z typów; inny typ → 403 FORBIDDEN (05-bezpieczenstwo §4.1). */
export const Auth = (...types: TokenType[]) =>
  SetMetadata(AUTH_METADATA, { public: false, types } satisfies AuthRequirement);

export type AuthedRequest = FastifyRequest & { auth?: Claims };

/** Claims bieżącego tokenu. */
export const CurrentAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Claims | undefined => {
    return ctx.switchToHttp().getRequest<AuthedRequest>().auth;
  },
);

/** Identyfikator zalogowanego organizatora (tylko na trasach `@Auth('org')`). */
export const OrgUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const auth = ctx.switchToHttp().getRequest<AuthedRequest>().auth as OrgClaims;
  return auth.sub;
});

export type { Claims, DeviceClaims, JudgeClaims, OrgClaims };
