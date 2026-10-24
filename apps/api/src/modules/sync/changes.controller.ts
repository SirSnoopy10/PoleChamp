import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ChangesQuery } from '@polechamp/contracts';
import type { z } from 'zod';
import { Auth, type Claims, CurrentAuth } from '../../common/auth/auth.decorators.js';
import { zod } from '../../common/validation/zod.pipe.js';
import { ChangesService } from './changes.service.js';

/** Zmiany od kursora dla tabletu (03-api §5.2) – token urządzenia albo sędziego. */
@Controller('sync')
export class ChangesController {
  constructor(@Inject(ChangesService) private readonly changes: ChangesService) {}

  @Get('changes')
  @Auth('device', 'judge')
  list(@CurrentAuth() claims: Claims, @Query(zod(ChangesQuery)) query: z.output<typeof ChangesQuery>) {
    return this.changes.changes(claims, query.since, query.limit);
  }
}
