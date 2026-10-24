import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { and, eq, gt, max } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';
import { COMMAND_EVENTS, type CommandName } from '../../src/modules/realtime/events.map.js';
import { startApp } from '../support/app.js';
import { testDb } from '../support/db.js';
import { type Call, client, flushValkey, registerAndLogin } from '../support/http.js';
import { mutation, push } from '../support/push.js';
import { organizer } from '../support/scenario.js';
import { judgeLogin, pairTablet } from '../support/tablet.js';

let app: NestFastifyApplication;
let call: Call;
let handle: DbHandle;
let org: ReturnType<typeof organizer>;

beforeAll(async () => {
  ({ app } = await startApp());
  call = client(app);
  handle = testDb();
  await flushValkey();
  org = organizer(call, (await registerAndLogin(call)).accessToken);
});
afterAll(async () => {
  await app.close();
  await handle.pool.end();
});

const ifMatch = (v: number) => ({ 'if-match': `W/"${v}"` });
const lastEventId = async () =>
  (await handle.db.select({ id: max(s.domainEvent.id) }).from(s.domainEvent))[0]?.id ?? 0;
const eventsSince = async (tournamentId: string, id: number) =>
  new Set(
    (
      await handle.db
        .select({ type: s.domainEvent.type })
        .from(s.domainEvent)
        .where(and(eq(s.domainEvent.tournamentId, tournamentId), gt(s.domainEvent.id, id)))
    ).map((e) => e.type),
  );

/** IMP-156 krok 5: każda komenda z tabeli `COMMAND_EVENTS` zapisuje w outboxie co najmniej swoje zdarzenia. */
describe('mapowanie komend na zdarzenia (IMP-156)', () => {
  it('TC-RT-003…008: tabela komenda → zdarzenia domain_event', async () => {
    const executed = new Set<CommandName>();
    let tId = '';
    const check = async (name: CommandName, run: () => Promise<unknown>, tournamentId = tId) => {
      const before = await lastEventId();
      await run();
      const types = await eventsSince(tournamentId, before);
      expect([...types], name).toEqual(expect.arrayContaining([...COMMAND_EVENTS[name]]));
      executed.add(name);
    };
    const req = org.req;
    const t = await org.tournament();
    tId = t.id;
    const [jA, jB] = [await org.judge(t.id, 'Katarzyna Nowak'), await org.judge(t.id, 'Ewa Zielińska')];
    let tablet!: Awaited<ReturnType<typeof pairTablet>>;
    await check('device.pair', async () => (tablet = await pairTablet(call, org, t.id)));
    await check('tournament.patch', () =>
      req('PATCH', `/v1/tournaments/${t.id}`, { venue: 'Łódź' }, ifMatch(1)),
    );

    let c!: Awaited<ReturnType<typeof org.category>>;
    await check('category.create', async () => (c = await org.category(t.id)));
    await check('category.patch', async () => {
      const res = await req(
        'PATCH',
        `/v1/categories/${c.id}`,
        { name: 'Pole Sport Advanced A' },
        ifMatch(c.version),
      );
      c = { ...c, version: res.body.version };
    });
    let k = '';
    await check('criterion.create', async () => {
      k = (
        await req('POST', `/v1/categories/${c.id}/criteria`, { name: 'Muzykalność', scaleMax: 10, weight: 1 })
      ).body.id;
    });
    await check('criterion.patch', () => req('PATCH', `/v1/criteria/${k}`, { weight: 2 }));
    await check('criterion.delete', () => req('DELETE', `/v1/criteria/${k}`));
    let p = '';
    await check('penaltyType.create', async () => {
      p = (
        await req('POST', `/v1/categories/${c.id}/penalty-types`, {
          name: 'Czas',
          points: 0.5,
          maxOccurrences: 1,
        })
      ).body.id;
    });
    await check('penaltyType.patch', () => req('PATCH', `/v1/penalty-types/${p}`, { points: 1 }));
    await check('penaltyType.delete', () => req('DELETE', `/v1/penalty-types/${p}`));
    const [e1, e2] = [await org.entry(c.id, 1), await org.entry(c.id, 2)];
    await check('category.start', () => req('POST', `/v1/categories/${c.id}/start`));

    let e4!: Awaited<ReturnType<typeof org.entry>>;
    await check('entry.create', async () => (e4 = await org.entry(c.id, 4)));
    await check('entry.patch', () =>
      req('PATCH', `/v1/entries/${e4.id}`, { club: 'Studio Lotos' }, ifMatch(e4.version)),
    );
    await check('entry.withdraw', () => req('POST', `/v1/entries/${e4.id}/withdraw`));
    await check('entry.restore', () => req('POST', `/v1/entries/${e4.id}/restore`));
    await check('entry.delete', () => req('DELETE', `/v1/entries/${e4.id}`));

    let jC!: Awaited<ReturnType<typeof org.judge>>;
    await check('judge.create', async () => (jC = await org.judge(t.id, 'Iwona Lis')));
    await check('judge.patch', () =>
      req('PATCH', `/v1/judges/${jC.id}`, { fullName: 'Iwona Lisowska' }, ifMatch(1)),
    );
    await judgeLogin(call, tablet.token, jC.id, jC.pin);
    await check('judge.deactivate', () =>
      req('PATCH', `/v1/judges/${jC.id}`, { isActive: false }, ifMatch(2)),
    );
    await judgeLogin(call, tablet.token, jB.id, jB.pin);
    await check('judge.resetPin', () => req('POST', `/v1/judges/${jB.id}/pin/reset`));
    await check('judge.delete', () => req('DELETE', `/v1/judges/${jC.id}`));

    await check('device.rename', () => req('PATCH', `/v1/devices/${tablet.deviceId}`, { name: 'Tablet A' }));
    await flushValkey();
    await check('device.heartbeat', () =>
      call('POST', '/v1/devices/me/heartbeat', {
        token: tablet.token,
        body: { pendingMutations: 0, lastSyncCursor: null, batteryLevel: null, activeJudgeId: null },
      }),
    );
    await judgeLogin(call, tablet.token, jA.id, jA.pin);
    const tablet2 = await pairTablet(call, org, t.id, 'Tablet B');
    let session!: Awaited<ReturnType<typeof judgeLogin>>;
    await check(
      'judgeSession.replace',
      async () => (session = await judgeLogin(call, tablet2.token, jA.id, jA.pin)),
    );
    const sheet = (entryId: string) =>
      mutation.submit({
        judgeId: jA.id,
        judgeSessionId: session.sessionId,
        categoryId: c.id,
        entryId,
        criteria: c.criteria,
      });
    await check('push.submit', () => push(call, tablet2.token, [sheet(e1.id)]));
    await check('push.pinLocked', () => push(call, tablet2.token, [mutation.pinAttempts(jB.id, 10)]));
    await check('category.lock', () => req('POST', `/v1/categories/${c.id}/lock`, { force: true }));
    await check('push.rejected', () => push(call, tablet2.token, [sheet(e2.id)]));
    await check('category.unlock', () =>
      req('POST', `/v1/categories/${c.id}/unlock`, { reason: 'Odrzucona ocena' }),
    );
    await check('rejected.accept', async () => {
      const [item] = (await req('GET', `/v1/tournaments/${t.id}/rejected-submissions?resolution=PENDING`))
        .body.items;
      return req('POST', `/v1/rejected-submissions/${item.id}/accept`);
    });
    const draft = await org.category(t.id, { name: 'Exotic Open', style: 'EXOTIC' });
    await check('category.delete', () =>
      req('DELETE', `/v1/categories/${draft.id}`, undefined, ifMatch(draft.version)),
    );
    await check('tournament.finish', async () => {
      const current = await req('GET', `/v1/tournaments/${t.id}`);
      return req('POST', `/v1/tournaments/${t.id}/finish`, undefined, ifMatch(current.body.version));
    });
    await check('device.revoke', () => req('DELETE', `/v1/devices/${tablet.deviceId}`));

    const doomed = await org.tournament({ name: 'Turniej do usunięcia' });
    await pairTablet(call, org, doomed.id);
    await check(
      'tournament.delete',
      () => req('DELETE', `/v1/tournaments/${doomed.id}`, undefined, ifMatch(1)),
      doomed.id,
    );

    expect(Object.keys(COMMAND_EVENTS).filter((name) => !executed.has(name as CommandName))).toEqual([]);
  });
});
