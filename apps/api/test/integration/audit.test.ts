import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startApp } from '../support/app.js';
import { type Call, client, flushValkey, registerAndLogin } from '../support/http.js';
import { organizer } from '../support/scenario.js';

let app: NestFastifyApplication;
let call: Call;
let org: ReturnType<typeof organizer>;

beforeAll(async () => {
  ({ app } = await startApp());
  call = client(app);
  await flushValkey();
  org = organizer(call, (await registerAndLogin(call)).accessToken);
});
afterAll(async () => {
  await app.close();
});
beforeEach(async () => {
  await flushValkey();
});

interface Entry {
  id: string;
  at: string;
  action: string;
  entityType: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

describe('dziennik audytu (IMP-175)', () => {
  it('TC-API-102: stronicowanie kursorem (3 strony), stabilne przy nowych wpisach, filtr entityType', async () => {
    const t = await org.tournament();
    const c = await org.category(t.id);
    for (let n = 1; n <= 5; n++) await org.entry(c.id, n);
    const url = `/v1/tournaments/${t.id}/audit-log`;

    const all = (await org.req('GET', `${url}?limit=100`)).body.items as Entry[];
    expect(all.length).toBeGreaterThanOrEqual(7);
    const times = all.map((e) => Date.parse(e.at));
    expect([...times].sort((a, b) => b - a)).toEqual(times);

    const pageSize = Math.ceil(all.length / 3);
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const query: string = cursor ? `&cursor=${cursor}` : '';
      const res = await org.req('GET', `${url}?limit=${pageSize}${query}`);
      expect(res.status).toBe(200);
      seen.push(...(res.body.items as Entry[]).map((e) => e.id));
      cursor = res.body.nextCursor;
      pages += 1;
      // Nowy wpis w trakcie przeglądania nie przesuwa kolejnych stron.
      if (pages === 1) await org.entry(c.id, 99);
    } while (cursor);
    expect(pages).toBe(3);
    expect(seen).toEqual(all.map((e) => e.id));

    const categories = (await org.req('GET', `${url}?entityType=category`)).body.items as Entry[];
    expect(categories.length).toBeGreaterThan(0);
    expect(categories.every((e) => e.entityType === 'category')).toBe(true);
    const created = categories.find((e) => e.after);
    expect(created?.action).toEqual(expect.any(String));
    for (const e of all) {
      expect(JSON.stringify(e)).not.toMatch(/pin|password|"ip"/i);
    }

    const bad = await org.req('GET', `${url}?cursor=nie-kursor`);
    expect(bad.status).toBe(422);
  });

  it('TC-API-103: brak tras modyfikacji audytu – PUT/PATCH/DELETE → 404', async () => {
    const t = await org.tournament();
    for (const method of ['PUT', 'PATCH', 'DELETE'] as const) {
      const res = await org.req(method, `/v1/tournaments/${t.id}/audit-log`, {});
      expect(res.status).toBe(404);
    }
  });

  it('TC-AUDIT-006: dziennik dostępny tylko dla właściciela turnieju', async () => {
    const t = await org.tournament();
    const other = organizer(call, (await registerAndLogin(call)).accessToken);
    expect((await other.req('GET', `/v1/tournaments/${t.id}/audit-log`)).status).toBe(404);
    expect((await call('GET', `/v1/tournaments/${t.id}/audit-log`)).status).toBe(401);
  });
});
