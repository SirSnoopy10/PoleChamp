import { sql } from 'drizzle-orm';
import { type Actor, requestContext } from '../common/request-context.js';
import type { Db, Tx } from './client.js';

export type Isolation = 'read committed' | 'repeatable read' | 'serializable';

/**
 * Jawna transakcja z kontekstem aktora (IMP-103 krok 2): `SET LOCAL app.actor_type`, `app.actor_id`,
 * `app.request_id` są widoczne dla wyzwalaczy i audytu w tej transakcji.
 */
export function withTx<T>(
  db: Db,
  fn: (tx: Tx) => Promise<T>,
  options: { isolation?: Isolation; readOnly?: boolean; actor?: Actor } = {},
): Promise<T> {
  const actor = options.actor ?? requestContext.actor();
  const requestId = requestContext.requestId();
  return db.transaction(
    async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.actor_type', ${actor.type}, true),
                   set_config('app.actor_id', ${actor.id ?? ''}, true),
                   set_config('app.request_id', ${requestId ?? ''}, true)`,
      );
      return fn(tx);
    },
    {
      isolationLevel: options.isolation ?? 'read committed',
      ...(options.readOnly ? { accessMode: 'read only' as const } : {}),
    },
  );
}
