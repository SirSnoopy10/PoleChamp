import { Inject, Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../../../db/client.js';
import { exportJob } from '../../../db/schema.js';
import type { ExportStorage } from '../../../infra/storage.js';
import { ExportDataService } from '../export-data.service.js';
import { EXPORT_STORAGE, EXPORT_TTL_MS, exportKey } from '../exports.service.js';
import type { PdfJob } from '../pdf.queue.js';
import { PdfRenderer } from './renderer.js';

/**
 * Procesor kolejki `pdf` (IMP-172 krok 6): render, zapis do S3 pod stałym kluczem (ponowienie
 * nadpisuje ten sam obiekt – brak duplikatów, TC-REL-007), `export_job` `DONE`/`FAILED`.
 */
@Injectable()
export class PdfProcessor {
  private readonly renderer = new PdfRenderer();
  /** Ostatnie czasy renderu – metryka `pdf_render_ms`. */
  readonly renderMs: number[] = [];

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ExportDataService) private readonly data: ExportDataService,
    @Inject(EXPORT_STORAGE) private readonly storage: ExportStorage,
  ) {}

  async process(job: Job<PdfJob>): Promise<{ key: string }> {
    const [row] = await this.db.select().from(exportJob).where(eq(exportJob.id, job.data.exportId));
    if (!row) return { key: '' };
    if (row.status === 'DONE' && row.s3Key) return { key: row.s3Key };
    await this.db.update(exportJob).set({ status: 'RUNNING' }).where(eq(exportJob.id, row.id));
    try {
      const started = Date.now();
      const data = await this.data.load(row);
      const pdf = await this.renderer.render(data, row.scope);
      this.renderMs.push(Date.now() - started);
      const key = exportKey(row.tournamentId, row.id);
      await this.storage.put(key, pdf, 'application/pdf', { 'results-hash': data.hash });
      const now = new Date();
      await this.db
        .update(exportJob)
        .set({
          status: 'DONE',
          s3Key: key,
          resultsVersions: data.versions,
          resultsHash: data.hash,
          finishedAt: now,
          expiresAt: new Date(now.getTime() + EXPORT_TTL_MS),
          error: null,
        })
        .where(eq(exportJob.id, row.id));
      return { key };
    } catch (err) {
      const last = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      await this.db
        .update(exportJob)
        .set({
          status: last ? 'FAILED' : 'QUEUED',
          error: (err as Error).message.slice(0, 500),
          finishedAt: last ? new Date() : null,
        })
        .where(eq(exportJob.id, row.id));
      throw err;
    }
  }
}
