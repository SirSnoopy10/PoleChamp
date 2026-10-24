import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { ResultsResponse } from '@polechamp/contracts';
import { asc, eq } from 'drizzle-orm';
import { DomainError } from '../../common/errors/domain-error.js';
import { DB, type Db } from '../../db/client.js';
import { one } from '../../db/one.js';
import type { TournamentRow } from '../../db/repositories/ownership.repository.js';
import { category, tournament } from '../../db/schema.js';
import { ResultsReadService } from '../results/results-read.service.js';

export type ExportScope = 'TOURNAMENT' | 'CATEGORY';

export interface ExportTarget {
  scope: ExportScope;
  tournamentId: string;
  categoryId?: string | null;
}

export type ExportCategory = ResultsResponse & { name: string; unplayed?: boolean };

export interface ExportData {
  tournament: TournamentRow;
  categories: ExportCategory[];
  /** `categoryId → results_version` – wersje wyników użyte w pliku (02-model-danych §2.24). */
  versions: Record<string, number>;
  /** SHA-256 kanonicznej postaci wyników (stopka PDF, FR-706). */
  hash: string;
}

/** JSON z kluczami w stałej kolejności – podstawa sumy kontrolnej. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Wyniki do eksportu z tego samego źródła co podgląd (TC-PDF-008) i ich suma kontrolna (IMP-171). */
@Injectable()
export class ExportDataService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ResultsReadService) private readonly results: ResultsReadService,
  ) {}

  async load(target: ExportTarget): Promise<ExportData> {
    const t = one(await this.db.select().from(tournament).where(eq(tournament.id, target.tournamentId)));
    const cats = await this.db
      .select({ id: category.id, name: category.name })
      .from(category)
      .where(eq(category.tournamentId, t.id))
      .orderBy(asc(category.position));
    const names = new Map(cats.map((c) => [c.id, c.name]));
    let categories: ExportCategory[];
    if (target.scope === 'CATEGORY') {
      if (!target.categoryId || !names.has(target.categoryId)) throw new DomainError('NOT_FOUND');
      const r = await this.results.category(t.ownerId, target.categoryId);
      categories = [{ ...r, name: names.get(r.categoryId) ?? '' }];
    } else {
      const all = await this.results.tournament(t.ownerId, t.id);
      categories = all.categories.map((r) => ({ ...r, name: names.get(r.categoryId) ?? '' }));
    }
    const versions = Object.fromEntries(categories.map((c) => [c.categoryId, c.resultsVersion]));
    const hash = createHash('sha256')
      .update(
        canonical({
          scope: target.scope,
          tournament: { id: t.id, name: t.name, startDate: t.startDate, endDate: t.endDate, venue: t.venue },
          categories: categories.map((c) => ({
            id: c.categoryId,
            name: c.name,
            status: c.status,
            resultsVersion: c.resultsVersion,
            unplayed: c.unplayed ?? false,
            rows: c.rows.map((r) => ({
              entryId: r.entryId,
              rank: r.rank,
              startNumber: r.startNumber,
              fullName: r.fullName,
              club: r.club,
              entryStatus: r.entryStatus,
              display: r.display,
              sheetCount: r.sheetCount,
              isProvisional: r.isProvisional ?? false,
            })),
          })),
        }),
      )
      .digest('hex');
    return { tournament: t, categories, versions, hash };
  }
}
