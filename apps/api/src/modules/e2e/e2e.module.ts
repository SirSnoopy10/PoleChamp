import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { OrganizerModule } from '../organizer/organizer.module.js';
import { SyncModule } from '../sync/sync.module.js';
import { E2eSeedService } from './e2e-seed.service.js';
import { E2eController } from './e2e.controller.js';

/** Helpery E2E (IMP-454) – dołączane do `AppModule` tylko przy `E2E_HELPERS=1`. */
@Module({
  imports: [AuthModule, OrganizerModule, SyncModule],
  controllers: [E2eController],
  providers: [E2eSeedService],
})
export class E2eModule {}
