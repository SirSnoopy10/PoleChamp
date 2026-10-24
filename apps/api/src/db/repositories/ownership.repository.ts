import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DomainError } from '../../common/errors/domain-error.js';
import { UUID_RE } from '../../common/ids.js';
import type { Db, Tx } from '../client.js';
import { one } from '../one.js';
import { athlete, category, criterion, entry, judge, penaltyType, tournament } from '../schema.js';

type Conn = Db | Tx;
export type TournamentRow = typeof tournament.$inferSelect;
export type CategoryRow = typeof category.$inferSelect;
export type EntryRow = typeof entry.$inferSelect;
export type JudgeRow = typeof judge.$inferSelect;

const NOT_FOUND = () => new DomainError('NOT_FOUND');

/** Identyfikator spoza formatu UUID to po prostu nieistniejący zasób (bez błędu bazy). */
function assertUuid(id: string): void {
  if (!UUID_RE.test(id)) throw NOT_FOUND();
}

/**
 * Repozytorium z kontekstem właściciela (IMP-108, 05-bezpieczenstwo §4.1): każde wyszukanie zasobu
 * organizatora filtruje po `tournament.owner_id`, a zasób innego właściciela daje 404 (nie 403).
 * `forUpdate` blokuje wiersz turnieju na czas komendy (serializacja zmian stanu).
 */
@Injectable()
export class OwnershipRepository {
  async tournament(
    conn: Conn,
    tournamentId: string,
    ownerId: string,
    forUpdate = false,
  ): Promise<TournamentRow> {
    assertUuid(tournamentId);
    const query = conn
      .select()
      .from(tournament)
      .where(
        and(eq(tournament.id, tournamentId), eq(tournament.ownerId, ownerId), isNull(tournament.deletedAt)),
      );
    const [row] = forUpdate ? await query.for('update') : await query;
    if (!row) throw NOT_FOUND();
    return row;
  }

  async category(
    conn: Conn,
    categoryId: string,
    ownerId: string,
    forUpdate = false,
  ): Promise<{ category: CategoryRow; tournament: TournamentRow }> {
    assertUuid(categoryId);
    const [row] = await conn
      .select({ category, tournament })
      .from(category)
      .innerJoin(tournament, eq(tournament.id, category.tournamentId))
      .where(and(eq(category.id, categoryId), eq(tournament.ownerId, ownerId), isNull(tournament.deletedAt)));
    if (!row) throw NOT_FOUND();
    if (!forUpdate) return row;
    // Kolejność blokad: turniej → kategoria (jak w zakończeniu turnieju), bez zakleszczeń.
    const t = await this.tournament(conn, row.tournament.id, ownerId, true);
    const [c] = await conn.select().from(category).where(eq(category.id, categoryId)).for('update');
    if (!c) throw NOT_FOUND();
    return { category: c, tournament: t };
  }

  async criterion(conn: Conn, criterionId: string, ownerId: string) {
    assertUuid(criterionId);
    const [row] = await conn
      .select({ categoryId: criterion.categoryId })
      .from(criterion)
      .where(eq(criterion.id, criterionId));
    if (!row) throw NOT_FOUND();
    const scope = await this.category(conn, row.categoryId, ownerId, true);
    const c = one(await conn.select().from(criterion).where(eq(criterion.id, criterionId)));
    return { ...scope, criterion: c };
  }

  async penaltyType(conn: Conn, penaltyTypeId: string, ownerId: string) {
    assertUuid(penaltyTypeId);
    const [row] = await conn
      .select({ categoryId: penaltyType.categoryId })
      .from(penaltyType)
      .where(eq(penaltyType.id, penaltyTypeId));
    if (!row) throw NOT_FOUND();
    const scope = await this.category(conn, row.categoryId, ownerId, true);
    const p = one(await conn.select().from(penaltyType).where(eq(penaltyType.id, penaltyTypeId)));
    return { ...scope, penaltyType: p };
  }

  async entry(conn: Conn, entryId: string, ownerId: string, forUpdate = false) {
    assertUuid(entryId);
    const [row] = await conn
      .select({ categoryId: entry.categoryId })
      .from(entry)
      .where(eq(entry.id, entryId));
    if (!row) throw NOT_FOUND();
    const scope = await this.category(conn, row.categoryId, ownerId, forUpdate);
    const found = one(
      await conn
        .select({ entry, athlete })
        .from(entry)
        .innerJoin(athlete, eq(athlete.id, entry.athleteId))
        .where(eq(entry.id, entryId)),
    );
    return { ...scope, entry: found.entry, athlete: found.athlete };
  }

  async judge(conn: Conn, judgeId: string, ownerId: string, forUpdate = false) {
    assertUuid(judgeId);
    const [row] = await conn
      .select({ tournamentId: judge.tournamentId })
      .from(judge)
      .where(eq(judge.id, judgeId));
    if (!row) throw NOT_FOUND();
    const t = await this.tournament(conn, row.tournamentId, ownerId, forUpdate);
    const query = conn.select().from(judge).where(eq(judge.id, judgeId));
    const j = one(forUpdate ? await query.for('update') : await query);
    return { tournament: t, judge: j };
  }
}

/** INT-05: turniej zakończony jest tylko do odczytu (wyjątek RODO obsługują same komendy – TL-17). */
export function assertTournamentWritable(t: TournamentRow): void {
  if (t.status === 'FINISHED') throw new DomainError('TOURNAMENT_FINISHED');
}

/** Optymistyczna współbieżność (IMP-111): wersja z `If-Match` musi być aktualna. */
export function assertVersion(current: number, expected: number): void {
  if (current !== expected) throw new DomainError('CONFLICT_VERSION');
}
