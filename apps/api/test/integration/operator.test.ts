import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { OperatorCommands, operatorId } from '../../src/cli/operator.js';
import type { DbHandle } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';
import { startApp, testEnv } from '../support/app.js';
import { testDb } from '../support/db.js';
import { type Call, client, flushValkey, registerAndLogin, uniqueEmail } from '../support/http.js';
import { organizer } from '../support/scenario.js';

let app: NestFastifyApplication;
let call: Call;
let handle: DbHandle;
let ops: OperatorCommands;
let org: ReturnType<typeof organizer>;
let orgEmail: string;
const OPERATOR = 'ops.adam';
const silent = { info: () => undefined, error: () => undefined };

beforeAll(async () => {
  const env = await testEnv({ RETENTION_DATABASE_URL: inject('retentionDatabaseUrl') });
  ({ app } = await startApp({ env }));
  call = client(app);
  handle = testDb();
  await flushValkey();
  orgEmail = uniqueEmail();
  org = organizer(call, (await registerAndLogin(call, orgEmail)).accessToken);
  ops = await OperatorCommands.create(env, silent);
});
afterAll(async () => {
  await ops.close();
  await app.close();
  await handle.pool.end();
});

const systemAudit = (action: string) =>
  handle.db
    .select()
    .from(s.auditLog)
    .where(and(eq(s.auditLog.action, action), eq(s.auditLog.actorId, operatorId(OPERATOR))));

describe('narzędzia operatora – CLI (IMP-178)', () => {
  it('TC-AUDIT-005: turniej do przeglądu i wyłączenie logowania offline – audyt SYSTEM z operatorem', async () => {
    const review = await ops.reviewTournament(OPERATOR, orgEmail);
    expect(review.pairingCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(review.judges).toHaveLength(2);
    expect(review.judges.every((j) => /^\d+$/.test(j.pin))).toBe(true);
    const [code] = await handle.db
      .select()
      .from(s.pairingCode)
      .where(eq(s.pairingCode.tournamentId, review.tournamentId));
    const days = (code!.expiresAt.getTime() - Date.now()) / (24 * 3600_000);
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);
    const entries = await handle.db
      .select()
      .from(s.entry)
      .where(eq(s.entry.tournamentId, review.tournamentId));
    expect(entries).toHaveLength(4);

    const created = await handle.db
      .select()
      .from(s.auditLog)
      .where(eq(s.auditLog.tournamentId, review.tournamentId));
    expect(created.length).toBeGreaterThan(5);
    expect(created.every((a) => a.actorType === 'SYSTEM' && a.actorId === operatorId(OPERATOR))).toBe(true);
    expect((await systemAudit('REVIEW_TOURNAMENT_CREATED'))[0]!.after).toMatchObject({ operator: OPERATOR });

    await ops.setOfflineLogin(OPERATOR, review.tournamentId, false);
    const [t] = await handle.db.select().from(s.tournament).where(eq(s.tournament.id, review.tournamentId));
    expect(t!.allowOfflinePinLogin).toBe(false);
    const [changed] = await systemAudit('TOURNAMENT_OFFLINE_LOGIN_CHANGED');
    expect(changed).toMatchObject({
      actorType: 'SYSTEM',
      before: { offlineLogin: true },
      after: { offlineLogin: false, operator: OPERATOR },
    });
  });

  it('TC-RODO-006: eksport danych zawodniczki z dwóch turniejów – JSON w S3, audyt, ≤ 60 s', async () => {
    const ids: string[] = [];
    for (const name of ['Puchar Wiosny 2026', 'Puchar Jesieni 2026']) {
      const t = await org.tournament({ name });
      const c = await org.category(t.id);
      const e = await org.entry(c.id, ids.length + 7, 'Łucja Świątek');
      const [row] = await handle.db.select().from(s.entry).where(eq(s.entry.id, e.id));
      ids.push(row!.athleteId);
    }
    const started = Date.now();
    const result = await ops.exportPerson(OPERATOR, { athleteId: ids[0] });
    expect(Date.now() - started).toBeLessThan(60_000);
    const data = result.data as { person: { fullName: string }; tournaments: { tournament: string }[] };
    expect(data.person.fullName).toBe('Łucja Świątek');
    expect(data.tournaments.map((t) => t.tournament).sort()).toEqual([
      'Puchar Jesieni 2026',
      'Puchar Wiosny 2026',
    ]);
    expect(new URL(result.url).searchParams.get('X-Amz-Expires')).toBe(String(24 * 3600));
    const json = await (await fetch(result.url)).json();
    expect(json.tournaments).toHaveLength(2);
    const [audit] = (await systemAudit('PERSON_EXPORTED')).filter((a) => a.entityId === ids[0]);
    expect(audit!.after).toMatchObject({ operator: OPERATOR, key: result.key });
  });

  it('odblokowanie konta i retencja na żądanie (--dry-run bez audytu)', async () => {
    const [user] = await handle.db.select().from(s.appUser).where(eq(s.appUser.email, orgEmail));
    await handle.db
      .update(s.appUser)
      .set({ failedLoginCount: 9, lockedUntil: new Date(Date.now() + 3600_000), lockoutLevel: 2 })
      .where(eq(s.appUser.id, user!.id));
    await ops.unlockAccount(OPERATOR, orgEmail);
    const [after] = await handle.db.select().from(s.appUser).where(eq(s.appUser.id, user!.id));
    expect(after).toMatchObject({ failedLoginCount: 0, lockedUntil: null, lockoutLevel: 0 });
    expect((await systemAudit('ACCOUNT_UNLOCKED')).some((a) => a.entityId === user!.id)).toBe(true);

    const before = (await systemAudit('RETENTION_RUN')).length;
    const report = await ops.runRetention(OPERATOR, true);
    expect(report).toHaveProperty('auditIpCleared');
    expect((await systemAudit('RETENTION_RUN')).length).toBe(before);
    await ops.runRetention(OPERATOR, false);
    expect((await systemAudit('RETENTION_RUN')).length).toBe(before + 1);
  });
});
