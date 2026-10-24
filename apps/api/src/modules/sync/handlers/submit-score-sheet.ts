import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { Tx } from '../../../db/client.js';
import { one } from '../../../db/one.js';
import { category, categoryJudge, entry, judgeSession, scoreSheet, tournament } from '../../../db/schema.js';
import { AuditService } from '../../audit/audit.service.js';
import { ResultsService } from '../../results/results.service.js';
import { SheetWriter, toSheetInput } from '../sheet-writer.js';
import { judgeOfTournament } from './judge-session.handlers.js';
import {
  type HandlerResult,
  type MutationHandler,
  type MutationOf,
  type PushContext,
  rejected,
} from './types.js';

/** Rozjazd zegara tabletu względem serwera oznaczany w audycie (TC-AUDIT-003, NFR-309). */
export const CLOCK_SKEW_MS = 5 * 60_000;

/**
 * Przyjęcie oceny z tabletu (IMP-147): warunki INT-01 przy kategorii zablokowanej `FOR SHARE` (blokada kategorii
 * czeka na oceny w toku), sesja sędziego (TL-12), rewizja bazowa, zgodność z kryteriami (INT-02).
 * Wiersz turnieju blokuje wcześniej `PushService` (kolejność turniej → kategoria jak w komendach organizatora).
 */
@Injectable()
export class SubmitScoreSheetHandler implements MutationHandler<MutationOf<'SUBMIT_SCORE_SHEET'>> {
  private readonly logger = new Logger('SubmitScoreSheet');

  constructor(
    @Inject(ResultsService) private readonly results: ResultsService,
    @Inject(SheetWriter) private readonly writer: SheetWriter,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async handle(tx: Tx, ctx: PushContext, m: MutationOf<'SUBMIT_SCORE_SHEET'>): Promise<HandlerResult> {
    const p = m.payload;
    const [c] = await tx
      .select()
      .from(category)
      .where(and(eq(category.id, p.categoryId), eq(category.tournamentId, ctx.tournamentId)))
      .for('share');
    if (!c) return rejected('SCHEMA_MISMATCH');
    const [e] = await tx
      .select()
      .from(entry)
      .where(and(eq(entry.id, p.entryId), eq(entry.categoryId, c.id)));
    if (!e) return rejected('SCHEMA_MISMATCH');
    const j = await judgeOfTournament(tx, m.judgeId, ctx.tournamentId);
    if (!j) return rejected('JUDGE_SESSION_INVALID');

    // INT-01 (kolejność kodów jak w 03-api §5.1).
    const t = one(
      await tx
        .select({ status: tournament.status })
        .from(tournament)
        .where(eq(tournament.id, ctx.tournamentId)),
    );
    if (t.status === 'FINISHED') return rejected('TOURNAMENT_FINISHED');
    if (c.status === 'DRAFT') return rejected('CATEGORY_NOT_STARTED');
    if (c.status === 'LOCKED') return rejected('CATEGORY_LOCKED');
    if (e.status === 'WITHDRAWN') return rejected('ENTRY_WITHDRAWN');
    if (!j.isActive) return rejected('JUDGE_INACTIVE');
    const [inPanel] = await tx
      .select()
      .from(categoryJudge)
      .where(and(eq(categoryJudge.categoryId, c.id), eq(categoryJudge.judgeId, j.id)));
    if (!inPanel) return rejected('JUDGE_NOT_IN_PANEL');

    // TL-12: sesja ONLINE tego sędziego z tego urządzenia albo wcześniej zgłoszona sesja OFFLINE.
    const [s] = await tx.select().from(judgeSession).where(eq(judgeSession.id, m.judgeSessionId));
    if (!s || s.judgeId !== j.id || s.deviceId !== ctx.deviceId) return rejected('JUDGE_SESSION_INVALID');
    if (s.pinVersion !== j.pinVersion) return rejected('PIN_VERSION_OUTDATED');

    // Edycja z innego urządzenia lub nieaktualna wersja – decyzję podejmuje sędzia na tablecie (§5).
    const [existing] = await tx
      .select()
      .from(scoreSheet)
      .where(and(eq(scoreSheet.entryId, e.id), eq(scoreSheet.judgeId, j.id)))
      .for('update');
    if (
      existing ? existing.id !== p.scoreSheetId || existing.revision !== p.baseRevision : p.baseRevision !== 0
    ) {
      return rejected('STALE_REVISION');
    }
    if (!existing) {
      const [clash] = await tx
        .select({ id: scoreSheet.id })
        .from(scoreSheet)
        .where(eq(scoreSheet.id, p.scoreSheetId));
      if (clash) return rejected('SCHEMA_MISMATCH');
    }
    const config = await this.results.config(tx, c.id);
    const sheet = toSheetInput(p, config);
    if (!sheet) return rejected('SCHEMA_MISMATCH');

    const clientTotalHundredths = Math.round(p.clientTotal * 100);
    const written = await this.writer.write(tx, {
      tournamentId: ctx.tournamentId,
      categoryId: c.id,
      entryId: e.id,
      judgeId: j.id,
      scoreSheetId: p.scoreSheetId,
      existing,
      sheet,
      config,
      clientTotalHundredths,
      clientSubmittedAt: new Date(m.createdAt),
      deviceId: ctx.deviceId,
      judgeSessionId: s.id,
      authMode: s.authMode,
      mutationId: m.mutationId,
      actorType: 'JUDGE',
    });
    const audit = {
      tournamentId: ctx.tournamentId,
      entityType: 'score_sheet',
      entityId: written.scoreSheetId,
    };
    await this.audit.record(tx, {
      ...audit,
      action: 'SCORE_SHEET_SUBMITTED',
      after: {
        categoryId: c.id,
        entryId: e.id,
        revision: written.revision,
        totalHundredths: written.totalHundredths,
        authMode: s.authMode,
        mutationId: m.mutationId,
      },
    });
    if (clientTotalHundredths !== written.totalHundredths) {
      // Rozbieżność wyniku tabletu i serwera – wiążący jest wynik serwera (INT-09); log bez danych osobowych.
      this.logger.warn(
        {
          scoreSheetId: written.scoreSheetId,
          mutationId: m.mutationId,
          clientTotalHundredths,
          serverTotalHundredths: written.totalHundredths,
        },
        'SCORE_TOTAL_MISMATCH',
      );
      await this.audit.record(tx, {
        ...audit,
        action: 'SCORE_TOTAL_MISMATCH',
        after: { clientTotalHundredths, serverTotalHundredths: written.totalHundredths },
      });
    }
    const skewMs = Math.max(
      Math.abs(ctx.deviceTime.getTime() - ctx.receivedAt.getTime()),
      new Date(m.createdAt).getTime() - ctx.receivedAt.getTime(),
    );
    if (skewMs > CLOCK_SKEW_MS) {
      await this.audit.record(tx, {
        ...audit,
        action: 'CLOCK_SKEW',
        after: { skewSeconds: Math.round(skewMs / 1000), mutationId: m.mutationId },
      });
    }
    return {
      status: 'APPLIED',
      scoreSheetId: written.scoreSheetId,
      revision: written.revision,
      serverTotal: written.totalHundredths / 100,
    };
  }
}
