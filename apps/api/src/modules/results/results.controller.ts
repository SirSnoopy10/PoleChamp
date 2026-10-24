import { Controller, Get, Headers, Inject, Param, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Auth, OrgUser } from '../../common/auth/auth.decorators.js';
import { etag } from '../../common/concurrency/etag.js';
import { ResultsReadService } from './results-read.service.js';

/**
 * Rankingi dla organizatora (03-api §3.6, SCR-ORG-08). `ETag` = wersja wyników, więc odświeżenie po
 * `results.updated` z `If-None-Match` bez zmian daje `304` (IMP-151).
 */
@Controller()
@Auth('org')
export class ResultsController {
  constructor(@Inject(ResultsReadService) private readonly results: ResultsReadService) {}

  @Get('categories/:categoryId/results')
  async category(
    @OrgUser() userId: string,
    @Param('categoryId') id: string,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const body = await this.results.category(userId, id);
    const tag = etag(body.resultsVersion);
    void reply.header('ETag', tag);
    if (ifNoneMatch === tag) {
      void reply.status(304);
      return undefined;
    }
    return body;
  }

  @Get('tournaments/:tournamentId/results')
  tournament(@OrgUser() userId: string, @Param('tournamentId') id: string) {
    return this.results.tournament(userId, id);
  }
}
