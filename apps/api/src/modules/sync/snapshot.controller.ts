import { Controller, Get, Inject } from '@nestjs/common';
import { Auth, type Claims, CurrentAuth } from '../../common/auth/auth.decorators.js';
import { deviceOf } from '../devices/devices.controller.js';
import { SnapshotService } from './snapshot.service.js';

/**
 * Migawka turnieju dla tabletu (03-api §4) – odpowiedź kompresowana gzip (`@fastify/compress`).
 * Token sędziego też jest przyjmowany (TC-AUTHZ-056): dotyczy tego samego urządzenia.
 */
@Controller('sync')
export class SnapshotController {
  constructor(@Inject(SnapshotService) private readonly snapshots: SnapshotService) {}

  @Get('snapshot')
  @Auth('device', 'judge')
  snapshot(@CurrentAuth() claims: Claims) {
    return this.snapshots.snapshot(deviceOf(claims));
  }
}
