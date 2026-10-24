import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../../db/client.js';
import { device } from '../../db/schema.js';
import { DomainError } from '../errors/domain-error.js';
import { requestContext } from '../request-context.js';
import { AUTH_METADATA, type AuthedRequest, type AuthRequirement } from './auth.decorators.js';
import { PrincipalService } from './principal.service.js';

/**
 * Globalny guard (IMP-113). Domyślnie odmawia – każda trasa deklaruje `@Public()` albo `@Auth(...)`.
 * Brak/nieważny token → 401 UNAUTHENTICATED, unieważnione urządzenie → 401 DEVICE_REVOKED,
 * zły typ tokenu → 403 FORBIDDEN. Własność zasobu sprawdzają repozytoria (cudzy → 404).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrincipalService) private readonly principals: PrincipalService,
    @Inject(DB) private readonly db: Db,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Kanał realtime uwierzytelnia handshake w gatewayu (IMP-154).
    if (context.getType() !== 'http') return true;
    const requirement = this.reflector.getAllAndOverride<AuthRequirement | undefined>(AUTH_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requirement?.public) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers.authorization;
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    // Uwierzytelnienie (401) przed autoryzacją (403): najpierw token i stan urządzenia, potem typ tokenu.
    const claims = await this.principals.verify(token);
    if (claims.typ !== 'org') {
      // Każde żądanie tabletu to kontakt (stan online – IMP-142).
      const deviceId = claims.typ === 'device' ? claims.sub : claims.dev;
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
