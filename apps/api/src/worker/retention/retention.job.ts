import { sql, TransactionRollbackError } from 'drizzle-orm';
import type { Db, Tx } from '../../db/client.js';
import type { ExportStorage } from '../../infra/storage.js';
import type { ChangeLogService } from '../../modules/audit/audit.service.js';
import type { WorkerLogger } from '../runtime.js';

/** Klucze danych osobowych usuwane z `audit_log.before/after` i `score_sheet_revision.snapshot` (TL-16). */
export const PII_KEYS = [
  'fullName',
  'full_name',
  'club',
  'comment',
  'birthYear',
  'birth_year',
  'initials',
  'displayName',
  'display_name',
  'email',
];

export interface RetentionOptions {
  /** Pseudonimizacja po N miesiącach od zakończenia turnieju (domyślnie 24). */
  pseudonymizeMonths: number;
  dryRun?: boolean;
}

export type RetentionReport = Record<string, number>;

const rows = (result: unknown): Record<string, unknown>[] =>
  (result as { rows: Record<string, unknown>[] }).rows;

/**
 * Zadanie retencji (IMP-176, FR-905, NFR-503) w roli `pc_retention`: każda reguła w osobnej
 * transakcji (pseudonimizacja – osobno na turniej), liczby rekordów w raporcie i w logach.
 * `now` jest parametrem, więc reguły testujemy przesuniętym zegarem bez zmiany czasu bazy.
 */
export class RetentionJob {
  constructor(
    private readonly db: Db,
    private readonly changeLog: ChangeLogService,
    private readonly storage: ExportStorage,
    private readonly logger: WorkerLogger,
    private readonly options: RetentionOptions,
  ) {}

  async run(now = new Date()): Promise<RetentionReport> {
    const report: RetentionReport = {};
    const at = now.toISOString();
    // `--dry-run` (IMP-178): reguła liczy rekordy i wycofuje transakcję.
    const step = async (name: string | null, fn: (tx: Tx) => Promise<number>) => {
      let counted = 0;
      try {
        await this.db.transaction(async (tx) => {
          counted = await fn(tx);
          if (this.options.dryRun) tx.rollback();
        });
      } catch (err) {
        if (!(err instanceof TransactionRollbackError)) throw err;
      }
      if (name) report[name] = counted;
    };

    // 0. Dziennik zmian 30 dni po turnieju – przed pseudonimizacją, by jej wpisy dla tabletów przetrwały do
    //    następnego przebiegu.
    await step('changeLogDeleted', async (tx) =>
      count(
        await tx.execute(sql`
          DELETE FROM change_log c USING tournament t
          WHERE t.id = c.tournament_id AND t.status = 'FINISHED'
            AND t.finished_at < ${at}::timestamptz - interval '30 days'`),
      ),
    );

    // 1. Pseudonimizacja turniejów zakończonych > N mies. temu (z czyszczeniem audytu i rewizji).
    const due = rows(
      await this.db.execute(sql`
        SELECT t.id FROM tournament t
        WHERE t.status = 'FINISHED'
          AND t.finished_at < ${at}::timestamptz - make_interval(months => ${this.options.pseudonymizeMonths})
          AND (EXISTS (SELECT FROM athlete a WHERE a.tournament_id = t.id AND a.pseudonymized_at IS NULL)
            OR EXISTS (SELECT FROM judge j WHERE j.tournament_id = t.id AND j.full_name NOT LIKE 'Sędzia %'))`),
    ).map((r) => r.id as string);
    let athletes = 0;
    let judges = 0;
    for (const tournamentId of due) {
      await step(null, async (tx) => {
        const counts = await this.pseudonymizeTournament(tx, tournamentId, at);
        athletes += counts.athletes;
        judges += counts.judges;
        return counts.athletes + counts.judges;
      });
    }
    report.pseudonymizedAthletes = athletes;
    report.pseudonymizedJudges = judges;

    // 2. IP w audycie starsze niż 90 dni.
    await step('auditIpCleared', async (tx) =>
      count(
        await tx.execute(sql`
          UPDATE audit_log SET ip = NULL
          WHERE ip IS NOT NULL AND occurred_at < ${at}::timestamptz - interval '90 days'`),
      ),
    );

    // 3. Partycje audytu starsze niż 36 miesięcy.
    await step('auditPartitionsDropped', async (tx) => {
      const [r] = rows(
        await tx.execute(
          sql`SELECT drop_old_audit_partitions((${at}::timestamptz - interval '36 months')::date) AS n`,
        ),
      );
      return Number(r?.n ?? 0);
    });

    // 4. Dane techniczne: przetworzone mutacje 30 dni po turnieju, klucze idempotencji 24 h.
    await step('processedMutationsDeleted', async (tx) =>
      count(
        await tx.execute(sql`
          DELETE FROM processed_mutation p
          WHERE p.created_at < ${at}::timestamptz - interval '30 days'
            AND NOT EXISTS (
              SELECT FROM device d JOIN tournament t ON t.id = d.tournament_id
              WHERE d.id = p.device_id
                AND (t.status <> 'FINISHED' OR t.finished_at >= ${at}::timestamptz - interval '30 days'))`),
      ),
    );
    await step('idempotencyKeysDeleted', async (tx) =>
      count(
        await tx.execute(
          sql`DELETE FROM idempotency_key WHERE created_at < ${at}::timestamptz - interval '24 hours'`,
        ),
      ),
    );
    await step('emailTokensDeleted', async (tx) =>
      count(
        await tx.execute(
          sql`DELETE FROM auth_email_token WHERE used_at IS NOT NULL OR expires_at < ${at}::timestamptz`,
        ),
      ),
    );

    // 5. Wygasłe eksporty: obiekt S3 (lifecycle usuwa go też sam) i rekord zlecenia.
    await step('exportsDeleted', async (tx) => {
      const expired = rows(
        await tx.execute(sql`
          DELETE FROM export_job
          WHERE expires_at < ${at}::timestamptz
             OR (expires_at IS NULL AND created_at < ${at}::timestamptz - interval '7 days')
          RETURNING s3_key`),
      );
      if (!this.options.dryRun) {
        for (const r of expired) if (r.s3_key) await this.storage.delete(r.s3_key as string);
      }
      return expired.length;
    });

    // 6. Twarde usunięcie kont 30 dni po `deleted_at` (bez turniejów w toku).
    const accounts = rows(
      await this.db.execute(sql`
        SELECT id FROM app_user WHERE deleted_at < ${at}::timestamptz - interval '30 days'`),
    ).map((r) => r.id as string);
    let purged = 0;
    for (const userId of accounts) {
      await step(null, async (tx) => {
        const tournaments = rows(
          await tx.execute(sql`SELECT id FROM tournament WHERE owner_id = ${userId}`),
        ).map((r) => r.id as string);
        const [r] = rows(await tx.execute(sql`SELECT purge_account(${userId}::uuid) AS n`));
        const removed = Number(r?.n ?? -1);
        if (removed < 0) return 0;
        for (const tournamentId of tournaments) await this.scrubAudit(tx, tournamentId);
        await tx.execute(
          sql`UPDATE audit_log SET ip = NULL WHERE actor_id = ${userId}::uuid AND ip IS NOT NULL`,
        );
        await tx.execute(sql`
          INSERT INTO audit_log (actor_type, action, entity_type, entity_id, after)
          VALUES ('SYSTEM', 'ACCOUNT_PURGED', 'app_user', ${userId}::uuid,
                  ${JSON.stringify({ tournamentsDeleted: removed })}::jsonb)`);
        purged += 1;
        return 1;
      });
    }
    report.accountsPurged = purged;

    this.logger.info({ retention: report, dryRun: this.options.dryRun ?? false }, 'retencja zakończona');
    return report;
  }

  /** Zawodniczki „Zawodniczka nr {nr}”, sędziowie „Sędzia {n}”, PII z audytu i rewizji, zmiany dla tabletów. */
  private async pseudonymizeTournament(tx: Tx, tournamentId: string, at: string) {
    const athletes = rows(
      await tx.execute(sql`
        UPDATE athlete a SET
          full_name = 'Zawodniczka nr ' || coalesce(
            (SELECT min(e.start_number) FROM entry e WHERE e.athlete_id = a.id)::text, '—'),
          club = NULL, birth_year = NULL, pseudonymized_at = ${at}::timestamptz
        WHERE a.tournament_id = ${tournamentId}::uuid AND a.pseudonymized_at IS NULL
        RETURNING a.id`),
    ).map((r) => r.id as string);
    const judges = rows(
      await tx.execute(sql`
        UPDATE judge SET full_name = 'Sędzia ' || position, initials = 'S' || least(position, 99)
        WHERE tournament_id = ${tournamentId}::uuid AND full_name NOT LIKE 'Sędzia %'
        RETURNING id`),
    ).map((r) => r.id as string);
    await this.scrubAudit(tx, tournamentId);
    for (const id of athletes)
      await this.changeLog.append(tx, { tournamentId, entityType: 'athlete', entityId: id });
    for (const id of judges)
      await this.changeLog.append(tx, { tournamentId, entityType: 'judge', entityId: id });
    return { athletes: athletes.length, judges: judges.length };
  }

  private async scrubAudit(tx: Tx, tournamentId: string): Promise<void> {
    const keys = sql`${`{${PII_KEYS.join(',')}}`}::text[]`;
    await tx.execute(sql`
      UPDATE audit_log SET before = before - ${keys}, after = after - ${keys}
      WHERE tournament_id = ${tournamentId}::uuid
        AND (before ?| ${keys} OR after ?| ${keys})`);
    await tx.execute(sql`
      UPDATE score_sheet_revision r SET snapshot = snapshot - ${keys}
      FROM score_sheet s JOIN category c ON c.id = s.category_id
      WHERE r.score_sheet_id = s.id AND c.tournament_id = ${tournamentId}::uuid AND r.snapshot ?| ${keys}`);
  }
}

function count(result: unknown): number {
  return (result as { rowCount?: number | null }).rowCount ?? 0;
}
