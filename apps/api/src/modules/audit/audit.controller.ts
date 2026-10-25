import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { AuditQuery } from '@polechamp/contracts';
import type { z } from 'zod';
import { Auth, OrgUser } from '../../common/auth/auth.decorators.js';
import { zod } from '../../common/validation/zod.pipe.js';
import { AuditReadService } from './audit-read.service.js';

/** Dziennik audytu turnieju (03-api §3.6, IMP-175) – tylko odczyt, tylko właściciel. */
@Controller()
@Auth('org')
export class AuditController {
  constructor(@Inject(AuditReadService) private readonly audit: AuditReadService) {}

  @Get('tournaments/:tournamentId/audit-log')
  list(
    @OrgUser() userId: string,
    @Param('tournamentId') id: string,
    @Query(zod(AuditQuery)) query: z.output<typeof AuditQuery>,
  ) {
    return this.audit.list(userId, id, query);
  }
}
