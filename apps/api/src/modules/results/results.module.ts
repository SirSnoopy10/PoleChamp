import { Module } from '@nestjs/common';
import { OrganizerModule } from '../organizer/organizer.module.js';
import { ResultsReadService } from './results-read.service.js';
import { ResultsController } from './results.controller.js';

/** Rankingi kategorii i turnieju dla organizatora (EP-04, IMP-151). */
@Module({
  imports: [OrganizerModule],
  controllers: [ResultsController],
  providers: [ResultsReadService],
  exports: [ResultsReadService],
})
export class ResultsModule {}
