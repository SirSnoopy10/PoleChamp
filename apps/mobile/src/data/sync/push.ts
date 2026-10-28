import type { PushResponse } from '@polechamp/contracts';
import { toApiError } from '../api/errors';
import type { DeviceAuth } from '../auth/deviceAuth';
import type { Db } from '../local/LocalDb';
import { OUTBOX_BATCH, outbox, type OutboxEntry } from '../outbox/outbox';
import { toHundredths } from './apply';
import { readMeta, writeMeta } from './meta';
import type { SyncDeps } from './pull';

/** Limit czasu `POST /sync/push` (06-offline §3.2). */
export const PUSH_TIMEOUT_MS = 15_000;
const MAX_DELAY_MS = 60_000;
/** Odpowiedzi 4xx, po których paczka wraca do kolejki (reszta 4xx = błąd trwały paczki). */
const RETRYABLE_4XX = new Set([401, 408, 409, 413, 429]);

/** Backoff `min(60 s, 1 s × 2^attempts) ± 20%` (TC-OUTBOX-007). */
export function nextDelay(attempts: number, random: () => number = Math.random): number {
  const base = Math.min(MAX_DELAY_MS, 1000 * 2 ** attempts);
  return Math.round(base * (0.8 + 0.4 * random()));
}

export interface Rejection {
  mutationId: string;
  code: string;
  type: OutboxEntry['type'];
  judgeId: string;
  scoreSheetId: string | null;
  entryId: string | null;
  categoryId: string | null;
}

export interface PushDeps extends SyncDeps {
  auth?: DeviceAuth;
  random?: () => number;
}

export type PushOutcome =
  | { status: 'empty' }
  | { status: 'ok'; sent: number; rejections: Rejection[]; more: boolean; serverCursor: number }
  | { status: 'retry'; error: string }
  /** Trwały błąd całej paczki (4xx) – mutacje odrzucone z kodem, kolejka nie stoi (UX-01). */
  | { status: 'failed'; error: string; rejections: Rejection[] }
  | { status: 'revoked' };

type Result = PushResponse['results'][number];

function requeue(db: Db, batch: OutboxEntry[]): void {
  for (const e of batch) db.runSync("UPDATE outbox SET state = 'QUEUED' WHERE mutation_id = ?", e.mutationId);
}

function reject(db: Db, e: OutboxEntry, code: string): Rejection {
  outbox.markFailedPermanent(db, e.mutationId, code);
  if (e.scoreSheetId) {
    db.runSync(
      "UPDATE local_score_sheet SET sync_state = 'REJECTED', reject_code = ? WHERE id = ?",
      code,
      e.scoreSheetId,
    );
  }
  return rejection(e, code);
}

/** Ponowienie z backoffem (po 20 próbach popover pokazuje mutację w „Wymaga uwagi” – TC-OUTBOX-010). */
function retry(db: Db, e: OutboxEntry, now: number, error: string, random: () => number) {
  outbox.markRetry(db, e.mutationId, e.attempts + 1, now + nextDelay(e.attempts, random), error);
}

/** Arkusz przyjęty: `SYNCED`, chyba że czeka na niego kolejna mutacja (ponowne zatwierdzenie w trakcie). */
function applyAccepted(db: Db, sheetId: string, revision: number, total: number | undefined) {
  const waiting =
    db.getFirstSync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM outbox WHERE score_sheet_id = ? AND state IN ('QUEUED', 'IN_FLIGHT')",
      sheetId,
    )?.n ?? 0;
  db.runSync(
    `UPDATE local_score_sheet SET server_revision = MAX(server_revision, ?),
       server_total_hundredths = COALESCE(?, server_total_hundredths), reject_code = NULL,
       sync_state = CASE WHEN ? > 0 THEN sync_state ELSE 'SYNCED' END
     WHERE id = ?`,
    revision,
    total === undefined ? null : toHundredths(total),
    waiting,
    sheetId,
  );
  outbox.rebase(db, sheetId, revision);
}

function rejection(e: OutboxEntry, code: string): Rejection {
  const p = e.mutation.type === 'SUBMIT_SCORE_SHEET' ? e.mutation.payload : null;
  return {
    mutationId: e.mutationId,
    code,
    type: e.type,
    judgeId: e.judgeId,
    scoreSheetId: e.scoreSheetId,
    entryId: p?.entryId ?? null,
    categoryId: p?.categoryId ?? null,
  };
}

/**
 * Jedna paczka (IMP-354): do 100 mutacji FIFO → `POST /v1/sync/push` (15 s) → stan outboxu i arkuszy.
 * `401 UNAUTHENTICATED` → odświeżenie tokenu i ponowienie; `413` → paczka o połowę mniejsza;
 * sieć / 5xx / limit czasu → całość wraca do kolejki z backoffem; inne 4xx (poza 401/408/409/413/429) →
 * odrzucenie paczki z kodem błędu; `DEVICE_REVOKED` → kolejka bez zmian.
 */
export async function pushOnce(deps: PushDeps, limit = OUTBOX_BATCH): Promise<PushOutcome> {
  const random = deps.random ?? Math.random;
  const batch = await outbox.nextBatch(deps.local, limit, deps.clock.now());
  if (!batch.length) return { status: 'empty' };

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException('timeout', 'TimeoutError')),
    PUSH_TIMEOUT_MS,
  );
  let result: Awaited<ReturnType<SyncDeps['api']['POST']>>;
  try {
    result = await deps.api.POST('/v1/sync/push', {
      body: {
        deviceTime: new Date(deps.clock.now()).toISOString(),
        mutations: batch.map((e) => e.mutation),
      },
      signal: controller.signal,
    });
  } catch {
    const code = controller.signal.aborted ? 'TIMEOUT' : 'NETWORK';
    const now = deps.clock.now();
    await deps.local.tx((db) => batch.forEach((e) => retry(db, e, now, code, random)));
    return { status: 'retry', error: code };
  } finally {
    clearTimeout(timer);
  }

  const { response } = result;
  if (!response.ok) {
    const error = toApiError(response, result.error);
    if (error.code === 'DEVICE_REVOKED') {
      await deps.local.tx((db) => requeue(db, batch));
      return { status: 'revoked' };
    }
    if (response.status === 401 && deps.auth) {
      await deps.local.tx((db) => requeue(db, batch));
      await deps.auth.refresh();
      return pushOnce({ ...deps, auth: undefined }, limit);
    }
    if (response.status === 413 && batch.length > 1) {
      await deps.local.tx((db) => requeue(db, batch));
      return pushOnce(deps, Math.floor(batch.length / 2));
    }
    const now = deps.clock.now();
    if (response.status >= 400 && response.status < 500 && !RETRYABLE_4XX.has(response.status)) {
      const rejected = await deps.local.tx((db) => batch.map((e) => reject(db, e, error.code)));
      return { status: 'failed', error: error.code, rejections: rejected };
    }
    await deps.local.tx((db) => batch.forEach((e) => retry(db, e, now, error.code, random)));
    return { status: 'retry', error: error.code };
  }

  const body = result.data as PushResponse;
  const byId = new Map<string, Result>(body.results.map((r) => [r.mutationId, r]));
  const now = deps.clock.now();
  const nowIso = new Date(now).toISOString();
  const serverDate = response.headers.get('Date');
  const rejections = await deps.local.tx((db) => {
    const out: Rejection[] = [];
    let accepted = 0;
    for (const e of batch) {
      const r = byId.get(e.mutationId);
      if (!r || r.status === 'RETRY') {
        retry(db, e, now, r ? 'RETRY' : 'NO_RESULT', random);
      } else if (r.status === 'REJECTED') {
        out.push(reject(db, e, r.code));
      } else {
        accepted++;
        outbox.markDone(db, e.mutationId, now);
        const sheetId = r.scoreSheetId ?? e.scoreSheetId;
        if (sheetId && r.revision !== undefined) applyAccepted(db, sheetId, r.revision, r.serverTotal);
      }
    }
    // „Ostatnia wysyłka” w popoverze = ostatnia przyjęta mutacja, nie ostatnia odpowiedź serwera (UX-15).
    const patch: Parameters<typeof writeMeta>[1] = accepted ? { lastPushAt: nowIso } : {};
    if (serverDate && !Number.isNaN(Date.parse(serverDate)))
      patch.serverTimeOffsetMs = Date.parse(serverDate) - now;
    writeMeta(db, patch);
    return out;
  });
  return {
    status: 'ok',
    sent: batch.length,
    rejections,
    more: batch.length === limit,
    serverCursor: body.cursor,
  };
}

/** Kursor serwera po wysyłce wyprzedza lokalny → po push potrzebny pull (kursora nie przesuwamy sami). */
export const needsPull = (deps: SyncDeps, serverCursor: number) =>
  serverCursor > readMeta(deps.local.read).cursor;
