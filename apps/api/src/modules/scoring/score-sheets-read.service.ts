import { Inject, Injectable } from '@nestjs/common';
import { asc, count, eq, inArray } from 'drizzle-orm';
import { DomainError } from '../../common/errors/domain-error.js';
import { UUID_RE } from '../../common/ids.js';
import { DB, type Db } from '../../db/client.js';
import { OwnershipRepository } from '../../db/repositories/ownership.repository.js';
import {
  categoryJudge,
  criterion,
  judge,
  penaltyType,
  scoreSheet,
  scoreSheetRevision,
} from '../../db/schema.js';
import { ResultsReadService } from '../results/results-read.service.js';
import { loadSheets } from '../sync/sheets.js';

interface RevisionSnapshot {
  criteria?: { criterionId: string; valueTenths: number }[];
  penalties?: { penaltyTypeId: string; count: number }[];
  comment?: string;
  totalHundredths: number;
  authMode?: 'ONLINE_PIN' | 'OFFLINE_PIN';
}

/** Oceny dla organizatora i własne arkusze sędziego (03-api §3.6, §4; IMP-152, IMP-153). */
@Injectable()
export class ScoreSheetsReadService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(OwnershipRepository) private readonly owned: OwnershipRepository,
    @Inject(ResultsReadService) private readonly results: ResultsReadService,
  ) {}

  /** SCR-ORG-19: arkusze sędziów z nazwami i wagami, sędziowie panelu bez oceny, podsumowanie startu. */
  async entrySheets(ownerId: string, entryId: string) {
    const { category: c, entry: e } = await this.owned.entry(this.db, entryId, ownerId);
    const [criteria, penalties, panel, sheets] = await Promise.all([
      this.db.select().from(criterion).where(eq(criterion.categoryId, c.id)).orderBy(asc(criterion.position)),
      this.db
        .select()
        .from(penaltyType)
        .where(eq(penaltyType.categoryId, c.id))
        .orderBy(asc(penaltyType.position)),
      this.db
        .select({
          id: judge.id,
          fullName: judge.fullName,
          isActive: judge.isActive,
          position: judge.position,
        })
        .from(categoryJudge)
        .innerJoin(judge, eq(judge.id, categoryJudge.judgeId))
        .where(eq(categoryJudge.categoryId, c.id))
        .orderBy(asc(judge.position)),
      loadSheets(this.db, eq(scoreSheet.entryId, e.id)),
    ]);
    const ids = sheets.map((s) => s.scoreSheetId);
    const [judges, revisions] = ids.length
      ? await Promise.all([
          this.db
            .select({ id: judge.id, fullName: judge.fullName, position: judge.position })
            .from(judge)
            .where(
              inArray(
                judge.id,
                sheets.map((s) => s.judgeId),
              ),
            ),
          this.db
            .select({ id: scoreSheetRevision.scoreSheetId, n: count() })
            .from(scoreSheetRevision)
            .where(inArray(scoreSheetRevision.scoreSheetId, ids))
            .groupBy(scoreSheetRevision.scoreSheetId),
        ])
      : [[], []];
    const judgeOf = new Map(judges.map((j) => [j.id, j]));
    const criterionOf = new Map(criteria.map((k) => [k.id, k]));
    const penaltyOf = new Map(penalties.map((p) => [p.id, p]));
    const scored = new Set(sheets.map((s) => s.judgeId));

    const ranking = await this.results.category(ownerId, c.id);
    const row = ranking.rows.find((r) => r.entryId === e.id);
    const items = sheets
      .sort((a, b) => (judgeOf.get(a.judgeId)?.position ?? 0) - (judgeOf.get(b.judgeId)?.position ?? 0))
      .map((s) => ({
        id: s.scoreSheetId,
        judge: { id: s.judgeId, fullName: judgeOf.get(s.judgeId)?.fullName ?? '' },
        criteria: s.criteria.map((v) => ({
          criterionId: v.criterionId,
          name: criterionOf.get(v.criterionId)?.name ?? '',
          weight: (criterionOf.get(v.criterionId)?.weightTenths ?? 0) / 10,
          value: v.value,
        })),
        penalties: s.penalties.map((p) => ({
          penaltyTypeId: p.penaltyTypeId,
          name: penaltyOf.get(p.penaltyTypeId)?.name ?? '',
          points: (penaltyOf.get(p.penaltyTypeId)?.pointsTenths ?? 0) / 10,
          count: p.count,
        })),
        comment: s.comment,
        total: s.total,
        authMode: s.authMode,
        revision: s.revision,
        revisionCount: revisions.find((r) => r.id === s.scoreSheetId)?.n ?? 1,
        updatedAt: s.updatedAt,
      }));
    return {
      items,
      // Brakujące oceny: sędziowie panelu liczeni do J (aktywni) bez arkusza tego startu.
      missingJudges: panel
        .filter((j) => j.isActive && !scored.has(j.id))
        .map(({ id, fullName }) => ({ id, fullName })),
      summary: {
        official: row?.official ?? null,
        display: row?.display ?? '—',
        rank: row?.rank ?? null,
        sheetCount: sheets.length,
        expectedCount: ranking.judgeCount,
      },
    };
  }

  /** Historia zmian oceny rosnąco (FR-902) – zakres właściciela przez kategorię arkusza (cudzy → 404). */
  async revisions(ownerId: string, scoreSheetId: string) {
    if (!UUID_RE.test(scoreSheetId)) throw new DomainError('NOT_FOUND');
    const [sheet] = await this.db
      .select({ categoryId: scoreSheet.categoryId })
      .from(scoreSheet)
      .where(eq(scoreSheet.id, scoreSheetId));
    if (!sheet) throw new DomainError('NOT_FOUND');
    await this.owned.category(this.db, sheet.categoryId, ownerId);
    const rows = await this.db
      .select()
      .from(scoreSheetRevision)
      .where(eq(scoreSheetRevision.scoreSheetId, scoreSheetId))
      .orderBy(asc(scoreSheetRevision.revision));
    return {
      items: rows.map((r) => {
        const snap = r.snapshot as RevisionSnapshot;
        return {
          revision: r.revision,
          createdAt: r.createdAt.toISOString(),
          total: snap.totalHundredths / 100,
          actorType: r.actorType === 'ORGANIZER' ? ('ORGANIZER' as const) : ('JUDGE' as const),
          authMode: snap.authMode,
          criteria: snap.criteria?.map((v) => ({ criterionId: v.criterionId, value: v.valueTenths / 10 })),
          penalties: snap.penalties,
          comment: snap.comment,
        };
      }),
    };
  }

  /** Własne arkusze sędziego z tokenu – ten sam kształt co encja `score_sheet` w `sync/changes`. */
  async ownSheets(judgeId: string) {
    const sheets = await loadSheets(this.db, eq(scoreSheet.judgeId, judgeId));
    return {
      items: sheets.map(({ judgeId: _judge, authMode: _mode, ...s }) => s),
    };
  }
}
