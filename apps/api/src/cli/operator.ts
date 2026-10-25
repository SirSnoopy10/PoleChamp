import { createHash, randomUUID } from 'node:crypto';
import { type DynamicModule, Module, type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CategoryCreate, EntryCreate, TournamentCreate } from '@polechamp/contracts';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { CommonModule } from '../common/common.module.js';
import { sha256 } from '../common/ids.js';
import { requestContext } from '../common/request-context.js';
import type { Env } from '../config/env.js';
import { createDb, DB, type Db } from '../db/client.js';
import { one } from '../db/one.js';
import * as s from '../db/schema.js';
import { withTx } from '../db/tx.js';
import { InfraModule } from '../infra/infra.module.js';
import type { ExportStorage } from '../infra/storage.js';
import { AuditService, ChangeLogService } from '../modules/audit/audit.service.js';
import { generatePairingCode } from '../modules/devices/devices.service.js';
import { ExportsModule } from '../modules/exports/exports.module.js';
import { EXPORT_STORAGE } from '../modules/exports/exports.service.js';
import { OrganizerModule } from '../modules/organizer/organizer.module.js';
import { CategoriesService } from '../modules/organizer/categories.service.js';
import { EntriesService } from '../modules/organizer/entries.service.js';
import { JudgesService } from '../modules/organizer/judges.service.js';
import { TournamentsService } from '../modules/organizer/tournaments.service.js';
import { RetentionJob, type RetentionReport } from '../worker/retention/retention.job.js';
import type { WorkerLogger } from '../worker/runtime.js';

/** Kod parowania turnieju do przeglądu w sklepie (TL-40): do 30 dni. */
export const REVIEW_CODE_TTL_MS = 30 * 24 * 3600 * 1000;
/** Link do eksportu danych osoby (NFR-507): 24 h. */
export const PERSON_EXPORT_TTL_S = 24 * 3600;

const REVIEW_ATHLETES = ['Anna Testowa', 'Beata Przykładowa', 'Celina Recenzentka', 'Dorota Fikcyjna'];

/**
 * Stały UUID operatora z jego identyfikatora (np. login SSO) – `audit_log.actor_id` jest typu uuid,
 * a ten sam operator zawsze daje ten sam identyfikator (TC-AUDIT-005).
 */
export function operatorId(operator: string): string {
  const h = createHash('sha256').update(`operator:${operator}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

@Module({})
class OperatorModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: OperatorModule,
      imports: [InfraModule.forRoot(env), CommonModule, OrganizerModule, ExportsModule],
    };
  }
}

/**
 * Narzędzia operatora (IMP-178, TL-38, TL-40): rzadkie operacje bez panelu administracyjnego.
 * Każda operacja zapisuje audyt z `actor_type = SYSTEM` i identyfikatorem operatora.
 */
export class OperatorCommands {
  private constructor(
    readonly context: INestApplicationContext,
    private readonly env: Env,
    private readonly logger: WorkerLogger,
  ) {}

  static async create(env: Env, logger: WorkerLogger): Promise<OperatorCommands> {
    const context = await NestFactory.createApplicationContext(OperatorModule.forRoot(env), {
      logger: false,
    });
    return new OperatorCommands(context, env, logger);
  }

  private get db(): Db {
    return this.context.get<Db>(DB);
  }

  private as<T>(operator: string, fn: () => Promise<T>): Promise<T> {
    if (!operator) throw new Error('Wymagany --operator');
    return requestContext.run(
      { requestId: randomUUID(), ip: null, actor: { type: 'SYSTEM', id: operatorId(operator) } },
      fn,
    );
  }

  /** Turniej do przeglądu App Store / Google Play: fikcyjne dane, kod parowania ważny 30 dni. */
  reviewTournament(operator: string, ownerEmail: string) {
    return this.as(operator, async () => {
      const owner = one(await this.db.select().from(s.appUser).where(eq(s.appUser.email, ownerEmail)));
      const tournaments = this.context.get(TournamentsService);
      const t = await tournaments.create(
        owner.id,
        TournamentCreate.parse({
          name: 'Turniej do przeglądu PoleChamp',
          startDate: null,
          endDate: null,
          venue: 'Online',
        }),
      );
      const c = await this.context
        .get(CategoriesService)
        .create(
          owner.id,
          t.id,
          CategoryCreate.parse({ name: 'Pole Sport Demo', style: 'POLE_SPORT', level: 'BEGINNER' }),
        );
      const judges = [];
      for (const name of ['Sędzia Pierwsza', 'Sędzia Druga']) {
        const j = (await this.context.get(JudgesService).create(owner.id, t.id, name)) as {
          id: string;
          fullName: string;
          pin: string;
        };
        judges.push({ id: j.id, fullName: j.fullName, pin: j.pin });
      }
      for (const [i, fullName] of REVIEW_ATHLETES.entries()) {
        await this.context
          .get(EntriesService)
          .create(
            owner.id,
            c.id,
            EntryCreate.parse({ startNumber: i + 1, fullName, club: 'Klub Demonstracyjny' }),
          );
      }
      const code = generatePairingCode();
      const expiresAt = new Date(Date.now() + REVIEW_CODE_TTL_MS);
      await withTx(this.db, async (tx) => {
        await tx
          .insert(s.pairingCode)
          .values({ tournamentId: t.id, codeHash: sha256(code), expiresAt, maxUses: 50 });
        await this.context.get(AuditService).record(tx, {
          action: 'REVIEW_TOURNAMENT_CREATED',
          tournamentId: t.id,
          entityType: 'tournament',
          entityId: t.id,
          after: { operator, pairingCodeExpiresAt: expiresAt.toISOString() },
        });
      });
      return {
        tournamentId: t.id,
        pairingCode: `${code.slice(0, 4)}-${code.slice(4)}`,
        expiresAt: expiresAt.toISOString(),
        judges,
      };
    });
  }

  /** Wyłączenie logowania offline sędziów w turnieju (05-bez §3.3) – tablety dostają zmianę. */
  setOfflineLogin(operator: string, tournamentId: string, enabled: boolean) {
    return this.as(operator, () =>
      withTx(this.db, async (tx) => {
        const t = one(
          await tx.select().from(s.tournament).where(eq(s.tournament.id, tournamentId)).for('update'),
        );
        await tx
          .update(s.tournament)
          .set({ allowOfflinePinLogin: enabled, version: t.version + 1, updatedAt: new Date() })
          .where(eq(s.tournament.id, t.id));
        await this.context.get(AuditService).record(tx, {
          action: 'TOURNAMENT_OFFLINE_LOGIN_CHANGED',
          tournamentId: t.id,
          entityType: 'tournament',
          entityId: t.id,
          // Klucz bez „pin” – filtr sekretów audytu usuwa pola pasujące do /pin/i.
          before: { offlineLogin: t.allowOfflinePinLogin },
          after: { offlineLogin: enabled, operator },
        });
        await this.context
          .get(ChangeLogService)
          .append(tx, { tournamentId: t.id, entityType: 'tournament', entityId: t.id });
        return { tournamentId: t.id, allowOfflinePinLogin: enabled };
      }),
    );
  }

  /** Odblokowanie konta po blokadzie logowania. */
  unlockAccount(operator: string, email: string) {
    return this.as(operator, () =>
      withTx(this.db, async (tx) => {
        const user = one(await tx.select().from(s.appUser).where(eq(s.appUser.email, email)));
        await tx
          .update(s.appUser)
          .set({ failedLoginCount: 0, lockedUntil: null, lockoutLevel: 0, updatedAt: new Date() })
          .where(eq(s.appUser.id, user.id));
        await this.context.get(AuditService).record(tx, {
          action: 'ACCOUNT_UNLOCKED',
          entityType: 'app_user',
          entityId: user.id,
          after: { operator },
        });
        return { userId: user.id };
      }),
    );
  }

  /**
   * Eksport danych osoby (RODO art. 15/20, NFR-507): konto organizatora (`email`) z turniejami albo
   * zawodniczka (`athleteId`) z danymi wszystkich jej rekordów o tym samym imieniu u tego organizatora.
   * JSON w S3, link podpisany 24 h.
   */
  exportPerson(operator: string, who: { email?: string; athleteId?: string }) {
    return this.as(operator, async () => {
      const data = who.email
        ? await this.accountData(who.email)
        : await this.athleteData(who.athleteId ?? '');
      const key = `person-exports/${randomUUID()}.json`;
      const storage = this.context.get<ExportStorage>(EXPORT_STORAGE);
      await storage.put(key, Buffer.from(JSON.stringify(data, null, 2)), 'application/json');
      await withTx(this.db, (tx) =>
        this.context.get(AuditService).record(tx, {
          action: 'PERSON_EXPORTED',
          entityType: who.email ? 'app_user' : 'athlete',
          entityId: data.subjectId,
          after: { operator, key },
        }),
      );
      return { key, url: await storage.signedUrl(key, 'dane-osobowe.json', PERSON_EXPORT_TTL_S), data };
    });
  }

  private async accountData(email: string) {
    const user = one(await this.db.select().from(s.appUser).where(eq(s.appUser.email, email)));
    const tournaments = await this.db
      .select({
        id: s.tournament.id,
        name: s.tournament.name,
        startDate: s.tournament.startDate,
        status: s.tournament.status,
      })
      .from(s.tournament)
      .where(eq(s.tournament.ownerId, user.id));
    return {
      subjectId: user.id,
      account: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
        termsVersion: user.termsVersion,
        termsAcceptedAt: user.termsAcceptedAt,
      },
      tournaments,
    };
  }

  private async athleteData(athleteId: string) {
    const base = one(await this.db.select().from(s.athlete).where(eq(s.athlete.id, athleteId)));
    const owner = one(
      await this.db.select().from(s.tournament).where(eq(s.tournament.id, base.tournamentId)),
    );
    // Ta sama osoba w innych turniejach tego organizatora (dopasowanie po imieniu i nazwisku).
    const records = await this.db
      .select({ athlete: s.athlete, tournamentName: s.tournament.name })
      .from(s.athlete)
      .innerJoin(s.tournament, eq(s.tournament.id, s.athlete.tournamentId))
      .where(and(eq(s.tournament.ownerId, owner.ownerId), eq(s.athlete.fullName, base.fullName)));
    const ids = records.map((r) => r.athlete.id);
    const entries = await this.db
      .select({
        athleteId: s.entry.athleteId,
        entryId: s.entry.id,
        category: s.category.name,
        startNumber: s.entry.startNumber,
        status: s.entry.status,
        rank: s.categoryResult.rank,
        officialHundredths: s.categoryResult.officialHundredths,
      })
      .from(s.entry)
      .innerJoin(s.category, eq(s.category.id, s.entry.categoryId))
      .leftJoin(s.categoryResult, eq(s.categoryResult.entryId, s.entry.id))
      .where(inArray(s.entry.athleteId, ids))
      .orderBy(asc(s.entry.startNumber));
    const sheets = await this.db
      .select({
        entryId: s.scoreSheet.entryId,
        totalHundredths: s.scoreSheet.totalHundredths,
        submittedAt: s.scoreSheet.submittedAt,
      })
      .from(s.scoreSheet)
      .innerJoin(s.entry, eq(s.entry.id, s.scoreSheet.entryId))
      .where(inArray(s.entry.athleteId, ids));
    return {
      subjectId: base.id,
      person: { fullName: base.fullName, club: base.club, birthYear: base.birthYear },
      tournaments: records.map((r) => ({
        tournament: r.tournamentName,
        athleteId: r.athlete.id,
        entries: entries
          .filter((e) => e.athleteId === r.athlete.id)
          .map((e) => ({ ...e, scores: sheets.filter((sh) => sh.entryId === e.entryId) })),
      })),
    };
  }

  /** Retencja na żądanie (`--dry-run` – tylko liczby). */
  async runRetention(operator: string, dryRun: boolean): Promise<RetentionReport> {
    if (!operator) throw new Error('Wymagany --operator');
    const handle = createDb({
      url: this.env.RETENTION_DATABASE_URL ?? this.env.DATABASE_URL,
      ssl: this.env.DATABASE_SSL,
      max: 2,
    });
    try {
      const job = new RetentionJob(
        handle.db,
        this.context.get(ChangeLogService),
        this.context.get<ExportStorage>(EXPORT_STORAGE),
        this.logger,
        { pseudonymizeMonths: this.env.RETENTION_PSEUDONYMIZE_MONTHS, dryRun },
      );
      const report = await job.run();
      if (!dryRun) {
        await this.db.execute(sql`
          INSERT INTO audit_log (actor_type, actor_id, action, after)
          VALUES ('SYSTEM', ${operatorId(operator)}::uuid, 'RETENTION_RUN', ${JSON.stringify({ operator, report })}::jsonb)`);
      }
      return report;
    } finally {
      await handle.pool.end();
    }
  }

  close(): Promise<void> {
    return this.context.close();
  }
}
