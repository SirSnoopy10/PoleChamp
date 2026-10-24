import { Module } from '@nestjs/common';
import { OrganizerModule } from '../organizer/organizer.module.js';
import { ChangesController } from './changes.controller.js';
import { ChangesService } from './changes.service.js';
import {
  JudgeSessionEndedHandler,
  JudgeSessionStartedHandler,
  PinAttemptsReportHandler,
} from './handlers/judge-session.handlers.js';
import { SubmitScoreSheetHandler } from './handlers/submit-score-sheet.js';
import { PushController } from './push.controller.js';
import { PushService } from './push.service.js';
import { SheetWriter } from './sheet-writer.js';
import { SnapshotController } from './snapshot.controller.js';
import { SnapshotService } from './snapshot.service.js';

/** Synchronizacja tabletów: migawka, dziennik zmian, push mutacji (EP-04, IMP-144…149). */
@Module({
  imports: [OrganizerModule],
  controllers: [SnapshotController, ChangesController, PushController],
  providers: [
    SnapshotService,
    ChangesService,
    PushService,
    SheetWriter,
    SubmitScoreSheetHandler,
    JudgeSessionStartedHandler,
    JudgeSessionEndedHandler,
    PinAttemptsReportHandler,
  ],
  exports: [SheetWriter],
})
export class SyncModule {}
