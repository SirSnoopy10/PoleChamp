import { Inject, Injectable } from '@nestjs/common';
import type { EntryCreate, EntryPatch } from '@polechamp/contracts';
import { pseudonymLabel } from '@polechamp/i18n';
import { and, asc, eq, gt, ne, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { DomainError } from '../../common/errors/domain-error.js';
import { DB, type Db, type Tx } from '../../db/client.js';
import {
  assertTournamentWritable,
  assertVersion,
  type CategoryRow,
  OwnershipRepository,
  type TournamentRow,
} from '../../db/repositories/ownership.repository.js';
import { athlete, entry, scoreSheet } from '../../db/schema.js';
import { withTx } from '../../db/tx.js';
import { AuditService, ChangeLogService, DomainEventService } from '../audit/audit.service.js';
import { LimitsService } from '../limits/limits.service.js';
import { ResultsService } from '../results/results.service.js';
import { one } from '../../db/one.js';

const ADULT_AGE = 18;
const PERSONAL_FIELDS = new Set(['fullName', 'club', 'birthYear']);

type EntryWithAthlete = { entry: typeof entry.$inferSelect; athlete: typeof athlete.$inferSelect };

/** Postgres 23505 na danym ograniczeniu (błąd sterownika w `cause` wyjątku Drizzle). */
function isUniqueViolation(error: unknown, constraint: string): boolean {
  const e = error as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  const pg = e.cause ?? e;
  return pg.code === '23505' && pg.constraint === constraint;
}

/** Lista startowa (03-api §3.4; IMP-128, IMP-129). */
@Injectable()
export class EntriesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(OwnershipRepository) private readonly owned: OwnershipRepository,
    @Inject(LimitsService) private readonly limits: LimitsService,
    @Inject(ResultsService) private readonly results: ResultsService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ChangeLogService) private readonly changes: ChangeLogService,
    @Inject(DomainEventService) private readonly events: DomainEventService,
  ) {}

  private toRow(row: EntryWithAthlete, done: number, expected: number) {
    const pseudonymized = row.athlete.pseudonymizedAt !== null;
    return {
      id: row.entry.id,
      startNumber: row.entry.startNumber,
      startOrder: row.entry.startOrder,
      status: row.entry.status,
      version: row.entry.version,
      athlete: {
        id: row.athlete.id,
        // Po pseudonimizacji etykieta z numeru startu (TL-15).
        fullName: pseudonymized ? `Zawodniczka nr ${row.entry.startNumber}` : row.athlete.fullName,
        club: row.athlete.club,
        // Do formularza edycji – zapis bez zmian nie czyści roku (UX-39).
        birthYear: row.athlete.birthYear,
        isMinor: row.athlete.isMinor,
      },
      judged: { done, expected },
    };
  }

  private async rowFor(conn: Db | Tx, c: CategoryRow, entryId: string) {
    const found = one(
      await conn
        .select({ entry, athlete })
        .from(entry)
        .innerJoin(athlete, eq(athlete.id, entry.athleteId))
        .where(eq(entry.id, entryId)),
    );
    const [sheets] = await conn
      .select({ n: sql<number>`count(*)::int` })
      .from(scoreSheet)
      .where(eq(scoreSheet.entryId, entryId));
    const { judgeCount } = await this.results.progress(conn, c);
    return this.toRow(found, sheets?.n ?? 0, judgeCount);
  }

  async list(ownerId: string, categoryId: string, q?: string) {
    const { category: c } = await this.owned.category(this.db, categoryId, ownerId);
    const term = q?.trim();
    const search = term
      ? sql`(f_unaccent(lower(${athlete.fullName})) LIKE '%' || f_unaccent(lower(${term})) || '%'
             OR f_unaccent(lower(coalesce(${athlete.club}, ''))) LIKE '%' || f_unaccent(lower(${term})) || '%'
             OR ${entry.startNumber}::text = ${term})`
      : sql`true`;
    const rows = await this.db
      .select({
        entry,
        athlete,
        sheets: sql<number>`(SELECT count(*)::int FROM score_sheet s WHERE s.entry_id = ${entry.id})`,
      })
      .from(entry)
      .innerJoin(athlete, eq(athlete.id, entry.athleteId))
      .where(and(eq(entry.categoryId, c.id), search))
      .orderBy(sql`${entry.status} = 'WITHDRAWN'`, asc(entry.startOrder));
    const { judgeCount } = await this.results.progress(this.db, c);
    return { items: rows.map((r) => this.toRow(r, r.sheets, judgeCount)) };
  }

  private isMinor(input: { birthYear?: number | null; isMinor?: boolean }): boolean {
    return (
      input.isMinor === true ||
      (input.birthYear != null && new Date().getFullYear() - input.birthYear < ADULT_AGE)
    );
  }

  private async configChanged(
    tx: Tx,
    t: TournamentRow,
    c: CategoryRow,
    entryId: string,
    op: 'U' | 'D' = 'U',
  ) {
    await this.changes.append(tx, { tournamentId: t.id, entityType: 'entry', entityId: entryId, op });
    await this.events.emit(tx, 'config.changed', { categoryId: c.id, scope: 'entries' }, t.id);
  }

  async create(ownerId: string, categoryId: string, input: z.output<typeof EntryCreate>) {
    return withTx(this.db, async (tx) => {
      const { category: c, tournament: t } = await this.owned.category(tx, categoryId, ownerId, true);
      assertTournamentWritable(t);
      if (c.status === 'LOCKED') throw new DomainError('CATEGORY_LOCKED');
      await this.limits.assertCanAdd(tx, 'entriesPerCategory', c.id);
      await this.limits.assertCanAdd(tx, 'entriesPerTournament', t.id);
      const isMinor = this.isMinor(input);
      const a = one(
        await tx
          .insert(athlete)
          .values({
            tournamentId: t.id,
            fullName: input.fullName,
            club: input.club ?? null,
            birthYear: input.birthYear ?? null,
            isMinor,
            guardianConsentConfirmed: isMinor && input.guardianConsentConfirmed === true,
          })
          .returning(),
      );
      const [last] = await tx
        .select({ max: sql<number>`coalesce(max(${entry.startOrder}), 0)::int` })
        .from(entry)
        .where(eq(entry.categoryId, c.id));
      const e = one(
        await tx
          .insert(entry)
          .values({
            tournamentId: t.id,
            categoryId: c.id,
            athleteId: a.id,
            startNumber: input.startNumber,
            startOrder: (last?.max ?? 0) + 1,
          })
          .returning()
          .catch((error: unknown) => {
            if (isUniqueViolation(error, 'entry_start_number_uq')) {
              throw new DomainError('START_NUMBER_TAKEN', `Numer ${input.startNumber} jest już zajęty.`, {
                body: { number: input.startNumber },
              });
            }
            throw error;
          }),
      );
      await this.audit.record(tx, {
        action: 'ENTRY_CREATED',
        tournamentId: t.id,
        entityType: 'entry',
        entityId: e.id,
        after: { startNumber: e.startNumber, startOrder: e.startOrder },
      });
      await this.changes.append(tx, { tournamentId: t.id, entityType: 'athlete', entityId: a.id });
      await this.configChanged(tx, t, c, e.id);
      // Nowy start w kategorii Trwa zmienia postęp i ranking (04 §10).
      if (c.status === 'IN_PROGRESS') await this.results.recalculate(tx, c.id);
      return this.rowFor(tx, c, e.id);
    });
  }

  /** Edycja; w kategorii zablokowanej lub turnieju zakończonym tylko dane osobowe (RODO, TL-17). */
  async patch(ownerId: string, entryId: string, version: number, patch: z.output<typeof EntryPatch>) {
    return withTx(this.db, async (tx) => {
      const scope = await this.owned.entry(tx, entryId, ownerId, true);
      const { category: c, tournament: t, entry: e, athlete: a } = scope;
      assertVersion(e.version, version);
      const fields = Object.keys(patch).filter((k) => patch[k as keyof typeof patch] !== undefined);
      const personalOnly = fields.every((f) => PERSONAL_FIELDS.has(f));
      if (!personalOnly) {
        assertTournamentWritable(t);
        if (c.status === 'LOCKED') throw new DomainError('CATEGORY_LOCKED');
      }
      const birthYear = patch.birthYear !== undefined ? patch.birthYear : a.birthYear;
      const isMinor = this.isMinor({ birthYear, isMinor: patch.isMinor ?? a.isMinor });
      if (isMinor && !(patch.guardianConsentConfirmed ?? a.guardianConsentConfirmed)) {
        throw new DomainError('VALIDATION_FAILED', undefined, {
          errors: [{ field: 'guardianConsentConfirmed', code: 'REQUIRED' }],
        });
      }
      await tx
        .update(athlete)
        .set({
          ...(patch.fullName !== undefined ? { fullName: patch.fullName } : {}),
          ...(patch.club !== undefined ? { club: patch.club } : {}),
          birthYear,
          isMinor,
          guardianConsentConfirmed: patch.guardianConsentConfirmed ?? a.guardianConsentConfirmed,
          updatedAt: new Date(),
        })
        .where(eq(athlete.id, a.id));
      await tx
        .update(entry)
        .set({
          ...(patch.startNumber !== undefined ? { startNumber: patch.startNumber } : {}),
          version: e.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(entry.id, e.id))
        .catch((error: unknown) => {
          if (isUniqueViolation(error, 'entry_start_number_uq')) {
            throw new DomainError('START_NUMBER_TAKEN', `Numer ${patch.startNumber} jest już zajęty.`, {
              body: { number: patch.startNumber },
            });
          }
          throw error;
        });
      await this.audit.record(tx, {
        action: 'ENTRY_UPDATED',
        tournamentId: t.id,
        entityType: 'entry',
        entityId: e.id,
        after: { fields },
      });
      await this.changes.append(tx, { tournamentId: t.id, entityType: 'athlete', entityId: a.id });
      await this.configChanged(tx, t, c, e.id);
      return this.rowFor(tx, c, e.id);
    });
  }

  private async setStatus(ownerId: string, entryId: string, status: 'ACTIVE' | 'WITHDRAWN') {
    return withTx(this.db, async (tx) => {
      const { category: c, tournament: t, entry: e } = await this.owned.entry(tx, entryId, ownerId, true);
      assertTournamentWritable(t);
      if (c.status === 'LOCKED') throw new DomainError('CATEGORY_LOCKED');
      if (e.status === status) throw new DomainError('INVALID_STATE_TRANSITION');
      await tx
        .update(entry)
        .set({
          status,
          withdrawnAt: status === 'WITHDRAWN' ? new Date() : null,
          version: e.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(entry.id, e.id));
      await this.audit.record(tx, {
        action: status === 'WITHDRAWN' ? 'ENTRY_WITHDRAWN' : 'ENTRY_RESTORED',
        tournamentId: t.id,
        entityType: 'entry',
        entityId: e.id,
      });
      await this.configChanged(tx, t, c, e.id);
      if (c.status === 'IN_PROGRESS') await this.results.recalculate(tx, c.id);
      return this.rowFor(tx, c, e.id);
    });
  }

  withdraw(ownerId: string, entryId: string) {
    return this.setStatus(ownerId, entryId, 'WITHDRAWN');
  }

  restore(ownerId: string, entryId: string) {
    return this.setStatus(ownerId, entryId, 'ACTIVE');
  }

  /**
   * „Usuń dane osobowe” (IMP-177, FR-904): dozwolone także w kategorii zablokowanej i turnieju
   * zakończonym (wyjątek RODO – TL-17). Wynik i miejsce bez zmian; w wynikach i PDF „Zawodniczka nr {nr}”.
   */
  async anonymize(ownerId: string, entryId: string) {
    return withTx(this.db, async (tx) => {
      const {
        category: c,
        tournament: t,
        entry: e,
        athlete: a,
      } = await this.owned.entry(tx, entryId, ownerId, true);
      if (a.pseudonymizedAt) throw new DomainError('INVALID_STATE_TRANSITION');
      await tx
        .update(athlete)
        .set({
          fullName: pseudonymLabel(e.startNumber),
          club: null,
          birthYear: null,
          pseudonymizedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(athlete.id, a.id));
      await tx.execute(sql`SELECT scrub_athlete_pii(${a.id}::uuid)`);
      await this.audit.record(tx, {
        action: 'ATHLETE_ANONYMIZED',
        tournamentId: t.id,
        entityType: 'athlete',
        entityId: a.id,
        after: { startNumber: e.startNumber },
      });
      await this.changes.append(tx, { tournamentId: t.id, entityType: 'athlete', entityId: a.id });
      await this.configChanged(tx, t, c, e.id);
      return this.rowFor(tx, c, e.id);
    });
  }

  /** Usunięcie tylko bez ocen (INT-06); zawodniczka bez innych startów też znika; kolejka zagęszczona. */
  async remove(ownerId: string, entryId: string) {
    await withTx(this.db, async (tx) => {
      const {
        category: c,
        tournament: t,
        entry: e,
        athlete: a,
      } = await this.owned.entry(tx, entryId, ownerId, true);
      assertTournamentWritable(t);
      const [sheets] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(scoreSheet)
        .where(eq(scoreSheet.entryId, e.id));
      if ((sheets?.n ?? 0) > 0) throw new DomainError('HAS_SCORES');
      await tx.delete(entry).where(eq(entry.id, e.id));
      const [others] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(entry)
        .where(and(eq(entry.athleteId, a.id), ne(entry.id, e.id)));
      if ((others?.n ?? 0) === 0) await tx.delete(athlete).where(eq(athlete.id, a.id));
      await tx.execute(sql`SET CONSTRAINTS entry_start_order_uq DEFERRED`);
      const shifted = await tx
        .update(entry)
        .set({ startOrder: sql`${entry.startOrder} - 1` })
        .where(and(eq(entry.categoryId, c.id), gt(entry.startOrder, e.startOrder)))
        .returning({ id: entry.id });
      await this.audit.record(tx, {
        action: 'ENTRY_DELETED',
        tournamentId: t.id,
        entityType: 'entry',
        entityId: e.id,
        before: { startNumber: e.startNumber },
      });
      await this.configChanged(tx, t, c, e.id, 'D');
      // Przesunięta kolejka startowa też musi dotrzeć do tabletów.
      for (const s of shifted) {
        await this.changes.append(tx, { tournamentId: t.id, entityType: 'entry', entityId: s.id });
      }
      if (c.status === 'IN_PROGRESS') await this.results.recalculate(tx, c.id);
    });
  }
}
