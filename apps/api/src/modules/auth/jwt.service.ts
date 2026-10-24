import { Inject, Injectable } from '@nestjs/common';
import { errors as joseErrors, importJWK, type JWK, jwtVerify, type JWTVerifyGetKey, SignJWT } from 'jose';
import { uuidv7 } from '../../common/ids.js';
import { ENV, type Env } from '../../config/env.js';

/** Klucz z `importJWK` (bez typów DOM w lib). */
type ImportedKey = Awaited<ReturnType<typeof importJWK>>;

export type TokenType = 'org' | 'device' | 'judge';

export interface OrgClaims {
  typ: 'org';
  sub: string;
  /** Rodzina refresh tokenów sesji – wylogowanie unieważnia tylko ją. */
  fam?: string;
}
export interface DeviceClaims {
  typ: 'device';
  sub: string;
  trn: string;
}
export interface JudgeClaims {
  typ: 'judge';
  sub: string;
  dev: string;
  trn: string;
  sid: string;
}
export type Claims = OrgClaims | DeviceClaims | JudgeClaims;

/** Czas życia tokenów (05-bezpieczenstwo §2–3): org 15 min, urządzenie 1 h, sędzia 12 h. */
export const TOKEN_TTL_SECONDS: Record<TokenType, number> = { org: 900, device: 3600, judge: 43_200 };
export const AUDIENCE = 'polechamp-api';

interface KeySet {
  activeKid: string;
  privateKey: ImportedKey;
  publicKeys: Map<string, ImportedKey>;
}

export class InvalidTokenError extends Error {}

/**
 * Tokeny ES256 z `kid` (IMP-113, ADR-008): podpis aktywnym kluczem, weryfikacja aktywnym lub poprzednim
 * (rotacja bez wylogowania). Odrzuca `alg: none`, HS256 i nieznane `kid`.
 */
@Injectable()
export class JwtService {
  private keys?: Promise<KeySet>;

  constructor(@Inject(ENV) private readonly env: Env) {}

  private loadKeys(): Promise<KeySet> {
    this.keys ??= (async () => {
      const parsed = JSON.parse(this.env.JWT_KEYS) as {
        active: { kid: string; privateJwk: JWK };
        previous?: { kid: string; publicJwk: JWK };
      };
      const { d: _private, ...publicJwk } = parsed.active.privateJwk;
      const publicKeys = new Map<string, ImportedKey>([
        [parsed.active.kid, (await importJWK({ ...publicJwk, alg: 'ES256' }, 'ES256')) as ImportedKey],
      ]);
      if (parsed.previous) {
        publicKeys.set(
          parsed.previous.kid,
          (await importJWK({ ...parsed.previous.publicJwk, alg: 'ES256' }, 'ES256')) as ImportedKey,
        );
      }
      return {
        activeKid: parsed.active.kid,
        privateKey: (await importJWK({ ...parsed.active.privateJwk, alg: 'ES256' }, 'ES256')) as ImportedKey,
        publicKeys,
      };
    })();
    return this.keys;
  }

  async sign(claims: Claims): Promise<{ token: string; expiresIn: number }> {
    const keys = await this.loadKeys();
    const expiresIn = TOKEN_TTL_SECONDS[claims.typ];
    const { sub, ...rest } = claims;
    const token = await new SignJWT({ ...rest })
      .setProtectedHeader({ alg: 'ES256', kid: keys.activeKid, typ: 'JWT' })
      .setSubject(sub)
      .setIssuer(this.env.JWT_ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setJti(uuidv7())
      .setExpirationTime(`${expiresIn}s`)
      .sign(keys.privateKey);
    return { token, expiresIn };
  }

  async verify(token: string): Promise<Claims> {
    const keys = await this.loadKeys();
    const getKey: JWTVerifyGetKey = (header) => {
      const key = header.kid ? keys.publicKeys.get(header.kid) : undefined;
      if (!key) throw new InvalidTokenError('Nieznany kid');
      return key;
    };
    try {
      const { payload } = await jwtVerify(token, getKey, {
        algorithms: ['ES256'],
        issuer: this.env.JWT_ISSUER,
        audience: AUDIENCE,
      });
      if (!payload.sub || !['org', 'device', 'judge'].includes(payload.typ as string)) {
        throw new InvalidTokenError('Niepoprawne claims');
      }
      return { ...(payload as object), sub: payload.sub } as Claims;
    } catch (error) {
      if (error instanceof InvalidTokenError || error instanceof joseErrors.JOSEError)
        throw new InvalidTokenError();
      throw error;
    }
  }
}
