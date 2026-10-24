import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../../db/client.js';
import { device, judgeSession } from '../../db/schema.js';
import { type Claims, InvalidTokenError, JwtService } from '../../modules/auth/jwt.service.js';
import { DomainError } from '../errors/domain-error.js';

/** Claims z czasem wygaśnięcia tokenu (s) – kanał realtime rozłącza po `exp` (`auth.expired`). */
export type Principal = Claims & { exp?: number };

/**
 * Uwierzytelnienie tokenu wspólne dla REST (guard) i realtime (handshake): podpis i claims,
 * unieważnione urządzenie → `DEVICE_REVOKED`, token sędziego tylko w otwartej sesji.
 */
@Injectable()
export class PrincipalService {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(DB) private readonly db: Db,
  ) {}

  async verify(token: string | null | undefined): Promise<Principal> {
    if (!token) throw new DomainError('UNAUTHENTICATED');
    let claims: Principal;
    try {
      claims = await this.jwt.verify(token);
    } catch (error) {
      if (error instanceof InvalidTokenError) throw new DomainError('UNAUTHENTICATED');
      throw error;
    }
    if (claims.typ !== 'org') {
      const deviceId = claims.typ === 'device' ? claims.sub : claims.dev;
      const [row] = await this.db
        .select({ revokedAt: device.revokedAt })
        .from(device)
        .where(eq(device.id, deviceId));
      if (!row || row.revokedAt) throw new DomainError('DEVICE_REVOKED');
      if (claims.typ === 'judge') {
        // Token sędziego jest ważny tylko w otwartej sesji (wylogowanie, REPLACED, reset PIN-u).
        const [session] = await this.db
          .select({ endedAt: judgeSession.endedAt })
          .from(judgeSession)
          .where(eq(judgeSession.id, claims.sid));
        if (!session || session.endedAt) throw new DomainError('UNAUTHENTICATED');
      }
    }
    return claims;
  }
}
