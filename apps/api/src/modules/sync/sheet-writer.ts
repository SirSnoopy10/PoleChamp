import { Inject, Injectable } from '@nestjs/common';
import type { ScoreSheetPayload } from '@polechamp/contracts';
import { type CategoryConfig, type SheetInput, sheetTotal, validateSheet } from '@polechamp/scoring';
import { eq } from 'drizzle-orm';
import type { Tx } from '../../db/client.js';
import { scorePenalty, scoreSheet, scoreSheetRevision, scoreValue } from '../../db/schema.js';
import { ChangeLogService, DomainEventService } from '../audit/audit.service.js';
import { ResultsService } from '../results/results.service.js';

export type ScoreSheetRow = typeof scoreSheet.$inferSelect;

/**
 * Treść arkusza z tabletu → noty w dziesiątych. Nota spoza kroku kryterium (`stepTenths`) albo komplet kryteriów niezgodny
 * z kategorią → `null` (`SCHEMA_MISMATCH`, INT-02); brak licznika kary oznacza 0.
 */
export function toSheetInput(payload: ScoreSheetPayload, config: CategoryConfig): SheetInput | null {
  const sheet: SheetInput = {
    criteria: Object.fromEntries(
      payload.criteria.map((c) => [c.criterionId, Math.round(c.value * 100) / 10]),
    ),
    penalties: Object.fromEntries(payload.penalties.map((p) => [p.penaltyTypeId, p.count])),
    comment: payload.comment,
  };
  return validateSheet(sheet, config).ok ? sheet : null;
}

export interface WriteSheetInput {
  tournamentId: string;
  categoryId: string;
  entryId: string;
  judgeId: string;
  /** Identyfikator nadany przez tablet – używany przy pierwszym zapisie pary (start, sędzia). */
  scoreSheetId: string;
  existing: ScoreSheetRow | undefined;
  sheet: SheetInput;
  config: CategoryConfig;
  clientTotalHundredths: number | null;
  clientSubmittedAt: Date | null;
  deviceId: string | null;
  judgeSessionId: string | null;
  authMode: 'ONLINE_PIN' | 'OFFLINE_PIN';
  mutationId: string | null;
  actorType: 'JUDGE' | 'ORGANIZER';
}

/**
 * Zapis arkusza (IMP-147, IMP-149): wynik zawsze liczony silnikiem `@polechamp/scoring` (INT-09), nowa rewizja
 * z migawką treści, dziennik zmian dla autora i urządzenia (TL-49), sygnał `scoresheet.accepted`, przeliczenie.
 */
@Injectable()
export class SheetWriter {
  constructor(
    @Inject(ResultsService) private readonly results: ResultsService,
    @Inject(ChangeLogService) private readonly changes: ChangeLogService,
    @Inject(DomainEventService) private readonly events: DomainEventService,
  ) {}

  async write(tx: Tx, input: WriteSheetInput) {
    const totals = sheetTotal(input.sheet, input.config);
    const revision = (input.existing?.revision ?? 0) + 1;
    const scoreSheetId = input.existing?.id ?? input.scoreSheetId;
    const values = {
      revision,
      criteriaTotalHundredths: totals.criteriaHundredths,
      penaltyTotalHundredths: totals.penaltyHundredths,
      totalHundredths: totals.totalHundredths,
      clientTotalHundredths: input.clientTotalHundredths,
      comment: input.sheet.comment ?? '',
      submittedAt: new Date(),
      clientSubmittedAt: input.clientSubmittedAt,
      deviceId: input.deviceId,
      judgeSessionId: input.judgeSessionId,
      authMode: input.authMode,
      lastMutationId: input.mutationId,
    };
    if (input.existing) {
      await tx.update(scoreSheet).set(values).where(eq(scoreSheet.id, scoreSheetId));
      await tx.delete(scoreValue).where(eq(scoreValue.scoreSheetId, scoreSheetId));
      await tx.delete(scorePenalty).where(eq(scorePenalty.scoreSheetId, scoreSheetId));
    } else {
      await tx.insert(scoreSheet).values({
        id: scoreSheetId,
        categoryId: input.categoryId,
        entryId: input.entryId,
        judgeId: input.judgeId,
        ...values,
      });
    }
    const criteria = input.config.criteria.map((c) => ({
      criterionId: c.id,
      valueTenths: input.sheet.criteria[c.id] as number,
    }));
    const penalties = input.config.penaltyTypes.map((p) => ({
      penaltyTypeId: p.id,
      count: input.sheet.penalties[p.id] ?? 0,
    }));
    await tx.insert(scoreValue).values(criteria.map((c) => ({ scoreSheetId, ...c })));
    if (penalties.length)
      await tx.insert(scorePenalty).values(penalties.map((p) => ({ scoreSheetId, ...p })));
    await tx.insert(scoreSheetRevision).values({
      scoreSheetId,
      revision,
      snapshot: {
        criteria,
        penalties,
        comment: values.comment,
        criteriaTotalHundredths: totals.criteriaHundredths,
        penaltyTotalHundredths: totals.penaltyHundredths,
        totalHundredths: totals.totalHundredths,
        clientTotalHundredths: input.clientTotalHundredths,
        authMode: input.authMode,
        config: {
          criteria: input.config.criteria.map((c) => ({
            id: c.id,
            scaleMax: c.scaleMax,
            weightTenths: c.weightTenths,
            stepTenths: c.stepTenths,
          })),
          penaltyTypes: input.config.penaltyTypes.map((p) => ({ id: p.id, pointsTenths: p.pointsTenths })),
        },
      },
      actorType: input.actorType,
      judgeSessionId: input.judgeSessionId,
      deviceId: input.deviceId,
      mutationId: input.mutationId,
    });
    await this.changes.appendSheet(tx, {
      tournamentId: input.tournamentId,
      scoreSheetId,
      judgeId: input.judgeId,
      deviceId: input.deviceId,
    });
    await this.events.emit(
      tx,
      'scoresheet.accepted',
      { categoryId: input.categoryId, entryId: input.entryId, judgeId: input.judgeId, revision },
      input.tournamentId,
    );
    await this.results.recalculate(tx, input.categoryId);
    return { scoreSheetId, revision, totalHundredths: totals.totalHundredths };
  }
}
