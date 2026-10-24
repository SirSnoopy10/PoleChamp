import { Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { RejectionResolution } from '@polechamp/contracts';
import { z } from 'zod';
import { Auth, OrgUser } from '../../common/auth/auth.decorators.js';
import { zod } from '../../common/validation/zod.pipe.js';
import { RejectedService } from './rejected.service.js';

const RejectedQuery = z.object({ resolution: RejectionResolution.optional() });

/** Odrzucone zgłoszenia ocen (03-api §3.6, SCR-ORG-22) – tylko organizator-właściciel. */
@Controller()
@Auth('org')
export class RejectedController {
  constructor(@Inject(RejectedService) private readonly rejected: RejectedService) {}

  @Get('tournaments/:tournamentId/rejected-submissions')
  list(
    @OrgUser() userId: string,
    @Param('tournamentId') id: string,
    @Query(zod(RejectedQuery)) query: z.output<typeof RejectedQuery>,
  ) {
    return this.rejected.list(userId, id, query.resolution);
  }

  @Post('rejected-submissions/:rejectedId/accept')
  @HttpCode(200)
  accept(@OrgUser() userId: string, @Param('rejectedId') id: string) {
    return this.rejected.accept(userId, id);
  }

  @Post('rejected-submissions/:rejectedId/discard')
  @HttpCode(200)
  discard(@OrgUser() userId: string, @Param('rejectedId') id: string) {
    return this.rejected.discard(userId, id);
  }
}
