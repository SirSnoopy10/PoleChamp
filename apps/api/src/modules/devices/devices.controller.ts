import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post } from '@nestjs/common';
import {
  DevicePatch,
  DeviceTokenRequest,
  Heartbeat,
  JudgeSessionCreate,
  PairRequest,
} from '@polechamp/contracts';
import type { z } from 'zod';
import { Auth, CurrentAuth, OrgUser, Public } from '../../common/auth/auth.decorators.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.guard.js';
import { zod } from '../../common/validation/zod.pipe.js';
import type { Claims, DeviceClaims, JudgeClaims } from '../auth/jwt.service.js';
import { DevicesService } from './devices.service.js';
import { JudgeSessionsService } from './judge-sessions.service.js';

type Out<S extends z.ZodType> = z.output<S>;

/** Identyfikator urządzenia z tokenu `device` albo `judge` (sędzia działa na tablecie). */
export const deviceOf = (claims: Claims): string => (claims.typ === 'judge' ? claims.dev : claims.sub);

/** Urządzenia i sesje sędziów (03-api §3.5, §4). */
@Controller()
export class DevicesController {
  constructor(
    @Inject(DevicesService) private readonly devices: DevicesService,
    @Inject(JudgeSessionsService) private readonly sessions: JudgeSessionsService,
  ) {}

  @Post('tournaments/:tournamentId/pairing-codes')
  @Auth('org')
  @HttpCode(201)
  pairingCode(@OrgUser() userId: string, @Param('tournamentId') id: string) {
    return this.devices.createPairingCode(userId, id);
  }

  @Post('devices/pair')
  @Public()
  @HttpCode(201)
  @RateLimit({ policy: 'pair:ip', key: (r) => r.ip })
  pair(@Body(zod(PairRequest)) body: Out<typeof PairRequest>) {
    return this.devices.pair(body);
  }

  @Post('devices/token')
  @Public()
  @HttpCode(200)
  @RateLimit({ policy: 'pair:ip', key: (r) => r.ip })
  token(@Body(zod(DeviceTokenRequest)) body: Out<typeof DeviceTokenRequest>) {
    return this.devices.token(body.deviceId, body.deviceSecret);
  }

  @Get('tournaments/:tournamentId/devices')
  @Auth('org')
  list(@OrgUser() userId: string, @Param('tournamentId') id: string) {
    return this.devices.list(userId, id);
  }

  @Patch('devices/:deviceId')
  @Auth('org')
  rename(
    @OrgUser() userId: string,
    @Param('deviceId') id: string,
    @Body(zod(DevicePatch)) body: Out<typeof DevicePatch>,
  ) {
    return this.devices.rename(userId, id, body.name);
  }

  @Delete('devices/:deviceId')
  @Auth('org')
  @HttpCode(204)
  async revoke(@OrgUser() userId: string, @Param('deviceId') id: string) {
    await this.devices.revoke(userId, id);
  }

  @Post('devices/me/heartbeat')
  @Auth('device', 'judge')
  @HttpCode(204)
  async heartbeat(@CurrentAuth() claims: Claims, @Body(zod(Heartbeat)) body: Out<typeof Heartbeat>) {
    await this.devices.heartbeat(deviceOf(claims), body);
  }

  @Post('judge-sessions')
  @Auth('device')
  @HttpCode(201)
  login(
    @CurrentAuth() claims: DeviceClaims,
    @Body(zod(JudgeSessionCreate)) body: Out<typeof JudgeSessionCreate>,
  ) {
    return this.sessions.login(claims, body.judgeId, body.pin);
  }

  @Delete('judge-sessions/current')
  @Auth('judge')
  @HttpCode(204)
  async logout(@CurrentAuth() claims: JudgeClaims) {
    await this.sessions.logout(claims);
  }
}
