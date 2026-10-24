import { Module } from '@nestjs/common';
import { OrganizerModule } from '../organizer/organizer.module.js';
import { ResultsModule } from '../results/results.module.js';
import { JudgeScoreSheetsController, OrganizerScoreSheetsController } from './organizer-read.controller.js';
import { ScoreSheetsReadService } from './score-sheets-read.service.js';

/** Odczyt ocen: organizator (start, rewizje) i sędzia (własne arkusze) – EP-04, IMP-152, IMP-153. */
@Module({
  imports: [OrganizerModule, ResultsModule],
  controllers: [OrganizerScoreSheetsController, JudgeScoreSheetsController],
  providers: [ScoreSheetsReadService],
})
export class ScoringModule {}
