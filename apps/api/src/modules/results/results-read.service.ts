import { Inject, Injectable } from '@nestjs/common';
import type { ResultsResponse } from '@polechamp/contracts';
import { formatRanking, maxJudgeScore, type RankedRow } from '@polechamp/scoring';
import { asc, eq } from 'drizzle-orm';
import { DB, type Db } from '../../db/client.js';
import { type CategoryRow, OwnershipRepository } from '../../db/repositories/ownership.repository.js';
import { athlete, category, categoryResult, criterion, entry } from '../../db/schema.js';
import { ResultsService } from './results.service.js';

type Row = Omit<RankedRow, 'aggregate'> & {
  aggregate: Pick<
    RankedRow['aggregate'],
    'officialHundredths' | 'tieBreakHundredths' | 'sheetCount' | 'isComplete'
  >;
};

/** Kolejność wierszy jak w `rankEntries`: z ocenami wg miejsca, bez ocen i wycofane wg kolejki. */
function displayOrder(a: Row, b: Row): number {
  const group = (r: Row) => (r.entryStatus === 'WITHDRAWN' ? 2 : r.rank === null ? 1 : 0);
  return (
    group(a) - group(b) ||
    (group(a) === 0 ? (a.rank as number) - (b.rank as number) || a.startNumber - b.startNumber : 0) ||
    a.startOrder - b.startOrder
  );
}

/** Ranking kategorii i turnieju w formacie wyświetlania – identycznym z PDF (03-api §3.6; IMP-151). */
@Injectable()
export class ResultsReadService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(OwnershipRepository) private readonly owned: OwnershipRepository,
    @Inject(ResultsService) private readonly results: ResultsService,
  ) {}

  async category(ownerId: string, categoryId: string): Promise<ResultsResponse> {
    const { category: c } = await this.owned.category(this.db, categoryId, ownerId);
    return this.build(c);
  }

  async tournament(ownerId: string, tournamentId: string) {
    const t = await this.owned.tournament(this.db, tournamentId, ownerId);
    const cats = await this.db
      .select()
      .from(category)
      .where(eq(category.tournamentId, t.id))
      .orderBy(asc(category.position));
    const categories = [];
    for (const c of cats) {
      const results = await this.build(c);
      categories.push(
        t.status === 'FINISHED' && c.status === 'DRAFT' ? { ...results, unplayed: true } : results,
      );
    }
    return { tournamentId: t.id, categories };
  }

  /** `category_result` z ostatniego przeliczenia; bez kompletu wierszy (np. W przygotowaniu) – liczone na bieżąco. */
  private async rows(c: CategoryRow): Promise<{ rows: Row[]; judgeCount: number }> {
    const stored = await this.db
      .select({
        entryId: entry.id,
        startNumber: entry.startNumber,
        startOrder: entry.startOrder,
        entryStatus: entry.status,
        rank: categoryResult.rank,
        officialHundredths: categoryResult.officialHundredths,
        tieBreakHundredths: categoryResult.tieBreakHundredths,
        sheetCount: categoryResult.sheetCount,
        expectedCount: categoryResult.expectedCount,
        isComplete: categoryResult.isComplete,
      })
      .from(categoryResult)
      .innerJoin(entry, eq(entry.id, categoryResult.entryId))
      .where(eq(categoryResult.categoryId, c.id));
    const entryCount = await this.db.$count(entry, eq(entry.categoryId, c.id));
    if (c.status !== 'DRAFT' && stored.length === entryCount) {
      return {
        judgeCount: await this.results.expectedJudgeCount(this.db, c.id),
        rows: stored.map((r) => ({
          entryId: r.entryId,
          startNumber: r.startNumber,
          startOrder: r.startOrder,
          entryStatus: r.entryStatus,
          rank: r.rank,
          isProvisional: c.status === 'LOCKED' && r.rank !== null && !r.isComplete,
          aggregate: {
            officialHundredths: r.officialHundredths,
            tieBreakHundredths: r.tieBreakHundredths,
            sheetCount: r.sheetCount,
            isComplete: r.isComplete,
          },
        })),
      };
    }
    const { ranked } = await this.results.compute(this.db, c.id);
    const { judgeCount } = await this.results.progress(this.db, c);
    return { rows: ranked, judgeCount };
  }

  private async build(c: CategoryRow): Promise<ResultsResponse> {
    const criteria = await this.db
      .select()
      .from(criterion)
      .where(eq(criterion.categoryId, c.id))
      .orderBy(asc(criterion.position));
    const people = await this.db
      .select({ id: entry.id, fullName: athlete.fullName, club: athlete.club })
      .from(entry)
      .innerJoin(athlete, eq(athlete.id, entry.athleteId))
      .where(eq(entry.categoryId, c.id));
    const person = new Map(people.map((p) => [p.id, p]));
    const { rows, judgeCount } = await this.rows(c);
    rows.sort(displayOrder);
    const display = formatRanking(
      rows.map((r) => ({ rank: r.rank, officialHundredths: r.aggregate.officialHundredths })),
    );
    const tieBreak = criteria.find((k) => k.id === c.tieBreakCriterionId) ?? criteria[0];
    return {
      categoryId: c.id,
      status: c.status,
      resultsVersion: c.resultsVersion,
      maxJudgeScore: maxJudgeScore(criteria) / 100,
      judgeCount,
      formula: c.aggregationMethod,
      tieBreak: tieBreak ? { criterionId: tieBreak.id, criterionName: tieBreak.name } : null,
      rows: rows.map((r, i) => ({
        entryId: r.entryId,
        rank: r.rank,
        startNumber: r.startNumber,
        fullName: person.get(r.entryId)?.fullName ?? '',
        club: person.get(r.entryId)?.club ?? null,
        entryStatus: r.entryStatus,
        official: r.aggregate.officialHundredths === null ? null : r.aggregate.officialHundredths / 100,
        display: display[i] as string,
        sheetCount: r.aggregate.sheetCount,
        isComplete: r.aggregate.isComplete,
        isProvisional: r.isProvisional,
        tieBreak: r.aggregate.tieBreakHundredths === null ? null : r.aggregate.tieBreakHundredths / 100,
      })),
    };
  }
}
