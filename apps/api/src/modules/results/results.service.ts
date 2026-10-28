import { Inject, Injectable } from '@nestjs/common';
import {
  type CategoryConfig,
  categoryProgress,
  canonicalResults,
  expectedJudges,
  type Progress,
  type RankedRow,
} from '@polechamp/scoring';
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import { sha256Hex } from '../../common/ids.js';
import type { Db, Tx } from '../../db/client.js';
import { inSequence } from '../../db/sequence.js';
import { one } from '../../db/one.js';
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
import { DomainEventService } from '../audit/audit.service.js';
import { rankCategory } from './calculator.js';

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
  constructor(@Inject(DomainEventService) private readonly events: DomainEventService) {}

  /**
   * Przeliczenie po zmianie ocen, panelu lub statusu startu (IMP-150) w transakcji komendy,
   * z sygnałami `results.updated` i `progress.updated` dla organizatora.
   */
  async recalculate(tx: Tx, categoryId: string): Promise<RecomputeResult> {
    const result = await this.recompute(tx, categoryId);
    const { tournamentId } = one(
      await tx
        .select({ tournamentId: category.tournamentId })
        .from(category)
        .where(eq(category.id, categoryId)),
    );
    await this.events.emit(
      tx,
      'results.updated',
      { categoryId, resultsVersion: result.resultsVersion },
      tournamentId,
    );
    const progress = await this.tournamentProgress(tx, tournamentId);
    const own = progress.categories.get(categoryId) ?? { done: 0, expected: 0 };
    await this.events.emit(
      tx,
      'progress.updated',
      {
        tournamentId,
        done: progress.done,
        expected: progress.expected,
        categoryId,
        categoryDone: own.done,
        categoryExpected: own.expected,
      },
      tournamentId,
    );
    return result;
  }

  /**
   * Postęp turnieju zbiorczo (kategorie Trwa i Zakończona) – stała liczba zapytań niezależnie od liczby
   * kategorii, bo liczony przy każdej przyjętej ocenie.
   */
  async tournamentProgress(conn: Conn, tournamentId: string) {
    const cats = await conn
      .select({ id: category.id, status: category.status })
      .from(category)
      .where(and(eq(category.tournamentId, tournamentId), ne(category.status, 'DRAFT')));
    const categories = new Map<string, Progress>();
    if (!cats.length) return { done: 0, expected: 0, categories };
    const ids = cats.map((c) => c.id);
    const [active, done, panel, withSheets] = await inSequence([
      conn
        .select({ categoryId: entry.categoryId, n: sql<number>`count(*)::int` })
        .from(entry)
        .where(and(inArray(entry.categoryId, ids), eq(entry.status, 'ACTIVE')))
        .groupBy(entry.categoryId),
      conn
        .select({ categoryId: scoreSheet.categoryId, n: sql<number>`count(*)::int` })
        .from(scoreSheet)
        .innerJoin(entry, eq(entry.id, scoreSheet.entryId))
        .where(and(inArray(scoreSheet.categoryId, ids), eq(entry.status, 'ACTIVE')))
        .groupBy(scoreSheet.categoryId),
      conn
        .select({ categoryId: categoryJudge.categoryId, judgeId: judge.id, isActive: judge.isActive })
        .from(categoryJudge)
        .innerJoin(judge, eq(judge.id, categoryJudge.judgeId))
        .where(inArray(categoryJudge.categoryId, ids)),
      conn
        .selectDistinct({ categoryId: scoreSheet.categoryId, judgeId: scoreSheet.judgeId })
        .from(scoreSheet)
        .where(inArray(scoreSheet.categoryId, ids)),
    ]);
    const count = (rows: { categoryId: string; n: number }[], id: string) =>
      rows.find((r) => r.categoryId === id)?.n ?? 0;
    for (const c of cats) {
      const judges = expectedJudges(
        panel.filter((p) => p.categoryId === c.id),
        withSheets.filter((s) => s.categoryId === c.id).map((s) => s.judgeId),
      );
      categories.set(c.id, categoryProgress(count(done, c.id), count(active, c.id), judges));
    }
    const all = [...categories.values()];
    return {
      done: all.reduce((s, p) => s + p.done, 0),
      expected: all.reduce((s, p) => s + p.expected, 0),
      categories,
    };
  }

  async config(conn: Conn, categoryId: string): Promise<CategoryConfig> {
    const [cat] = await conn
      .select({ tieBreak: category.tieBreakCriterionId })
      .from(category)
      .where(eq(category.id, categoryId));
    const rows = await conn
      .select({
        id: criterion.id,
        scaleMax: criterion.scaleMax,
        weightTenths: criterion.weightTenths,
        step: criterion.step,
      })
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
    const criteria = rows.map(({ step, ...c }) => ({ ...c, stepTenths: Math.round(Number(step) * 10) }));
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
    const { cat, ranked, judgeCount } = await this.compute(tx, categoryId, options);
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

  /** Ranking z bieżących ocen bez zapisu (podstawa `recompute`; odczyt kategorii bez `category_result`). */
  async compute(conn: Conn, categoryId: string, options: { forPdf?: boolean } = {}) {
    const [cat] = await conn.select().from(category).where(eq(category.id, categoryId));
    if (!cat) throw new Error(`Brak kategorii ${categoryId}`);
    const config = await this.config(conn, categoryId);
    const judgeCount = await this.expectedJudgeCount(conn, categoryId);
    const entries = await conn.select().from(entry).where(eq(entry.categoryId, categoryId));
    const sheets = await conn
      .select({ id: scoreSheet.id, entryId: scoreSheet.entryId, judgeId: scoreSheet.judgeId })
      .from(scoreSheet)
      .where(eq(scoreSheet.categoryId, categoryId));
    const [values, penalties] = sheets.length
      ? await inSequence([
          conn
            .select({
              scoreSheetId: scoreValue.scoreSheetId,
              criterionId: scoreValue.criterionId,
              valueTenths: scoreValue.valueTenths,
            })
            .from(scoreValue)
            .innerJoin(scoreSheet, eq(scoreSheet.id, scoreValue.scoreSheetId))
            .where(eq(scoreSheet.categoryId, categoryId)),
          conn
            .select({
              scoreSheetId: scorePenalty.scoreSheetId,
              penaltyTypeId: scorePenalty.penaltyTypeId,
              count: scorePenalty.count,
            })
            .from(scorePenalty)
            .innerJoin(scoreSheet, eq(scoreSheet.id, scorePenalty.scoreSheetId))
            .where(eq(scoreSheet.categoryId, categoryId)),
        ])
      : [[], []];

    const ranked = rankCategory({
      config,
      judgeCount,
      aggregationMethod: cat.aggregationMethod,
      categoryStatus: cat.status,
      forPdf: options.forPdf,
      entries,
      sheets,
      values,
      penalties,
    });
    return { cat, ranked, judgeCount };
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
