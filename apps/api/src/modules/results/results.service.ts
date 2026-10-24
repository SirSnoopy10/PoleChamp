import { Injectable } from '@nestjs/common';
import {
  aggregateEntry,
  type CategoryConfig,
  categoryProgress,
  canonicalResults,
  expectedJudges,
  type Progress,
  rankEntries,
  type RankedRow,
  type SheetSummary,
  summarizeSheet,
} from '@polechamp/scoring';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { sha256Hex } from '../../common/ids.js';
import type { Db, Tx } from '../../db/client.js';
import {
  category,
  categoryJudge,
  categoryResult,
  criterion,
  entry,
  judge,
  penaltyType,
  scorePenalty,
  scoreSheet,
  scoreValue,
} from '../../db/schema.js';

type Conn = Db | Tx;

export interface RecomputeResult {
  resultsVersion: number;
  rows: RankedRow[];
  judgeCount: number;
}

/**
 * Wyniki kategorii (podstawa IMP-150; używane przy blokadzie IMP-127): przelicza arkusze silnikiem
 * `@polechamp/scoring` i materializuje `category_result` z nową `results_version`.
 */
@Injectable()
export class ResultsService {
  async config(conn: Conn, categoryId: string): Promise<CategoryConfig> {
    const [cat] = await conn
      .select({ tieBreak: category.tieBreakCriterionId })
      .from(category)
      .where(eq(category.id, categoryId));
    const criteria = await conn
      .select({ id: criterion.id, scaleMax: criterion.scaleMax, weightTenths: criterion.weightTenths })
      .from(criterion)
      .where(eq(criterion.categoryId, categoryId))
      .orderBy(asc(criterion.position));
    const penaltyTypes = await conn
      .select({
        id: penaltyType.id,
        pointsTenths: penaltyType.pointsTenths,
        maxOccurrences: penaltyType.maxOccurrences,
      })
      .from(penaltyType)
      .where(eq(penaltyType.categoryId, categoryId))
      .orderBy(asc(penaltyType.position));
    return { criteria, penaltyTypes, tieBreakCriterionId: cat?.tieBreak ?? undefined };
  }

  /** J – sędziowie panelu aktywni lub z co najmniej jedną oceną w kategorii (07-reguly §3.1). */
  async expectedJudgeCount(conn: Conn, categoryId: string): Promise<number> {
    const panel = await conn
      .select({ judgeId: judge.id, isActive: judge.isActive })
      .from(categoryJudge)
      .innerJoin(judge, eq(judge.id, categoryJudge.judgeId))
      .where(eq(categoryJudge.categoryId, categoryId));
    const withSheets = await conn
      .selectDistinct({ judgeId: scoreSheet.judgeId })
      .from(scoreSheet)
      .where(eq(scoreSheet.categoryId, categoryId));
    return expectedJudges(
      panel,
      withSheets.map((r) => r.judgeId),
    );
  }

  async recompute(tx: Tx, categoryId: string, options: { forPdf?: boolean } = {}): Promise<RecomputeResult> {
    const [cat] = await tx.select().from(category).where(eq(category.id, categoryId));
    if (!cat) throw new Error(`Brak kategorii ${categoryId}`);
    const config = await this.config(tx, categoryId);
    const judgeCount = await this.expectedJudgeCount(tx, categoryId);
    const entries = await tx.select().from(entry).where(eq(entry.categoryId, categoryId));
    const sheets = await tx.select().from(scoreSheet).where(eq(scoreSheet.categoryId, categoryId));
    const sheetIds = sheets.map((s) => s.id);
    const values = sheetIds.length
      ? await tx.select().from(scoreValue).where(inArray(scoreValue.scoreSheetId, sheetIds))
      : [];
    const penalties = sheetIds.length
      ? await tx.select().from(scorePenalty).where(inArray(scorePenalty.scoreSheetId, sheetIds))
      : [];

    const summaries = new Map<string, SheetSummary[]>();
    for (const s of sheets) {
      const summary = summarizeSheet(
        s.judgeId,
        {
          criteria: Object.fromEntries(
            values.filter((v) => v.scoreSheetId === s.id).map((v) => [v.criterionId, v.valueTenths]),
          ),
          penalties: Object.fromEntries(
            penalties.filter((p) => p.scoreSheetId === s.id).map((p) => [p.penaltyTypeId, p.count]),
          ),
        },
        config,
      );
      summaries.set(s.entryId, [...(summaries.get(s.entryId) ?? []), summary]);
    }

    const ranked = rankEntries(
      entries.map((e) => ({
        entryId: e.id,
        startNumber: e.startNumber,
        startOrder: e.startOrder,
        entryStatus: e.status,
        aggregate: aggregateEntry(summaries.get(e.id) ?? [], judgeCount, cat.aggregationMethod),
      })),
      { categoryStatus: cat.status, forPdf: options.forPdf },
    );

    const resultsVersion = cat.resultsVersion + 1;
    await tx.update(category).set({ resultsVersion }).where(eq(category.id, categoryId));
    await tx.delete(categoryResult).where(eq(categoryResult.categoryId, categoryId));
    if (ranked.length) {
      await tx.insert(categoryResult).values(
        ranked.map((r) => ({
          categoryId,
          entryId: r.entryId,
          sheetCount: r.aggregate.sheetCount,
          expectedCount: r.aggregate.expectedCount,
          sumHundredths: r.aggregate.sumHundredths,
          officialHundredths: r.aggregate.officialHundredths,
          tieBreakHundredths: r.aggregate.tieBreakHundredths,
          penaltyMeanHundredths: r.aggregate.penaltyMeanHundredths,
          rank: r.rank,
          isComplete: r.aggregate.isComplete,
          resultsVersion,
        })),
      );
    }
    return { resultsVersion, rows: ranked, judgeCount };
  }

  /** SHA-256 kanonicznego JSON wyników (FR-706, TL-16) – bez danych osobowych. */
  resultsHash(
    categoryId: string,
    result: RecomputeResult,
    aggregationMethod: 'MEAN' | 'TRIMMED_MEAN',
  ): string {
    return sha256Hex(
      canonicalResults(
        {
          categoryId,
          resultsVersion: result.resultsVersion,
          aggregationMethod,
          judgeCount: result.judgeCount,
        },
        result.rows.map((r) => ({
          entryId: r.entryId,
          startNumber: r.startNumber,
          entryStatus: r.entryStatus,
          rank: r.rank,
          officialHundredths: r.aggregate.officialHundredths,
          sheetCount: r.aggregate.sheetCount,
          isComplete: r.aggregate.isComplete,
        })),
      ),
    );
  }

  /**
   * Postęp kategorii (07-reguly §3.3): arkusze aktywnych startów / aktywne starty × J.
   * Dla kategorii W przygotowaniu J = aktywni sędziowie turnieju (panel powstaje przy starcie).
   */
  async progress(
    conn: Conn,
    cat: { id: string; tournamentId: string; status: string },
  ): Promise<{
    progress: Progress;
    entryCount: number;
    judgeCount: number;
  }> {
    const [active] = await conn
      .select({ n: sql<number>`count(*)::int` })
      .from(entry)
      .where(and(eq(entry.categoryId, cat.id), eq(entry.status, 'ACTIVE')));
    const [done] = await conn
      .select({ n: sql<number>`count(*)::int` })
      .from(scoreSheet)
      .innerJoin(entry, eq(entry.id, scoreSheet.entryId))
      .where(and(eq(scoreSheet.categoryId, cat.id), eq(entry.status, 'ACTIVE')));
    let judgeCount: number;
    if (cat.status === 'DRAFT') {
      const [j] = await conn
        .select({ n: sql<number>`count(*)::int` })
        .from(judge)
        .where(and(eq(judge.tournamentId, cat.tournamentId), eq(judge.isActive, true)));
      judgeCount = j?.n ?? 0;
    } else {
      judgeCount = await this.expectedJudgeCount(conn, cat.id);
    }
    const entryCount = active?.n ?? 0;
    return { progress: categoryProgress(done?.n ?? 0, entryCount, judgeCount), entryCount, judgeCount };
  }
}
