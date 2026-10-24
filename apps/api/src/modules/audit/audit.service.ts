import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { serverEvents, type ServerEventName, type ServerEventPayload } from '@polechamp/contracts';
import { requestContext } from '../../common/request-context.js';
import type { Tx } from '../../db/client.js';
import { auditLog, changeLog, domainEvent, tournament } from '../../db/schema.js';

/** Pola nigdy niezapisywane w audycie (05-bezpieczenstwo §6). */
const SENSITIVE = /pin|password|secret|token|pepper|verifier|hash|salt/i;

type Json = Record<string, unknown>;

function sanitize(value: Json | null | undefined): Json | null {
  if (!value) return null;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([k]) => !SENSITIVE.test(k))
      .map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]),
  );
}

/** Różnica pól: przy edycji zapisujemy tylko zmienione wartości przed i po. */
function diff(before: Json | null, after: Json | null): { before: Json | null; after: Json | null } {
  if (!before || !after) return { before, after };
  const keys = Object.keys(after).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
  return {
    before: Object.fromEntries(keys.map((k) => [k, before[k]])),
    after: Object.fromEntries(keys.map((k) => [k, after[k]])),
  };
}

export interface AuditInput {
  action: string;
  tournamentId?: string | null;
  entityType?: string;
  entityId?: string | null;
  before?: Json | null;
  after?: Json | null;
}

/** Dziennik audytu (IMP-109, FR-901) – zawsze w transakcji komendy, bez sekretów. */
@Injectable()
export class AuditService {
  async record(tx: Tx, input: AuditInput): Promise<void> {
    const ctx = requestContext.get();
    const actor = requestContext.actor();
    const { before, after } = diff(sanitize(input.before), sanitize(input.after));
    await tx.insert(auditLog).values({
      tournamentId: input.tournamentId ?? null,
      actorType: actor.type,
      actorId: actor.id,
      deviceId: actor.deviceId ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      before,
      after,
      requestId: ctx?.requestId ?? null,
      ip: actor.type === 'ORGANIZER' ? (ctx?.ip ?? null) : null,
    });
  }
}

export type ChangeEntity =
  'tournament' | 'category' | 'criterion' | 'penalty_type' | 'entry' | 'athlete' | 'judge' | 'score_sheet';

/** Dziennik zmian dla synchronizacji tabletów (IMP-109, 06-offline §4): kursor `seq` per turniej. */
@Injectable()
export class ChangeLogService {
  async append(
    tx: Tx,
    input: {
      tournamentId: string;
      entityType: ChangeEntity;
      entityId: string;
      op?: 'U' | 'D';
      audience?: string;
    },
  ): Promise<number> {
    const [row] = await tx
      .insert(changeLog)
      .values({
        tournamentId: input.tournamentId,
        entityType: input.entityType,
        entityId: input.entityId,
        op: input.op ?? 'U',
        audience: input.audience ?? 'ALL',
      })
      .returning({ seq: changeLog.seq });
    const seq = row?.seq ?? 0;
    await tx.update(tournament).set({ changeSeq: seq }).where(eq(tournament.id, input.tournamentId));
    return seq;
  }
}

/** Outbox zdarzeń realtime (IMP-109): zapis w transakcji, publikacja po zatwierdzeniu (IMP-155). */
@Injectable()
export class DomainEventService {
  async emit<E extends ServerEventName>(
    tx: Tx,
    type: E,
    payload: ServerEventPayload<E>,
    tournamentId: string | null,
    target: { deviceId?: string } = {},
  ): Promise<void> {
    const parsed = serverEvents[type].parse(payload);
    await tx
      .insert(domainEvent)
      .values({ type, payload: parsed, tournamentId, deviceId: target.deviceId ?? null });
  }
}
