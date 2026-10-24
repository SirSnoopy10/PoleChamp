import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, isNull, sql } from 'drizzle-orm';
import { DomainError } from '../../common/errors/domain-error.js';
import { DB, type Db, type Tx } from '../../db/client.js';
import {
  assertTournamentWritable,
  type CategoryRow,
  OwnershipRepository,
  type TournamentRow,
} from '../../db/repositories/ownership.repository.js';
import { category, device } from '../../db/schema.js';
import { withTx } from '../../db/tx.js';
import { AuditService, ChangeLogService, DomainEventService } from '../audit/audit.service.js';
import { ResultsService } from '../results/results.service.js';
import { one } from '../../db/one.js';

/** Urządzenie bez kontaktu dłużej niż 2 min od startu kategorii jest „offline” (TL-19). */
const OFFLINE_AFTER_MS = 2 * 60_000;

export interface LockOptions {
  force: boolean;
  reason?: string;
}

/** Blokada i odblokowanie kategorii z sumą kontrolną wyników (IMP-127, ADR-010). */
@Injectable()
export class CategoryLockService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(OwnershipRepository) private readonly owned: OwnershipRepository,
    @Inject(ResultsService) private readonly results: ResultsService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ChangeLogService) private readonly changes: ChangeLogService,
    @Inject(DomainEventService) private readonly events: DomainEventService,
  ) {}

  /** Ostrzeżenia przed blokadą: brakujące oceny i tablety z kolejką lub bez kontaktu (TL-19). */
  async warnings(tx: Tx, c: CategoryRow) {
    const { progress } = await this.results.progress(tx, c);
    const startedAt = c.startedAt ?? new Date(0);
    const devices = await tx
      .select()
      .from(device)
      .where(
        and(
          eq(device.tournamentId, c.tournamentId),
          isNull(device.revokedAt),
          gte(device.lastSeenAt, startedAt),
        ),
      );
    const row = (d: (typeof devices)[number]) => ({
      deviceId: d.id,
      name: d.name,
      pendingMutations: d.pendingMutations,
      lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
    });
    const now = Date.now();
    return {
      missingSheets: Math.max(0, progress.expected - progress.done),
      devicesWithPending: devices.filter((d) => d.pendingMutations > 0).map(row),
      offlineDevices: devices.filter((d) => now - (d.lastSeenAt?.getTime() ?? 0) > OFFLINE_AFTER_MS).map(row),
    };
  }

  async lockWithinTx(tx: Tx, c: CategoryRow, t: TournamentRow, ownerId: string, options: LockOptions) {
    if (c.status !== 'IN_PROGRESS') throw new DomainError('INVALID_STATE_TRANSITION');
    const warnings = await this.warnings(tx, c);
    const hasWarnings =
      warnings.missingSheets > 0 ||
      warnings.devicesWithPending.length > 0 ||
      warnings.offlineDevices.length > 0;
    if (hasWarnings && !options.force) throw new DomainError('LOCK_WARNINGS', undefined, { body: warnings });

    const lockedAt = new Date();
    await tx.update(category).set({ status: 'LOCKED' }).where(eq(category.id, c.id));
    const result = await this.results.recompute(tx, c.id, { forPdf: false });
    const finalResultsHash = this.results.resultsHash(c.id, result, c.aggregationMethod);
    const updated = one(
      await tx
        .update(category)
        .set({ lockedAt, lockedBy: ownerId, finalResultsHash, version: c.version + 1, updatedAt: lockedAt })
        .where(eq(category.id, c.id))
        .returning(),
    );
    await this.audit.record(tx, {
      action: 'CATEGORY_LOCKED',
      tournamentId: t.id,
      entityType: 'category',
      entityId: c.id,
      after: { finalResultsHash, force: options.force, reason: options.reason ?? null, ...warnings },
    });
    await this.changes.append(tx, { tournamentId: t.id, entityType: 'category', entityId: c.id });
    await this.events.emit(
      tx,
      'category.locked',
      { categoryId: c.id, lockedAt: lockedAt.toISOString() },
      t.id,
    );
    await this.events.emit(
      tx,
      'results.updated',
      { categoryId: c.id, resultsVersion: result.resultsVersion },
      t.id,
    );
    return {
      id: c.id,
      status: 'LOCKED' as const,
      lockedAt: lockedAt.toISOString(),
      resultsVersion: result.resultsVersion,
      finalResultsHash,
      version: updated.version,
    };
  }

  async lock(ownerId: string, categoryId: string, options: LockOptions) {
    return withTx(this.db, async (tx) => {
      const { category: c, tournament: t } = await this.owned.category(tx, categoryId, ownerId, true);
      assertTournamentWritable(t);
      return this.lockWithinTx(tx, c, t, ownerId, options);
    });
  }

  /** LOCKED → IN_PROGRESS; wyniki tracą status ostatecznych (`final_results_hash = NULL`). */
  async unlock(ownerId: string, categoryId: string, reason: string | null | undefined) {
    return withTx(this.db, async (tx) => {
      const { category: c, tournament: t } = await this.owned.category(tx, categoryId, ownerId, true);
      assertTournamentWritable(t);
      if (c.status !== 'LOCKED') throw new DomainError('INVALID_STATE_TRANSITION');
      await tx
        .update(category)
        .set({
          status: 'IN_PROGRESS',
          finalResultsHash: null,
          lockedAt: null,
          lockedBy: null,
          version: sql`${category.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(category.id, c.id));
      await this.audit.record(tx, {
        action: 'CATEGORY_UNLOCKED',
        tournamentId: t.id,
        entityType: 'category',
        entityId: c.id,
        after: { reason: reason ?? null },
      });
      await this.changes.append(tx, { tournamentId: t.id, entityType: 'category', entityId: c.id });
      await this.events.emit(tx, 'category.unlocked', { categoryId: c.id }, t.id);
      return c.id;
    });
  }
}
