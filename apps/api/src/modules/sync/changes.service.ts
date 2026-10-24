import { Inject, Injectable } from '@nestjs/common';
import type { ChangesResponse } from '@polechamp/contracts';
import { and, asc, eq, gt, inArray, isNull } from 'drizzle-orm';
import type { Claims } from '../../common/auth/auth.decorators.js';
import { DomainError } from '../../common/errors/domain-error.js';
import { groupBy } from '../../common/group-by.js';
import { deviceKey } from '../../crypto/pin-wrap.js';
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
  scoreSheet,
  tournament,
} from '../../db/schema.js';
import { withTx } from '../../db/tx.js';
import type { ChangeEntity } from '../audit/audit.service.js';
import { deviceOf } from '../devices/devices.controller.js';
import { toCriterion, toPenaltyType } from '../organizer/mappers.js';
import { loadSheets } from './sheets.js';
import { judgeForDevice } from './snapshot.service.js';

/** Wpisy dziennika zmian są zachowywane 30 dni po zakończeniu turnieju (02-model §2.21). */
export const CHANGE_LOG_RETENTION_MS = 30 * 24 * 3600_000;

type TournamentRow = typeof tournament.$inferSelect;
type LogRow = { seq: number; entityType: ChangeEntity; entityId: string; op: 'U' | 'D' };
type Change = ChangesResponse['changes'][number];
type Entity = { id: string } & Record<string, unknown>;

/** Kursor sprzed retencji albo spoza zakresu turnieju → tablet pobiera migawkę (410 CURSOR_EXPIRED). */
export function cursorExpired(
  t: Pick<TournamentRow, 'finishedAt' | 'changeSeq'>,
  since: number,
  now = Date.now(),
) {
  if (since > t.changeSeq) return true;
  return (
    since < t.changeSeq && t.finishedAt !== null && now - t.finishedAt.getTime() > CHANGE_LOG_RETENTION_MS
  );
}

/** Pobieranie zmian od kursora z filtrem odbiorców (03-api §5.2; IMP-145, TL-49). */
@Injectable()
export class ChangesService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async changes(claims: Claims, since: number, limit: number): Promise<ChangesResponse> {
    const deviceId = deviceOf(claims);
    const [d] = await this.db
      .select({ tournamentId: device.tournamentId, pepper: device.pepper })
      .from(device)
      .where(and(eq(device.id, deviceId), isNull(device.revokedAt)));
    if (!d) throw new DomainError('DEVICE_REVOKED');
    // Arkusze: pochodzące z tego urządzenia oraz (z tokenem sędziego) własne arkusze sędziego.
    const audiences = ['ALL', `DEVICE:${deviceId}`];
    if (claims.typ === 'judge') audiences.push(`JUDGE:${claims.sub}`);
    const page = await withTx(
      this.db,
      (tx) => this.read(tx, d.tournamentId, deviceKey(d.pepper), audiences, since, limit),
      { isolation: 'repeatable read', readOnly: true },
    );
    await this.db
      .update(device)
      .set({ lastSyncAt: new Date(), lastSyncCursor: page.cursor })
      .where(eq(device.id, deviceId));
    return page;
  }

  private async read(
    tx: Tx,
    tournamentId: string,
    key: Buffer,
    audiences: string[],
    since: number,
    limit: number,
  ): Promise<ChangesResponse> {
    const [t] = await tx
      .select()
      .from(tournament)
      .where(and(eq(tournament.id, tournamentId), isNull(tournament.deletedAt)));
    if (!t) throw new DomainError('DEVICE_REVOKED');
    if (cursorExpired(t, since)) throw new DomainError('CURSOR_EXPIRED');
    const rows = (await tx
      .select({
        seq: changeLog.seq,
        entityType: changeLog.entityType,
        entityId: changeLog.entityId,
        op: changeLog.op,
      })
      .from(changeLog)
      .where(
        and(
          eq(changeLog.tournamentId, t.id),
          gt(changeLog.seq, since),
          inArray(changeLog.audience, audiences),
        ),
      )
      .orderBy(asc(changeLog.seq))
      .limit(limit + 1)) as LogRow[];
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    // Ostatnia strona kończy się na bieżącym `change_seq` – także gdy dalsze wpisy są dla innych odbiorców.
    const cursor = hasMore ? (page.at(-1) as LogRow).seq : t.changeSeq;

    // Kilka zmian tej samej encji na stronie → jedna, z najnowszym `seq` (stan i tak czytany bieżący).
    const latest = new Map<string, LogRow>();
    for (const row of page) {
      const k = `${row.entityType}:${row.entityId}`;
      latest.delete(k);
      latest.set(k, row);
    }
    const unique = [...latest.values()];
    const entities = await this.materialize(
      tx,
      t,
      key,
      unique.filter((r) => r.op === 'U'),
    );
    return {
      changes: unique.map((r): Change => {
        const entity = r.op === 'U' ? entities.get(`${r.entityType}:${r.entityId}`) : undefined;
        // Encja usunięta po zapisaniu zmiany → dla tabletu to usunięcie.
        return entity
          ? { seq: r.seq, entityType: r.entityType, op: 'U', entity }
          : { seq: r.seq, entityType: r.entityType, op: 'D', entity: { id: r.entityId } };
      }),
      cursor,
      hasMore,
    };
  }

  /** Bieżący stan encji ze strony zmian – zbiorczo per typ. */
  private async materialize(tx: Tx, t: TournamentRow, key: Buffer, rows: LogRow[]) {
    const ids = groupBy(rows, (r) => r.entityType);
    const of = (type: ChangeEntity) => (ids.get(type) ?? []).map((r) => r.entityId);
    const out = new Map<string, Entity>();
    const put = (type: ChangeEntity, e: Entity) => out.set(`${type}:${e.id}`, e);

    if (of('tournament').length) {
      put('tournament', {
        id: t.id,
        name: t.name,
        status: t.status,
        allowOfflinePinLogin: t.allowOfflinePinLogin,
      });
    }

    const categoryIds = of('category');
    if (categoryIds.length) {
      const [cats, panel] = await Promise.all([
        tx
          .select()
          .from(category)
          .where(and(inArray(category.id, categoryIds), eq(category.tournamentId, t.id))),
        tx
          .select({ categoryId: categoryJudge.categoryId, judgeId: categoryJudge.judgeId })
          .from(categoryJudge)
          .innerJoin(judge, eq(judge.id, categoryJudge.judgeId))
          .where(inArray(categoryJudge.categoryId, categoryIds))
          .orderBy(asc(judge.position)),
      ]);
      const panelBy = groupBy(panel, (p) => p.categoryId);
      for (const c of cats) {
        put('category', {
          id: c.id,
          name: c.name,
          style: c.style,
          level: c.level,
          ageGroup: c.ageGroup,
          position: c.position,
          status: c.status,
          aggregationMethod: c.aggregationMethod,
          tieBreakCriterionId: c.tieBreakCriterionId,
          panelJudgeIds: (panelBy.get(c.id) ?? []).map((p) => p.judgeId),
          lockedAt: c.lockedAt?.toISOString() ?? null,
        });
      }
    }

    const criterionIds = of('criterion');
    if (criterionIds.length) {
      for (const c of await tx.select().from(criterion).where(inArray(criterion.id, criterionIds))) {
        put('criterion', { ...toCriterion(c), categoryId: c.categoryId });
      }
    }

    const penaltyIds = of('penalty_type');
    if (penaltyIds.length) {
      for (const p of await tx.select().from(penaltyType).where(inArray(penaltyType.id, penaltyIds))) {
        put('penalty_type', { ...toPenaltyType(p), categoryId: p.categoryId });
      }
    }

    // Starty i zawodniczki bez roku urodzenia i małoletności (NFR-502).
    const entryIds = of('entry');
    if (entryIds.length) {
      const entries = await tx
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
        .where(and(inArray(entry.id, entryIds), eq(entry.tournamentId, t.id)));
      for (const e of entries) put('entry', e);
    }

    const athleteIds = of('athlete');
    if (athleteIds.length) {
      const [athletes, starts] = await Promise.all([
        tx
          .select({ id: athlete.id, fullName: athlete.fullName, club: athlete.club })
          .from(athlete)
          .where(and(inArray(athlete.id, athleteIds), eq(athlete.tournamentId, t.id))),
        tx
          .select({ id: entry.id, athleteId: entry.athleteId })
          .from(entry)
          .where(inArray(entry.athleteId, athleteIds)),
      ]);
      const startsBy = groupBy(starts, (s) => s.athleteId);
      for (const a of athletes)
        put('athlete', { ...a, entryIds: (startsBy.get(a.id) ?? []).map((s) => s.id) });
    }

    const judgeIds = of('judge');
    if (judgeIds.length) {
      const judges = await tx
        .select()
        .from(judge)
        .where(and(inArray(judge.id, judgeIds), eq(judge.tournamentId, t.id)));
      for (const j of judges) put('judge', judgeForDevice(j, key, t.allowOfflinePinLogin));
    }

    const sheetIds = of('score_sheet');
    if (sheetIds.length) {
      for (const s of await loadSheets(tx, inArray(scoreSheet.id, sheetIds))) {
        put('score_sheet', { id: s.scoreSheetId, ...s });
      }
    }
    return out;
  }
}
