import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { count, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';
import { startApp } from '../support/app.js';
import { testDb } from '../support/db.js';
import { type Call, client, flushValkey, registerAndLogin } from '../support/http.js';
import { organizer } from '../support/scenario.js';

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
const logCount = async (tournamentId: string) =>
  (
    await handle.db.select({ n: count() }).from(s.changeLog).where(eq(s.changeLog.tournamentId, tournamentId))
  )[0]?.n ?? 0;

/**
 * IMP-145 krok 5: każda komenda zmieniająca encje synchronizowane z tabletem (02-model §2.21) zapisuje
 * co najmniej jeden wpis `change_log`. Komendy ocen i odrzuceń dopisuje IMP-147…149.
 */
describe('kompletność dziennika zmian (IMP-145)', () => {
  it('komendy turniejów, kategorii, kryteriów, kar, startów i sędziów zapisują change_log', async () => {
    const created = await org.req('POST', '/v1/tournaments', {
      name: 'Puchar Polski Pole Art',
      startDate: '2026-11-07',
      endDate: '2026-11-08',
    });
    const tId = created.body.id as string;
    const ctx: Record<string, any> = {};
    const steps: [string, () => Promise<{ status: number; body: Record<string, any> }>][] = [
      ['PATCH tournament', () => org.req('PATCH', `/v1/tournaments/${tId}`, { venue: 'Łódź' }, ifMatch(1))],
      [
        'POST category',
        async () => {
          const res = await org.req('POST', `/v1/tournaments/${tId}/categories`, {
            name: 'Pole Art Intermediate',
            style: 'POLE_ART',
            level: 'INTERMEDIATE',
            ageGroup: 'Senior 18+',
          });
          ctx.category = res.body;
          return res;
        },
      ],
      [
        'PATCH category',
        async () => {
          const res = await org.req(
            'PATCH',
            `/v1/categories/${ctx.category.id}`,
            { name: 'Pole Art Intermediate – finał' },
            ifMatch(ctx.category.version),
          );
          ctx.category = res.body;
          return res;
        },
      ],
      [
        'POST criterion',
        async () => {
          const res = await org.req('POST', `/v1/categories/${ctx.category.id}/criteria`, {
            name: 'Muzykalność',
            scaleMax: 10,
            weight: 1,
          });
          ctx.criterion = res.body;
          return res;
        },
      ],
      ['PATCH criterion', () => org.req('PATCH', `/v1/criteria/${ctx.criterion.id}`, { weight: 2.5 })],
      ['DELETE criterion', () => org.req('DELETE', `/v1/criteria/${ctx.criterion.id}`)],
      [
        'POST penalty type',
        async () => {
          const res = await org.req('POST', `/v1/categories/${ctx.category.id}/penalty-types`, {
            name: 'Przekroczenie czasu',
            points: 0.5,
            maxOccurrences: 1,
          });
          ctx.penalty = res.body;
          return res;
        },
      ],
      ['PATCH penalty type', () => org.req('PATCH', `/v1/penalty-types/${ctx.penalty.id}`, { points: 1 })],
      ['DELETE penalty type', () => org.req('DELETE', `/v1/penalty-types/${ctx.penalty.id}`)],
      ['POST judge', () => org.req('POST', `/v1/tournaments/${tId}/judges`, { fullName: 'Joanna Wójcik' })],
      [
        'POST judge (drugi)',
        async () => {
          const res = await org.req('POST', `/v1/tournaments/${tId}/judges`, { fullName: 'Beata Kowal' });
          ctx.judge = res.body;
          return res;
        },
      ],
      [
        'PATCH judge',
        () => org.req('PATCH', `/v1/judges/${ctx.judge.id}`, { fullName: 'Beata Kowalska' }, ifMatch(1)),
      ],
      ['POST judge pin reset', () => org.req('POST', `/v1/judges/${ctx.judge.id}/pin/reset`)],
      ['DELETE judge', () => org.req('DELETE', `/v1/judges/${ctx.judge.id}`)],
      [
        'POST entry',
        async () => {
          const res = await org.req('POST', `/v1/categories/${ctx.category.id}/entries`, {
            startNumber: 7,
            fullName: 'Weronika Adamczyk',
          });
          ctx.entry = res.body;
          return res;
        },
      ],
      [
        'POST entry (drugi)',
        async () => {
          const res = await org.req('POST', `/v1/categories/${ctx.category.id}/entries`, {
            startNumber: 8,
            fullName: 'Julia Walczak',
          });
          ctx.entry2 = res.body;
          return res;
        },
      ],
      [
        'PATCH entry',
        () =>
          org.req(
            'PATCH',
            `/v1/entries/${ctx.entry.id}`,
            { club: 'Studio Lotos' },
            ifMatch(ctx.entry.version),
          ),
      ],
      ['POST entry withdraw', () => org.req('POST', `/v1/entries/${ctx.entry.id}/withdraw`)],
      ['POST entry restore', () => org.req('POST', `/v1/entries/${ctx.entry.id}/restore`)],
      ['DELETE entry', () => org.req('DELETE', `/v1/entries/${ctx.entry2.id}`)],
      ['POST tournament start', () => org.req('POST', `/v1/tournaments/${tId}/start`)],
      ['POST category start', () => org.req('POST', `/v1/categories/${ctx.category.id}/start`)],
      [
        'POST category lock',
        () => org.req('POST', `/v1/categories/${ctx.category.id}/lock`, { force: true }),
      ],
      [
        'POST category unlock',
        () => org.req('POST', `/v1/categories/${ctx.category.id}/unlock`, { reason: 'Protest trenerki' }),
      ],
      [
        'DELETE category',
        async () => {
          const c2 = await org.category(tId, { name: 'Exotic Open', style: 'EXOTIC' });
          return org.req('DELETE', `/v1/categories/${c2.id}`, undefined, ifMatch(c2.version));
        },
      ],
      [
        'POST tournament finish',
        async () => {
          const current = await org.req('GET', `/v1/tournaments/${tId}`);
          return org.req('POST', `/v1/tournaments/${tId}/finish`, undefined, ifMatch(current.body.version));
        },
      ],
    ];

    expect(await logCount(tId)).toBeGreaterThan(0); // POST tournament
    for (const [name, run] of steps) {
      const before = await logCount(tId);
      const res = await run();
      expect(res.status, `${name}: ${JSON.stringify(res.body)}`).toBeLessThan(300);
      expect(await logCount(tId), name).toBeGreaterThan(before);
    }

    const draft = await org.tournament({ name: 'Turniej do usunięcia' });
    const before = await logCount(draft.id);
    expect((await org.req('DELETE', `/v1/tournaments/${draft.id}`, undefined, ifMatch(1))).status).toBe(204);
    expect(await logCount(draft.id), 'DELETE tournament').toBeGreaterThan(before);
  });
});
