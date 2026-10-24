import { Module } from '@nestjs/common';
import { ChangesController } from './changes.controller.js';
import { ChangesService } from './changes.service.js';
import { SnapshotController } from './snapshot.controller.js';
import { SnapshotService } from './snapshot.service.js';

/** Synchronizacja tabletów: migawka, dziennik zmian, push mutacji (EP-04, IMP-144…149). */
@Module({
  controllers: [SnapshotController, ChangesController],
  providers: [SnapshotService, ChangesService],
})
export class SyncModule {}
