import { Inject, Injectable } from '@nestjs/common';
import { EntryCreate } from '@polechamp/contracts';
import { buildSeed, type SeedCategory, type SeedData, toLevel, toStyle } from '@polechamp/test-fixtures';
import { asc, eq } from 'drizzle-orm';
import { validationFailed } from '../../common/errors/domain-error.js';
import { requestContext } from '../../common/request-context.js';
import { uuidv7 } from '../../common/ids.js';
import { DB, type Db } from '../../db/client.js';
import { one } from '../../db/one.js';
import { appUser, criterion, judge, penaltyType, tournament } from '../../db/schema.js';
import { withTx } from '../../db/tx.js';
import { PasswordService } from '../auth/password.service.js';
import { CategoriesService } from '../organizer/categories.service.js';
import { CategoryLockService } from '../organizer/category-lock.service.js';
import { EntriesService } from '../organizer/entries.service.js';
import { JudgesService } from '../organizer/judges.service.js';
import { PinService } from '../organizer/pin.service.js';
import { TournamentsService } from '../organizer/tournaments.service.js';
import { ResultsService } from '../results/results.service.js';
import { SheetWriter } from '../sync/sheet-writer.js';

/** Daty turniejów seedu (prototyp ma tylko tekst „3–4 października 2026”). */
const DATES: Record<string, [string, string]> = {
  t1: ['2026-10-03', '2026-10-04'],
  t2: ['2027-04-18', '2027-04-18'],
  t3: ['2026-02-08', '2026-02-08'],
  t4: ['2025-11-22', '2025-11-22'],
};

/** Element seedu, który musi istnieć (spójność danych prototypu). */
function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Brak elementu seedu ${what}`);
  return value;
}

export const SEED_FIXTURES = [
  'FX-EMPTY',
  'FX-SEED',
  'FX-T1C3',
  'FX-TABLET',
  'FX-FINISHED',
  'FX-UNVERIFIED',
  'FX-DRAFT-CAT',
];

export const E2E_PASSWORD = 'Rura-Na-Scenie-E2E-2026';

export interface SeededFixture {
  email: string;
  password: string;
  userId: string;
  /** Identyfikatory seedu → UUID w bazie: t1, c3, jA, u17… */
  ids: Record<string, string>;
  pins: Record<string, string>;
}

/**
 * Fikstury E2E (IMP-454) budowane serwisami domenowymi – te same reguły, audyt i przeliczenia co API,
 * bez limitów HTTP. Każde wywołanie tworzy nowe konto (izolacja przebiegów bez czyszczenia bazy).
 */
@Injectable()
export class E2eSeedService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(PinService) private readonly pins: PinService,
    @Inject(TournamentsService) private readonly tournaments: TournamentsService,
    @Inject(CategoriesService) private readonly categories: CategoriesService,
    @Inject(EntriesService) private readonly entries: EntriesService,
    @Inject(JudgesService) private readonly judges: JudgesService,
    @Inject(CategoryLockService) private readonly locks: CategoryLockService,
    @Inject(ResultsService) private readonly results: ResultsService,
    @Inject(SheetWriter) private readonly sheets: SheetWriter,
  ) {}

  /** Zweryfikowane konto organizatora (FX-EMPTY). */
  async account(email = `e2e-${uuidv7()}@e2e.polechamp.test`, verified = true) {
    const user = one(
      await this.db
        .insert(appUser)
        .values({
          email,
          passwordHash: await this.passwords.hash(E2E_PASSWORD),
          displayName: 'Organizator E2E',
          emailVerifiedAt: verified ? new Date() : null,
          termsAcceptedAt: new Date(),
          termsVersion: '2026-11',
        })
        .returning(),
    );
    return { email, password: E2E_PASSWORD, userId: user.id };
  }

  async seed(fixture: string): Promise<SeededFixture> {
    if (!SEED_FIXTURES.includes(fixture))
      throw validationFailed([{ field: 'fixture', code: 'INVALID_FORMAT' }]);
    const acc = await this.account(undefined, fixture !== 'FX-UNVERIFIED');
    const out: SeededFixture = { ...acc, ids: {}, pins: {} };
    const data = buildSeed();
    const asOwner = <T>(fn: () => Promise<T>) =>
      requestContext.run({ requestId: uuidv7(), ip: null, actor: { type: 'ORGANIZER', id: acc.userId } }, fn);
    switch (fixture) {
      case 'FX-EMPTY':
        return out;
      case 'FX-SEED':
        for (const t of data.tournaments) await asOwner(() => this.tournament(data, t.id, out));
        return out;
      case 'FX-T1C3':
      case 'FX-TABLET':
        await asOwner(() => this.tournament(data, 't1', out));
        return out;
      case 'FX-FINISHED':
        await asOwner(() => this.tournament(data, 't3', out));
        return out;
      case 'FX-UNVERIFIED':
      case 'FX-DRAFT-CAT': {
        const t = await asOwner(() =>
          this.tournaments.create(acc.userId, {
            name: 'Turniej testowy',
            startDate: '2026-10-03',
            endDate: '2026-10-03',
          }),
        );
        const c = await asOwner(() =>
          this.categories.create(acc.userId, t.id, {
            name: 'Pole Sport Beginner',
            style: 'POLE_SPORT',
            level: 'BEGINNER',
            ageGroup: 'Open',
          }),
        );
        out.ids.t = t.id;
        out.ids.c = c.id;
        if (fixture === 'FX-UNVERIFIED') {
          await asOwner(() => this.judges.create(acc.userId, t.id, 'Katarzyna Nowak'));
          await asOwner(() =>
            this.entries.create(
              acc.userId,
              c.id,
              EntryCreate.parse({ startNumber: 1, fullName: 'Natalia Sikora' }),
            ),
          );
        }
        return out;
      }
      default:
        throw validationFailed([{ field: 'fixture', code: 'INVALID_FORMAT' }]);
    }
  }

  /** Turniej seedu: kategorie, zawodniczki, sędziowie z PIN-ami seedu, oceny, blokady i statusy. */
  private async tournament(data: SeedData, tid: string, out: SeededFixture) {
    const owner = out.userId;
    const src = need(
      data.tournaments.find((t) => t.id === tid),
      tid,
    );
    const [startDate, endDate] = need(DATES[tid], tid);
    const t = await this.tournaments.create(owner, { name: src.name, startDate, endDate, venue: src.place });
    out.ids[tid] = t.id;
    const cats = data.categories.filter((c) => c.tournamentId === tid);
    for (const c of cats) {
      const created = await this.categories.create(owner, t.id, {
        name: c.name,
        style: toStyle(c.style),
        level: toLevel(c.level),
        ageGroup: c.ageGroup,
      });
      out.ids[c.id] = created.id;
      for (const pid of c.participantIds) {
        const p = need(data.participants[pid], pid);
        const e = await this.entries.create(
          owner,
          created.id,
          EntryCreate.parse({ startNumber: p.number, fullName: p.name, club: p.club }),
        );
        out.ids[pid] = e.id;
      }
    }
    for (const j of data.judges) {
      const created = await this.judges.create(owner, t.id, j.name);
      out.ids[`${tid}:${j.id}`] = created.id;
      out.ids[j.id] ??= created.id;
      out.pins[j.id] = j.pin;
      const secrets = await this.pins.secrets(t.id, j.pin);
      await this.db
        .update(judge)
        .set({
          pinHash: secrets.pinHash,
          pinFingerprint: secrets.pinFingerprint,
          pinOfflineSalt: secrets.pinOfflineSalt,
          pinOfflineVerifier: secrets.pinOfflineVerifier,
        })
        .where(eq(judge.id, created.id));
    }
    if (src.status === 'przygotowanie') return;
    await this.tournaments.start(owner, t.id);
    for (const c of cats.filter((x) => x.status !== 'przygotowanie')) {
      const categoryId = need(out.ids[c.id], c.id);
      await this.categories.start(owner, categoryId);
      await this.writeSheets(data, c, t.id, categoryId, tid, out);
      if (c.status === 'zakończona') await this.locks.lock(owner, categoryId, { force: true });
    }
    if (src.status === 'zakończona') {
      const row = one(await this.db.select().from(tournament).where(eq(tournament.id, t.id)));
      await this.tournaments.finish(owner, t.id, row.version);
    }
  }

  private async writeSheets(
    data: SeedData,
    c: SeedCategory,
    tournamentId: string,
    categoryId: string,
    tid: string,
    out: SeededFixture,
  ) {
    const [crits, pens] = await Promise.all([
      this.db
        .select()
        .from(criterion)
        .where(eq(criterion.categoryId, categoryId))
        .orderBy(asc(criterion.position)),
      this.db
        .select()
        .from(penaltyType)
        .where(eq(penaltyType.categoryId, categoryId))
        .orderBy(asc(penaltyType.position)),
    ]);
    await withTx(this.db, async (tx) => {
      const config = await this.results.config(tx, categoryId);
      for (const pid of c.participantIds) {
        for (const j of data.judges) {
          const sheet = data.scores[c.id]?.[pid]?.[j.id];
          if (!sheet) continue;
          await this.sheets.write(tx, {
            tournamentId,
            categoryId,
            entryId: need(out.ids[pid], pid),
            judgeId: need(out.ids[`${tid}:${j.id}`], j.id),
            scoreSheetId: uuidv7(),
            existing: undefined,
            sheet: {
              criteria: Object.fromEntries(
                c.criteria.map((k, i) => [need(crits[i], k.id).id, Math.round((sheet.vals[k.id] ?? 0) * 10)]),
              ),
              penalties: Object.fromEntries(
                c.penalties.map((p, i) => [need(pens[i], p.id).id, sheet.pens[p.id] ?? 0]),
              ),
              comment: sheet.comment,
            },
            config,
            clientTotalHundredths: null,
            clientSubmittedAt: null,
            deviceId: null,
            judgeSessionId: null,
            authMode: 'ONLINE_PIN',
            mutationId: null,
            actorType: 'JUDGE',
          });
        }
      }
    });
  }
}
