import { Inject, Injectable } from '@nestjs/common';
import type { AuditEntry } from '@polechamp/contracts';
import { and, desc, eq, sql } from 'drizzle-orm';
import { validationFailed } from '../../common/errors/domain-error.js';
import { DB, type Db } from '../../db/client.js';
import { OwnershipRepository } from '../../db/repositories/ownership.repository.js';
import { auditLog } from '../../db/schema.js';

interface Cursor {
  at: string;
  id: number;
}

const encode = (c: Cursor) => Buffer.from(`${c.at}|${c.id}`).toString('base64url');

function decode(cursor: string): Cursor {
  const [at = '', id = ''] = Buffer.from(cursor, 'base64url').toString().split('|');
  if (Number.isNaN(Date.parse(at)) || !/^\d+$/.test(id)) {
    throw validationFailed([{ field: 'cursor', code: 'INVALID_FORMAT' }]);
  }
  return { at, id: Number(id) };
}

type Json = Record<string, unknown> | null;

/**
 * Odczyt dziennika audytu turnieju (IMP-175, FR-901): malejąco po (`occurred_at`, `id`), kursor
 * stabilny przy dopisywaniu nowych wpisów (nowsze są „przed” kursorem). Bez IP i bez tras zmian.
 */
@Injectable()
export class AuditReadService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(OwnershipRepository) private readonly owned: OwnershipRepository,
  ) {}

  async list(
    ownerId: string,
    tournamentId: string,
    query: { cursor?: string; entityType?: string; limit: number },
  ): Promise<{ items: AuditEntry[]; nextCursor: string | null }> {
    const t = await this.owned.tournament(this.db, tournamentId, ownerId);
    const cursor = query.cursor ? decode(query.cursor) : undefined;
    const rows = await this.db
      .select({
        id: auditLog.id,
        occurredAt: sql<string>`to_char(${auditLog.occurredAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
        actorType: auditLog.actorType,
        actorId: auditLog.actorId,
        deviceId: auditLog.deviceId,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        before: auditLog.before,
        after: auditLog.after,
      })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.tournamentId, t.id),
          query.entityType ? eq(auditLog.entityType, query.entityType) : undefined,
          cursor
            ? sql`(${auditLog.occurredAt}, ${auditLog.id}) < (${cursor.at}::timestamptz, ${cursor.id})`
            : undefined,
        ),
      )
      .orderBy(desc(auditLog.occurredAt), desc(auditLog.id))
      .limit(query.limit + 1);
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      items: page.map((r) => ({
        id: String(r.id),
        // Mikrosekundy zostają w kursorze; w odpowiedzi ISO z milisekundami.
        at: new Date(r.occurredAt).toISOString(),
        actorType: r.actorType,
        actorId: r.actorId,
        deviceId: r.deviceId,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        before: r.before as Json,
        after: r.after as Json,
      })),
      nextCursor: rows.length > query.limit && last ? encode({ at: last.occurredAt, id: last.id }) : null,
    };
  }
}
