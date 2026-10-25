import { Module } from '@nestjs/common';
import { OrganizerModule } from '../organizer/organizer.module.js';
import { AuditReadService } from './audit-read.service.js';
import { AuditController } from './audit.controller.js';

/** Odczyt dziennika audytu (EP-05, IMP-175); zapis – `AuditService` w `CommonModule`. */
@Module({
  imports: [OrganizerModule],
  controllers: [AuditController],
  providers: [AuditReadService],
})
export class AuditModule {}
