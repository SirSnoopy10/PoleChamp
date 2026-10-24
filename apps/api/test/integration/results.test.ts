import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DbHandle } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';
import { startApp } from '../support/app.js';
import { testDb } from '../support/db.js';
import { type Call, client, flushValkey, registerAndLogin } from '../support/http.js';
import { insertSheet, organizer } from '../support/scenario.js';

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
beforeEach(async () => {
  await flushValkey();
});

const ifMatch = (v: number) => ({ 'if-match': `W/"${v}"` });
const JUDGES = ['Katarzyna Nowak', 'Ewa Zielińska', 'Iwona Lis', 'Monika Sowa', 'Dorota Pawlak'];

describe('przeliczanie wyników (IMP-150)', () => {
  it('TC-API-110: dodanie szóstego sędziego → J = 6, wyniki niekompletne; dezaktywacja bez ocen → J = 5', async () => {
    const t = await org.tournament();
    const judges = [];
    for (const name of JUDGES) judges.push(await org.judge(t.id, name));
    const c = await org.category(t.id);
    const entries = [];
    for (let n = 41; n <= 49; n++) entries.push(await org.entry(c.id, n));
    await org.req('POST', `/v1/categories/${c.id}/start`);
    for (const e of entries.slice(0, 6)) {
      for (const j of judges) {
        await insertSheet(handle.db, {
          categoryId: c.id,
          entryId: e.id,
          judgeId: j.id,
          notes: [8, 8, 8, 8, 8],
        });
      }
    }
    const results = () =>
      handle.db.select().from(s.categoryResult).where(eq(s.categoryResult.categoryId, c.id));

    const sixth = await org.judge(t.id, 'Halina Kos');
    let details = (await org.req('GET', `/v1/categories/${c.id}`)).body;
    expect([details.judgeCount, details.progress.done, details.progress.expected]).toEqual([6, 30, 54]);
    const afterAdd = await results();
    expect(afterAdd).toHaveLength(9);
    expect(afterAdd.every((r) => !r.isComplete && r.expectedCount === 6)).toBe(true);

    await org.req('PATCH', `/v1/judges/${sixth.id}`, { isActive: false }, ifMatch(1));
    details = (await org.req('GET', `/v1/categories/${c.id}`)).body;
    expect([details.judgeCount, details.progress.done, details.progress.expected]).toEqual([5, 30, 45]);
    const afterDeactivate = await results();
    expect(afterDeactivate.filter((r) => r.isComplete)).toHaveLength(6);
    const [cat] = await handle.db.select().from(s.category).where(eq(s.category.id, c.id));
    const updates = await handle.db
      .select()
      .from(s.domainEvent)
      .where(eq(s.domainEvent.type, 'results.updated'));
    expect(
      updates.filter((e) => (e.payload as { categoryId: string }).categoryId === c.id).at(-1)!.payload,
    ).toEqual({
      categoryId: c.id,
      resultsVersion: cat!.resultsVersion,
    });
  });
});
