import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Mutation, PushRequest, PushResponse } from '@polechamp/contracts';
import { eq, sql } from 'drizzle-orm';
import type { DeviceClaims, JudgeClaims } from '../../common/auth/auth.decorators.js';
import { canonical, sha256Hex } from '../../common/ids.js';
import { requestContext } from '../../common/request-context.js';
import { DB, type Db, type Tx } from '../../db/client.js';
import { one } from '../../db/one.js';
import { device, processedMutation, rejectedSubmission, tournament } from '../../db/schema.js';
import { withTx } from '../../db/tx.js';
import { AuditService, DomainEventService } from '../audit/audit.service.js';
import { deviceOf } from '../devices/devices.controller.js';
import {
  JudgeSessionEndedHandler,
  JudgeSessionStartedHandler,
  judgeOfTournament,
  PinAttemptsReportHandler,
} from './handlers/judge-session.handlers.js';
import { SubmitScoreSheetHandler } from './handlers/submit-score-sheet.js';
import type {
  HandlerResult,
  MutationHandler,
  MutationOf,
  PushContext,
  RejectionCode,
} from './handlers/types.js';

type MutationResult = PushResponse['results'][number];
type StoredResult = HandlerResult & { mutationId: string };

/** Kody odrzuceń ocen trafiające do `rejected_submission` (TL-13) – pozostałe sędzia rozwiązuje na tablecie. */
const NOT_RECORDED = new Set<RejectionCode>(['STALE_REVISION', 'SCHEMA_MISMATCH', 'IDEMPOTENCY_KEY_REUSED']);
type RecordedCode = Exclude<RejectionCode, 'STALE_REVISION' | 'SCHEMA_MISMATCH' | 'IDEMPOTENCY_KEY_REUSED'>;

/**
 * Błędy przejściowe → `RETRY` bez zapisu w `processed_mutation`: zakleszczenie, serializacja, czas blokady
 * lub zapytania, utrata połączenia, równoległe przetwarzanie tej samej mutacji (konflikt klucza).
 */
const TRANSIENT_CODES = new Set(['40P01', '40001', '55P03', '57014', '57P01', '23505']);
export function isTransient(error: unknown): boolean {
  const e = error as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = e?.cause?.code ?? e?.code ?? '';
  const message = `${e?.message ?? ''} ${e?.cause?.message ?? ''}`;
  return (
    TRANSIENT_CODES.has(code) || code.startsWith('08') || /ECONNRESET|Connection terminated/i.test(message)
  );
}

/** Paczka mutacji z tabletu (03-api §5.1; IMP-146, ADR-004): FIFO, transakcja per mutacja, dokładnie raz. */
@Injectable()
export class PushService {
  private readonly logger = new Logger('SyncPush');
  private readonly handlers: { [T in Mutation['type']]: MutationHandler<MutationOf<T>> };

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(DomainEventService) private readonly events: DomainEventService,
    @Inject(SubmitScoreSheetHandler) submit: SubmitScoreSheetHandler,
    @Inject(JudgeSessionStartedHandler) started: JudgeSessionStartedHandler,
    @Inject(JudgeSessionEndedHandler) ended: JudgeSessionEndedHandler,
    @Inject(PinAttemptsReportHandler) pinReport: PinAttemptsReportHandler,
  ) {
    this.handlers = {
      SUBMIT_SCORE_SHEET: submit,
      JUDGE_SESSION_STARTED: started,
      JUDGE_SESSION_ENDED: ended,
      PIN_ATTEMPTS_REPORT: pinReport,
    };
  }

  async push(claims: DeviceClaims | JudgeClaims, body: PushRequest): Promise<PushResponse> {
    const deviceId = deviceOf(claims);
    const ctx: PushContext = {
      deviceId,
      tournamentId: claims.trn,
      receivedAt: new Date(),
      deviceTime: new Date(body.deviceTime),
    };
    const results: MutationResult[] = [];
    // Po pierwszym RETRY kolejne też czekają: późniejsza mutacja może zależeć od wcześniejszej (np. sesja).
    let retryRest = false;
    for (const m of body.mutations) {
      const result: MutationResult = retryRest
        ? { mutationId: m.mutationId, status: 'RETRY' }
        : await this.processOne(ctx, m);
      if (result.status === 'RETRY') retryRest = true;
      if (result.status === 'REJECTED') {
        this.logger.log(
          { mutationId: m.mutationId, type: m.type, code: result.code, deviceId },
          'sync_rejected',
        );
      }
      results.push(result);
    }
    const [t] = await this.db
      .select({ changeSeq: tournament.changeSeq })
      .from(tournament)
      .where(eq(tournament.id, ctx.tournamentId));
    await this.db.update(device).set({ lastSyncAt: new Date() }).where(eq(device.id, deviceId));
    return { results, cursor: t?.changeSeq ?? 0 };
  }

  private async processOne(ctx: PushContext, m: Mutation): Promise<MutationResult> {
    const requestHash = sha256Hex(canonical(m));
    const previousActor = requestContext.actor();
    requestContext.setActor({
      type: 'JUDGE',
      id: m.judgeId,
      deviceId: ctx.deviceId,
      tournamentId: ctx.tournamentId,
    });
    try {
      return await withTx(this.db, async (tx) => {
        await tx.execute(sql`SET LOCAL lock_timeout = '2s'`);
        // Kolejność blokad turniej → kategoria/sędzia, jak w komendach organizatora (bez zakleszczeń).
        await tx
          .select({ id: tournament.id })
          .from(tournament)
          .where(eq(tournament.id, ctx.tournamentId))
          .for('no key update');
        const [done] = await tx
          .select()
          .from(processedMutation)
          .where(eq(processedMutation.mutationId, m.mutationId));
        if (done) return this.replay(done, ctx, m, requestHash);

        const result = await (this.handlers[m.type] as MutationHandler).handle(tx, ctx, m);
        if (result.status === 'REJECTED' && m.type === 'SUBMIT_SCORE_SHEET') {
          await this.recordRejection(tx, ctx, m, result.code);
        }
        const stored: StoredResult = { mutationId: m.mutationId, ...result };
        await tx.insert(processedMutation).values({
          mutationId: m.mutationId,
          deviceId: ctx.deviceId,
          requestHash,
          result: stored,
        });
        return stored;
      });
    } catch (error) {
      if (!isTransient(error)) {
        this.logger.error(
          { err: error, mutationId: m.mutationId, type: m.type },
          'Błąd przetwarzania mutacji',
        );
      }
      return { mutationId: m.mutationId, status: 'RETRY' };
    } finally {
      requestContext.setActor(previousActor);
    }
  }

  /** Mutacja już przetworzona: zapisany wynik (`APPLIED` → `DUPLICATE`), inna treść → alert (NFR-306). */
  private replay(
    done: typeof processedMutation.$inferSelect,
    ctx: PushContext,
    m: Mutation,
    requestHash: string,
  ): MutationResult {
    if (done.requestHash !== requestHash || done.deviceId !== ctx.deviceId) {
      this.logger.warn(
        { mutationId: m.mutationId, type: m.type, deviceId: ctx.deviceId },
        'IDEMPOTENCY_KEY_REUSED – ten sam mutationId z inną treścią',
      );
      return { mutationId: m.mutationId, status: 'REJECTED', code: 'IDEMPOTENCY_KEY_REUSED' };
    }
    const stored = done.result as StoredResult;
    return stored.status === 'APPLIED' ? { ...stored, status: 'DUPLICATE' } : stored;
  }

  /** Ocena nie znika bez decyzji organizatora (TL-13, ADR-010): pełna mutacja w `rejected_submission`. */
  private async recordRejection(
    tx: Tx,
    ctx: PushContext,
    m: MutationOf<'SUBMIT_SCORE_SHEET'>,
    code: RejectionCode,
  ): Promise<void> {
    await this.audit.record(tx, {
      action: 'SCORE_SHEET_REJECTED',
      tournamentId: ctx.tournamentId,
      entityType: 'score_sheet',
      entityId: m.payload.scoreSheetId,
      after: { code, mutationId: m.mutationId, categoryId: m.payload.categoryId, entryId: m.payload.entryId },
    });
    if (NOT_RECORDED.has(code)) return;
    const j = await judgeOfTournament(tx, m.judgeId, ctx.tournamentId);
    const row = one(
      await tx
        .insert(rejectedSubmission)
        .values({
          mutationId: m.mutationId,
          tournamentId: ctx.tournamentId,
          categoryId: m.payload.categoryId,
          entryId: m.payload.entryId,
          judgeId: j?.id ?? null,
          deviceId: ctx.deviceId,
          payload: m,
          reason: code as RecordedCode,
        })
        .returning({ id: rejectedSubmission.id }),
    );
    await this.events.emit(
      tx,
      'rejected.created',
      { rejectedId: row.id, categoryId: m.payload.categoryId, judgeId: m.judgeId },
      ctx.tournamentId,
    );
  }
}
