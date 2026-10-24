import { Inject, Injectable } from '@nestjs/common';
import type { RejectedSubmission, SubmitScoreSheetMutation } from '@polechamp/contracts';
import { sheetTotal } from '@polechamp/scoring';
import { and, desc, eq } from 'drizzle-orm';
import type { z } from 'zod';
import { DomainError } from '../../common/errors/domain-error.js';
import { UUID_RE } from '../../common/ids.js';
import { DB, type Db, type Tx } from '../../db/client.js';
import { one } from '../../db/one.js';
import { OwnershipRepository } from '../../db/repositories/ownership.repository.js';
import { athlete, category, entry, judge, rejectedSubmission, scoreSheet } from '../../db/schema.js';
import { withTx } from '../../db/tx.js';
import { AuditService } from '../audit/audit.service.js';
import { ResultsService } from '../results/results.service.js';
import { SheetWriter, toSheetInput } from '../sync/sheet-writer.js';

type Row = typeof rejectedSubmission.$inferSelect;
type Submit = z.output<typeof SubmitScoreSheetMutation>;
type Resolution = 'PENDING' | 'ACCEPTED' | 'DISCARDED';

/** Odrzucone zgłoszenia ocen: lista, przyjęcie, odrzucenie (03-api §3.6; IMP-149, ADR-010, TL-13). */
@Injectable()
export class RejectedService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(OwnershipRepository) private readonly owned: OwnershipRepository,
    @Inject(ResultsService) private readonly results: ResultsService,
    @Inject(SheetWriter) private readonly writer: SheetWriter,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** Wiersz SCR-ORG-22: sędzia, start, kategoria, powód, czas i wynik z treści zgłoszenia. */
  private async toView(conn: Db | Tx, r: Row): Promise<RejectedSubmission> {
    const m = r.payload as Submit;
    const [details] = await conn
      .select({
        judgeName: judge.fullName,
        startNumber: entry.startNumber,
        fullName: athlete.fullName,
        categoryName: category.name,
      })
      .from(rejectedSubmission)
      .leftJoin(judge, eq(judge.id, rejectedSubmission.judgeId))
      .leftJoin(entry, eq(entry.id, rejectedSubmission.entryId))
      .leftJoin(athlete, eq(athlete.id, entry.athleteId))
      .leftJoin(category, eq(category.id, rejectedSubmission.categoryId))
      .where(eq(rejectedSubmission.id, r.id));
    const config = r.categoryId ? await this.results.config(conn, r.categoryId) : null;
    const sheet = {
      criteria: Object.fromEntries(m.payload.criteria.map((c) => [c.criterionId, Math.round(c.value * 10)])),
      penalties: Object.fromEntries(m.payload.penalties.map((p) => [p.penaltyTypeId, p.count])),
    };
    return {
      id: r.id,
      judge: { id: r.judgeId ?? m.judgeId, fullName: details?.judgeName ?? '' },
      entry: {
        id: r.entryId ?? m.payload.entryId,
        startNumber: details?.startNumber ?? 0,
        fullName: details?.fullName ?? '',
      },
      category: { id: r.categoryId ?? m.payload.categoryId, name: details?.categoryName ?? '' },
      reason: r.reason,
      receivedAt: r.receivedAt.toISOString(),
      payloadTotal: config ? sheetTotal(sheet, config).totalHundredths / 100 : 0,
      resolution: r.resolution,
    };
  }

  async list(ownerId: string, tournamentId: string, resolution?: Resolution) {
    const t = await this.owned.tournament(this.db, tournamentId, ownerId);
    const rows = await this.db
      .select()
      .from(rejectedSubmission)
      .where(
        and(
          eq(rejectedSubmission.tournamentId, t.id),
          resolution ? eq(rejectedSubmission.resolution, resolution) : undefined,
        ),
      )
      .orderBy(desc(rejectedSubmission.receivedAt));
    return { items: await Promise.all(rows.map((r) => this.toView(this.db, r))) };
  }

  /** Zgłoszenie organizatora zablokowane na czas decyzji (turniej → zgłoszenie); cudze → 404. */
  private async pending(tx: Tx, rejectedId: string, ownerId: string) {
    if (!UUID_RE.test(rejectedId)) throw new DomainError('NOT_FOUND');
    const [found] = await tx
      .select({ tournamentId: rejectedSubmission.tournamentId })
      .from(rejectedSubmission)
      .where(eq(rejectedSubmission.id, rejectedId));
    if (!found) throw new DomainError('NOT_FOUND');
    const t = await this.owned.tournament(tx, found.tournamentId, ownerId, true);
    const r = one(
      await tx.select().from(rejectedSubmission).where(eq(rejectedSubmission.id, rejectedId)).for('update'),
    );
    if (r.resolution !== 'PENDING') throw new DomainError('INVALID_STATE_TRANSITION');
    return { t, r };
  }

  /**
   * Świadome przyjęcie oceny (TL-13): kategoria musi trwać, a start być aktywny; kody sesji i panelu
   * są dopuszczone. Arkusz dostaje rewizję organizatora i trafia do urządzenia źródłowego (TL-49).
   */
  async accept(ownerId: string, rejectedId: string): Promise<RejectedSubmission> {
    return withTx(this.db, async (tx) => {
      const { t, r } = await this.pending(tx, rejectedId, ownerId);
      if (t.status === 'FINISHED') throw new DomainError('TOURNAMENT_FINISHED');
      const m = r.payload as Submit;
      const [c] = r.categoryId
        ? await tx.select().from(category).where(eq(category.id, r.categoryId)).for('update')
        : [];
      if (!c) throw new DomainError('INVALID_STATE_TRANSITION');
      if (c.status === 'LOCKED') throw new DomainError('CATEGORY_LOCKED');
      if (c.status === 'DRAFT') throw new DomainError('CATEGORY_NOT_STARTED');
      const [e] = r.entryId ? await tx.select().from(entry).where(eq(entry.id, r.entryId)) : [];
      if (!e || e.status === 'WITHDRAWN') throw new DomainError('ENTRY_WITHDRAWN');
      if (!r.judgeId) throw new DomainError('INVALID_STATE_TRANSITION');
      const config = await this.results.config(tx, c.id);
      const sheet = toSheetInput(m.payload, config);
      if (!sheet) throw new DomainError('SCHEMA_MISMATCH');

      const [existing] = await tx
        .select()
        .from(scoreSheet)
        .where(and(eq(scoreSheet.entryId, e.id), eq(scoreSheet.judgeId, r.judgeId)))
        .for('update');
      const newerSheetExists = existing !== undefined && existing.submittedAt > r.receivedAt;
      const written = await this.writer.write(tx, {
        tournamentId: t.id,
        categoryId: c.id,
        entryId: e.id,
        judgeId: r.judgeId,
        scoreSheetId: m.payload.scoreSheetId,
        existing,
        sheet,
        config,
        clientTotalHundredths: Math.round(m.payload.clientTotal * 100),
        clientSubmittedAt: new Date(m.createdAt),
        deviceId: r.deviceId,
        judgeSessionId: m.judgeSessionId,
        authMode: m.authMode,
        mutationId: r.mutationId,
        actorType: 'ORGANIZER',
      });
      const updated = one(
        await tx
          .update(rejectedSubmission)
          .set({ resolution: 'ACCEPTED', resolvedBy: ownerId, resolvedAt: new Date() })
          .where(eq(rejectedSubmission.id, r.id))
          .returning(),
      );
      await this.audit.record(tx, {
        action: 'REJECTED_SUBMISSION_ACCEPTED',
        tournamentId: t.id,
        entityType: 'score_sheet',
        entityId: written.scoreSheetId,
        after: {
          rejectedId: r.id,
          reason: r.reason,
          revision: written.revision,
          totalHundredths: written.totalHundredths,
          newerSheetExists,
        },
      });
      return { ...(await this.toView(tx, updated)), newerSheetExists };
    });
  }

  async discard(ownerId: string, rejectedId: string): Promise<RejectedSubmission> {
    return withTx(this.db, async (tx) => {
      const { t, r } = await this.pending(tx, rejectedId, ownerId);
      const updated = one(
        await tx
          .update(rejectedSubmission)
          .set({ resolution: 'DISCARDED', resolvedBy: ownerId, resolvedAt: new Date() })
          .where(eq(rejectedSubmission.id, r.id))
          .returning(),
      );
      await this.audit.record(tx, {
        action: 'REJECTED_SUBMISSION_DISCARDED',
        tournamentId: t.id,
        entityType: 'rejected_submission',
        entityId: r.id,
        after: { reason: r.reason },
      });
      return this.toView(tx, updated);
    });
  }
}
