import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { DomainError } from '../../common/errors/domain-error.js';
import { DB, type Db } from '../../db/client.js';
import { one } from '../../db/one.js';
import { OwnershipRepository } from '../../db/repositories/ownership.repository.js';
import { category, exportJob, tournament } from '../../db/schema.js';
import { withTx } from '../../db/tx.js';
import { UUID_RE } from '../../common/ids.js';
import type { ExportStorage } from '../../infra/storage.js';
import { AuditService } from '../audit/audit.service.js';
import { ExportDataService, type ExportTarget } from './export-data.service.js';
import { PdfProducer } from './pdf.queue.js';

export const EXPORT_STORAGE = Symbol('EXPORT_STORAGE');

/** Ważność pliku eksportu (02-model-danych §2.24). */
export const EXPORT_TTL_MS = 7 * 24 * 3600 * 1000;

export const exportKey = (tournamentId: string, exportId: string) =>
  `exports/${tournamentId}/${exportId}.pdf`;

/** Nazwa pliku do pobrania: „wyniki-mistrzostwa-polski.pdf”. */
export function exportFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `wyniki-${slug || 'turniej'}.pdf`;
}

type ApiStatus = 'PENDING' | 'READY' | 'FAILED';

/** Zlecenia eksportu PDF i linki do pobrania (03-api §3.6, IMP-171). */
@Injectable()
export class ExportsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(OwnershipRepository) private readonly owned: OwnershipRepository,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ExportDataService) private readonly data: ExportDataService,
    @Inject(PdfProducer) private readonly pdf: PdfProducer,
    @Inject(EXPORT_STORAGE) private readonly storage: ExportStorage,
  ) {}

  async create(ownerId: string, input: ExportTarget): Promise<{ exportId: string }> {
    const t = await this.owned.tournament(this.db, input.tournamentId, ownerId);
    const categoryId = input.scope === 'CATEGORY' ? (input.categoryId ?? null) : null;
    if (categoryId) {
      const { category: c } = await this.owned.category(this.db, categoryId, ownerId);
      if (c.tournamentId !== t.id) throw new DomainError('NOT_FOUND');
    }
    const { versions, hash } = await this.data.load({ ...input, categoryId });

    // Gotowy plik dla tych samych wyników (wersje i suma kontrolna) i niewygasły – bez ponownego renderu.
    const [reusable] = await this.db
      .select({ id: exportJob.id })
      .from(exportJob)
      .where(
        and(
          eq(exportJob.tournamentId, t.id),
          eq(exportJob.scope, input.scope),
          categoryId ? eq(exportJob.categoryId, categoryId) : sql`${exportJob.categoryId} IS NULL`,
          eq(exportJob.status, 'DONE'),
          eq(exportJob.resultsHash, hash),
          sql`${exportJob.resultsVersions} = ${JSON.stringify(versions)}::jsonb`,
          gt(exportJob.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(exportJob.createdAt))
      .limit(1);
    if (reusable) return { exportId: reusable.id };

    const job = await withTx(this.db, async (tx) => {
      const row = one(
        await tx
          .insert(exportJob)
          .values({
            tournamentId: t.id,
            scope: input.scope,
            categoryId,
            resultsVersions: versions,
            resultsHash: hash,
            createdBy: ownerId,
          })
          .returning(),
      );
      await this.audit.record(tx, {
        action: 'EXPORT_REQUESTED',
        tournamentId: t.id,
        entityType: 'EXPORT',
        entityId: row.id,
        after: { scope: input.scope, categoryId, resultsVersions: versions, resultsHash: hash },
      });
      return row;
    });
    await this.pdf.enqueue(job.id);
    return { exportId: job.id };
  }

  async get(ownerId: string, exportId: string) {
    if (!UUID_RE.test(exportId)) throw new DomainError('NOT_FOUND');
    const [row] = await this.db
      .select({ job: exportJob, tournamentName: tournament.name, categoryName: category.name })
      .from(exportJob)
      .innerJoin(tournament, eq(tournament.id, exportJob.tournamentId))
      .leftJoin(category, eq(category.id, exportJob.categoryId))
      .where(
        and(
          eq(exportJob.id, exportId),
          eq(tournament.ownerId, ownerId),
          sql`${tournament.deletedAt} IS NULL`,
        ),
      );
    if (!row) throw new DomainError('NOT_FOUND');
    const { job } = row;
    const expired = job.expiresAt !== null && job.expiresAt <= new Date();
    const status: ApiStatus =
      job.status === 'DONE' ? (expired ? 'FAILED' : 'READY') : job.status === 'FAILED' ? 'FAILED' : 'PENDING';
    if (status !== 'READY' || !job.s3Key) return { status, resultsHash: job.resultsHash };
    const name = row.categoryName ? `${row.tournamentName} ${row.categoryName}` : row.tournamentName;
    return {
      status,
      resultsHash: job.resultsHash,
      downloadUrl: await this.storage.signedUrl(job.s3Key, exportFileName(name)),
      expiresAt: job.expiresAt?.toISOString(),
    };
  }
}
