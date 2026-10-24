import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../../db/client.js';
import { device, judgeSession } from '../../db/schema.js';
import { InvalidTokenError, JwtService } from '../../modules/auth/jwt.service.js';
import { DomainError } from '../errors/domain-error.js';
import { requestContext } from '../request-context.js';
import { AUTH_METADATA, type AuthedRequest, type AuthRequirement } from './auth.decorators.js';

/**
 * Globalny guard (IMP-113). Domyślnie odmawia – każda trasa deklaruje `@Public()` albo `@Auth(...)`.
 * Brak/nieważny token → 401 UNAUTHENTICATED, unieważnione urządzenie → 401 DEVICE_REVOKED,
 * zły typ tokenu → 403 FORBIDDEN. Własność zasobu sprawdzają repozytoria (cudzy → 404).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(DB) private readonly db: Db,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<AuthRequirement | undefined>(AUTH_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requirement?.public) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers.authorization;
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token) throw new DomainError('UNAUTHENTICATED');

    let claims;
    try {
      claims = await this.jwt.verify(token);
    } catch (error) {
      if (error instanceof InvalidTokenError) throw new DomainError('UNAUTHENTICATED');
      throw error;
    }
    // Uwierzytelnienie (401) przed autoryzacją (403): najpierw stan urządzenia, potem typ tokenu.
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
      // Każde żądanie tabletu to kontakt (stan online – IMP-142).
      await this.db.update(device).set({ lastSeenAt: new Date() }).where(eq(device.id, deviceId));
    }
    // Trasa bez deklaracji – domyślna odmowa (błąd programisty wykrywany testem zgodności tras).
    if (!requirement || !requirement.types.includes(claims.typ)) throw new DomainError('FORBIDDEN');

    request.auth = claims;
    requestContext.setActor(
      claims.typ === 'org'
        ? { type: 'ORGANIZER', id: claims.sub }
        : claims.typ === 'device'
          ? { type: 'DEVICE', id: claims.sub, deviceId: claims.sub, tournamentId: claims.trn }
          : { type: 'JUDGE', id: claims.sub, deviceId: claims.dev, tournamentId: claims.trn },
    );
    return true;
  }
}
