import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { OrganizerModule } from '../organizer/organizer.module.js';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import { JudgeSessionsService } from './judge-sessions.service.js';

/** Tablety: parowanie, tokeny urządzeń, heartbeat, sesje sędziów (EP-04, IMP-140…143). */
@Module({
  imports: [AuthModule, OrganizerModule],
  controllers: [DevicesController],
  providers: [DevicesService, JudgeSessionsService],
  exports: [DevicesService],
})
export class DevicesModule {}
