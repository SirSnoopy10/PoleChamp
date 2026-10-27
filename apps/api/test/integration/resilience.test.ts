import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { getContainerRuntimeClient } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { inject } from 'vitest';
import { startApp, testEnv } from '../support/app.js';
import { type Call, client, flushValkey, registerAndLogin } from '../support/http.js';
import { mutation, push, runningCategory } from '../support/push.js';
import { organizer } from '../support/scenario.js';

/**
 * Odporność (IMP-462) – lokalne odpowiedniki eksperymentów staging: awaria Valkey (TC-SYNC-019) przez pauzę
 * kontenera Testcontainers i zabicie instancji API w trakcie paczek (TC-REL-003) przez dwie instancje na tej
 * samej bazie. Failover RDS (TC-REL-004) i wdrożenie przy WS (TC-REL-005) – tylko staging (tools/chaos).
 */
let a: NestFastifyApplication;
let b: NestFastifyApplication;
let callA: Call;
let callB: Call;

beforeAll(async () => {
  await flushValkey();
  // Dwa zadania API z tą samą konfiguracją (klucze JWT, baza, Valkey) – jak za ALB.
  const env = await testEnv();
  ({ app: a } = await startApp({ env }));
  ({ app: b } = await startApp({ env }));
  callA = client(a);
  callB = client(b);
});
afterAll(async () => {
  await a.close().catch(() => undefined);
  await b.close();
});

async function valkey() {
  const runtime = await getContainerRuntimeClient();
  return runtime.container.getById(inject('valkeyContainerId'));
}

describe('odporność API (IMP-462)', () => {
  it('TC-SYNC-019: Valkey niedostępny – push i odczyty działają (limity fail-open), po powrocie bez zmian', async () => {
    const org = organizer(callB, (await registerAndLogin(callB)).accessToken);
    const fx = await runningCategory(callB, org);
    const container = await valkey();
    await container.pause();
    try {
      const m = mutation.submit({
        judgeId: fx.jA.id,
        judgeSessionId: fx.session.sessionId,
        categoryId: fx.c.id,
        entryId: fx.entries[0]!.id,
        criteria: fx.c.criteria,
        notes: [8, 8, 8, 8, 8],
      });
      const res = await push(callB, fx.tablet.token, [m]);
      expect(res.status).toBe(200);
      expect(res.body.results[0].status).toBe('APPLIED');
      expect((await org.req('GET', `/v1/categories/${fx.c.id}/results`)).status).toBe(200);
    } finally {
      await container.unpause();
    }
    const after = await org.req('GET', `/v1/entries/${fx.entries[0]!.id}/score-sheets`);
    expect(after.body.items).toHaveLength(1);
  });

  it('TC-REL-003: instancja zabita po przyjęciu paczki – ponowienie na drugiej daje DUPLICATE, bez duplikatów arkuszy', async () => {
    const org = organizer(callA, (await registerAndLogin(callA)).accessToken);
    const fx = await runningCategory(callA, org, { entries: [41, 42, 43, 44, 45] });
    const batch = fx.entries.map((e) =>
      mutation.submit({
        judgeId: fx.jA.id,
        judgeSessionId: fx.session.sessionId,
        categoryId: fx.c.id,
        entryId: e.id,
        criteria: fx.c.criteria,
        notes: [7, 7, 7, 7, 7],
      }),
    );
    // Zadanie A przyjmuje paczkę i „ginie” zanim klient dostanie odpowiedź – klient ponawia na B.
    await push(callA, fx.tablet.token, batch);
    await a.close();
    const retried = await push(callB, fx.tablet.token, batch);
    expect(retried.status).toBe(200);
    expect(retried.body.results.map((r: { status: string }) => r.status)).toEqual(Array(5).fill('DUPLICATE'));
    const orgB = organizer(callB, org.token);
    for (const e of fx.entries) {
      expect((await orgB.req('GET', `/v1/entries/${e.id}/score-sheets`)).body.items).toHaveLength(1);
    }
  });
});
