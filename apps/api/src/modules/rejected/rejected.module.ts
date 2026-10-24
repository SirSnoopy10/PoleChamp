import { Module } from '@nestjs/common';
import { OrganizerModule } from '../organizer/organizer.module.js';
import { SyncModule } from '../sync/sync.module.js';
import { RejectedController } from './rejected.controller.js';
import { RejectedService } from './rejected.service.js';

/** Odrzucone zgłoszenia ocen – decyzje organizatora (EP-04, IMP-149). */
@Module({
  imports: [OrganizerModule, SyncModule],
  controllers: [RejectedController],
  providers: [RejectedService],
})
export class RejectedModule {}
