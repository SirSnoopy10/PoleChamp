import { Controller, Get, Inject, Param } from '@nestjs/common';
import { Auth, CurrentAuth, type JudgeClaims, OrgUser } from '../../common/auth/auth.decorators.js';
import { ScoreSheetsReadService } from './score-sheets-read.service.js';

/** Oceny startu i historia rewizji dla organizatora (03-api §3.6; IMP-152). */
@Controller()
@Auth('org')
export class OrganizerScoreSheetsController {
  constructor(@Inject(ScoreSheetsReadService) private readonly sheets: ScoreSheetsReadService) {}

  @Get('entries/:entryId/score-sheets')
  entrySheets(@OrgUser() userId: string, @Param('entryId') id: string) {
    return this.sheets.entrySheets(userId, id);
  }

  @Get('score-sheets/:scoreSheetId/revisions')
  revisions(@OrgUser() userId: string, @Param('scoreSheetId') id: string) {
    return this.sheets.revisions(userId, id);
  }
}

/** Własne arkusze sędziego po zalogowaniu online, np. na nowym tablecie (03-api §4; IMP-153). */
@Controller('judge/me')
export class JudgeScoreSheetsController {
  constructor(@Inject(ScoreSheetsReadService) private readonly sheets: ScoreSheetsReadService) {}

  @Get('score-sheets')
  @Auth('judge')
  own(@CurrentAuth() claims: JudgeClaims) {
    return this.sheets.ownSheets(claims.sub);
  }
}
