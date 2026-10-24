import { Inject, Injectable } from '@nestjs/common';
import type { Snapshot } from '@polechamp/contracts';
import { and, asc, eq, inArray, isNull, max } from 'drizzle-orm';
import { DomainError } from '../../common/errors/domain-error.js';
import { groupBy } from '../../common/group-by.js';
import { deviceKey, wrapVerifier } from '../../crypto/pin-wrap.js';
import { DB, type Db, type Tx } from '../../db/client.js';
import {
  athlete,
  category,
  categoryJudge,
  changeLog,
  criterion,
  device,
  entry,
  judge,
  penaltyType,
  tournament,
} from '../../db/schema.js';
import { withTx } from '../../db/tx.js';
import { toCriterion, toPenaltyType } from '../organizer/mappers.js';
import { PIN_OFFLINE_ITERATIONS } from '../organizer/pin.service.js';

type JudgeRow = typeof judge.$inferSelect;

/**
 * Weryfikator PIN offline zaszyfrowany kluczem urządzenia (TL-04). Nie wydajemy go, gdy logowanie offline
 * jest wyłączone albo sędzia nie może się zalogować (nieaktywny, PIN zablokowany).
 */
export function judgeForDevice(j: JudgeRow, key: Buffer, allowOffline: boolean) {
  const usable = allowOffline && j.isActive && !j.pinLockedAt;
  return {
    id: j.id,
    fullName: j.fullName,
    initials: j.initials,
    isActive: j.isActive,
    pinLocked: j.pinLockedAt !== null,
    position: j.position,
    pinVersion: j.pinVersion,
    pinVerifier: usable
      ? {
          alg: 'PBKDF2-SHA256' as const,
          iterations: PIN_OFFLINE_ITERATIONS,
          salt: j.pinOfflineSalt.toString('base64'),
          wrapped: wrapVerifier(key, j.pinOfflineVerifier, j.id, j.pinVersion),
        }
      : null,
  };
}

/** Pełna migawka turnieju dla tabletu (03-api §4; IMP-144, FR-504, NFR-502). */
@Injectable()
export class SnapshotService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async snapshot(deviceId: string): Promise<Snapshot> {
    const [d] = await this.db
      .select({ tournamentId: device.tournamentId, pepper: device.pepper })
      .from(device)
      .where(and(eq(device.id, deviceId), isNull(device.revokedAt)));
    if (!d) throw new DomainError('DEVICE_REVOKED');
    // Jedna migawka bazy: kursor i dane spójne mimo równoległych zmian organizatora (TC-EDGE-050).
    const snapshot = await withTx(this.db, (tx) => this.read(tx, d.tournamentId, deviceKey(d.pepper)), {
      isolation: 'repeatable read',
      readOnly: true,
    });
    await this.db
      .update(device)
      .set({ lastSyncAt: new Date(), lastSyncCursor: snapshot.cursor })
      .where(eq(device.id, deviceId));
    return snapshot;
  }

  private async read(tx: Tx, tournamentId: string, key: Buffer): Promise<Snapshot> {
    const [cursorRow] = await tx
      .select({ seq: max(changeLog.seq) })
      .from(changeLog)
      .where(eq(changeLog.tournamentId, tournamentId));
    const [t] = await tx
      .select()
      .from(tournament)
      .where(and(eq(tournament.id, tournamentId), isNull(tournament.deletedAt)));
    if (!t) throw new DomainError('DEVICE_REVOKED');

    const judges = await tx
      .select()
      .from(judge)
      .where(eq(judge.tournamentId, t.id))
      .orderBy(asc(judge.position));
    const categories = await tx
      .select()
      .from(category)
      .where(eq(category.tournamentId, t.id))
      .orderBy(asc(category.position));
    const ids = categories.map((c) => c.id);
    const [criteria, penalties, panel, entries] = ids.length
      ? await Promise.all([
          tx
            .select()
            .from(criterion)
            .where(inArray(criterion.categoryId, ids))
            .orderBy(asc(criterion.position)),
          tx
            .select()
            .from(penaltyType)
            .where(inArray(penaltyType.categoryId, ids))
            .orderBy(asc(penaltyType.position)),
          tx
            .select()
            .from(categoryJudge)
            .innerJoin(judge, eq(judge.id, categoryJudge.judgeId))
            .where(inArray(categoryJudge.categoryId, ids))
            .orderBy(asc(judge.position)),
          // Tylko pola potrzebne do oceniania – bez roku urodzenia i znacznika małoletności (NFR-502).
          tx
            .select({
              id: entry.id,
              categoryId: entry.categoryId,
              startNumber: entry.startNumber,
              startOrder: entry.startOrder,
              status: entry.status,
              fullName: athlete.fullName,
              club: athlete.club,
            })
            .from(entry)
            .innerJoin(athlete, eq(athlete.id, entry.athleteId))
            .where(eq(entry.tournamentId, t.id))
            .orderBy(asc(entry.startOrder)),
        ])
      : [[], [], [], []];
    const criteriaBy = groupBy(criteria, (c) => c.categoryId);
    const penaltiesBy = groupBy(penalties, (p) => p.categoryId);
    const panelBy = groupBy(panel, (p) => p.category_judge.categoryId);
    const entriesBy = groupBy(entries, (e) => e.categoryId);

    return {
      cursor: Math.max(cursorRow?.seq ?? 0, t.changeSeq),
      serverTime: new Date().toISOString(),
      tournament: {
        id: t.id,
        name: t.name,
        status: t.status,
        allowOfflinePinLogin: t.allowOfflinePinLogin,
      },
      judges: judges.map((j) => judgeForDevice(j, key, t.allowOfflinePinLogin)),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        style: c.style,
        level: c.level,
        ageGroup: c.ageGroup,
        position: c.position,
        status: c.status,
        aggregationMethod: c.aggregationMethod,
        tieBreakCriterionId: c.tieBreakCriterionId,
        panelJudgeIds: (panelBy.get(c.id) ?? []).map((p) => p.category_judge.judgeId),
        criteria: (criteriaBy.get(c.id) ?? []).map(toCriterion),
        penaltyTypes: (penaltiesBy.get(c.id) ?? []).map(toPenaltyType),
        entries: (entriesBy.get(c.id) ?? []).map(({ categoryId: _c, ...e }) => e),
      })),
    };
  }
}
