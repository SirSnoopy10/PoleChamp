import { Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { ENV, type Env } from '../../config/env.js';
import { ExportStorage } from '../../infra/storage.js';
import { ResultsModule } from '../results/results.module.js';
import { OrganizerModule } from '../organizer/organizer.module.js';
import { ExportDataService } from './export-data.service.js';
import { ExportsController } from './exports.controller.js';
import { EXPORT_STORAGE, ExportsService } from './exports.service.js';
import { PdfProducer } from './pdf.queue.js';

/** Eksporty PDF (EP-05, IMP-171): zlecenia w API, render w workerze (kolejka `pdf`). */
@Module({
  imports: [OrganizerModule, ResultsModule],
  controllers: [ExportsController],
  providers: [
    ExportDataService,
    ExportsService,
    PdfProducer,
    { provide: EXPORT_STORAGE, useFactory: (env: Env) => new ExportStorage(env), inject: [ENV] },
  ],
  exports: [ExportDataService, EXPORT_STORAGE],
})
export class ExportsModule implements OnModuleDestroy {
  constructor(@Inject(EXPORT_STORAGE) private readonly storage: ExportStorage) {}

  onModuleDestroy(): void {
    this.storage.close();
  }
}
