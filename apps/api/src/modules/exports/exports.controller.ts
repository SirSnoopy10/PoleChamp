import { Body, Controller, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { ExportCreate } from '@polechamp/contracts';
import type { z } from 'zod';
import { Auth, OrgUser } from '../../common/auth/auth.decorators.js';
import { zod } from '../../common/validation/zod.pipe.js';
import { ExportsService } from './exports.service.js';

/** Eksport PDF wyników (03-api §3.6, FR-705) – zlecenie 202 i odpytywanie statusu. */
@Controller('exports')
@Auth('org')
export class ExportsController {
  constructor(@Inject(ExportsService) private readonly exports: ExportsService) {}

  @Post()
  @HttpCode(202)
  create(@OrgUser() userId: string, @Body(zod(ExportCreate)) body: z.output<typeof ExportCreate>) {
    return this.exports.create(userId, body);
  }

  @Get(':exportId')
  get(@OrgUser() userId: string, @Param('exportId') id: string) {
    return this.exports.get(userId, id);
  }
}
