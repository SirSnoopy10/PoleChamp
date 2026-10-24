import { Injectable } from '@nestjs/common';
import { and, count, eq, isNull } from 'drizzle-orm';
import { DomainError } from '../../common/errors/domain-error.js';
import type { Tx } from '../../db/client.js';
import { category, criterion, device, entry, judge, penaltyType } from '../../db/schema.js';

/** Limity turnieju (NFR-801, FR-306) – jedna stała, nadpisywalna w testach. */
export const TOURNAMENT_LIMITS = {
  categories: 60,
  entriesPerTournament: 1_500,
  entriesPerCategory: 300,
  judges: 30,
  devices: 20,
  criteria: 12,
  penaltyTypes: 10,
};

export type LimitKind = keyof typeof TOURNAMENT_LIMITS;

/**
 * `assertCanAdd` liczy istniejące rekordy w transakcji komendy (rodzic jest już zablokowany
 * `FOR UPDATE`, więc równoległe dodawanie nie przekroczy limitu) – IMP-132.
 */
@Injectable()
export class LimitsService {
  async assertCanAdd(tx: Tx, kind: LimitKind, scopeId: string): Promise<void> {
    const max = TOURNAMENT_LIMITS[kind];
    const [row] = await this.count(tx, kind, scopeId);
    if ((row?.n ?? 0) >= max) {
      throw new DomainError('LIMIT_EXCEEDED', `Limit ${kind}: ${max}`, { body: { limit: kind, max } });
    }
  }

  private count(tx: Tx, kind: LimitKind, scopeId: string) {
    const n = count();
    switch (kind) {
      case 'categories':
        return tx.select({ n }).from(category).where(eq(category.tournamentId, scopeId));
      case 'entriesPerTournament':
        return tx.select({ n }).from(entry).where(eq(entry.tournamentId, scopeId));
      case 'entriesPerCategory':
        return tx.select({ n }).from(entry).where(eq(entry.categoryId, scopeId));
      case 'judges':
        return tx.select({ n }).from(judge).where(eq(judge.tournamentId, scopeId));
      case 'devices':
        return tx
          .select({ n })
          .from(device)
          .where(and(eq(device.tournamentId, scopeId), isNull(device.revokedAt)));
      case 'criteria':
        return tx.select({ n }).from(criterion).where(eq(criterion.categoryId, scopeId));
      case 'penaltyTypes':
        return tx.select({ n }).from(penaltyType).where(eq(penaltyType.categoryId, scopeId));
    }
  }
}
