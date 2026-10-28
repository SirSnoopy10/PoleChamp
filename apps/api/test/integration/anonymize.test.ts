import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { and, eq } from 'drizzle-orm';
import { PDFParse } from 'pdf-parse';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';
import { ExportDataService } from '../../src/modules/exports/export-data.service.js';
import { PdfRenderer } from '../../src/modules/exports/pdf/renderer.js';
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

/** Turniej zakończony: c3 zablokowana, starty 47 i 50 z ocenami dwóch sędziów. */
async function finished() {
  const t = await org.tournament();
  const judges = [await org.judge(t.id, 'Katarzyna Nowak'), await org.judge(t.id, 'Ewa Zielińska')];
  const c = await org.category(t.id);
  const e47 = await org.entry(c.id, 47, 'Natalia Kamińska');
  const e50 = await org.entry(c.id, 50, 'Zuzanna Król');
  const e52 = await org.entry(c.id, 52, 'Oliwia Wrona');
  await org.req(
    'PATCH',
    `/v1/entries/${e50.id}`,
    { club: 'PoleFit Kraków' },
    { 'if-match': `W/"${e50.version}"` },
  );
  expect((await org.req('POST', `/v1/categories/${c.id}/start`)).status).toBe(200);
  for (const [e, n] of [
    [e47, 8],
    [e50, 9],
  ] as const) {
    for (const j of judges) {
      await insertSheet(handle.db, {
        categoryId: c.id,
        entryId: e.id,
        judgeId: j.id,
        notes: [n, n, n, n, n],
      });
    }
  }
  expect((await org.req('POST', `/v1/categories/${c.id}/lock`, { force: true })).status).toBe(200);
  const current = (await org.req('GET', `/v1/tournaments/${t.id}`)).body;
  const fin = await org.req('POST', `/v1/tournaments/${t.id}/finish`, undefined, {
    'if-match': `W/"${current.version}"`,
  });
  expect(fin.status).toBe(200);
  return { t, c, e47, e50, e52 };
}

describe('„Usuń dane osobowe” (IMP-177)', () => {
  it('UX-40: turniej zakończony – zawodniczka bez ocen też może zostać zanonimizowana', async () => {
    const { e52 } = await finished();
    const res = await org.req('POST', `/v1/entries/${e52.id}/anonymize`);
    expect(res.status).toBe(200);
    const [athlete] = await handle.db
      .select()
      .from(s.athlete)
      .innerJoin(s.entry, eq(s.entry.athleteId, s.athlete.id))
      .where(eq(s.entry.id, e52.id));
    expect(athlete!.athlete.pseudonymizedAt).toBeInstanceOf(Date);
  });

  it('TC-API-054, TC-PDF-007: turniej zakończony – pseudonim, wynik i miejsce bez zmian, PDF, ponownie 409', async () => {
    const { t, c, e50 } = await finished();
    const before = (await org.req('GET', `/v1/categories/${c.id}/results`)).body;
    const hashBefore = (await handle.db.select().from(s.category).where(eq(s.category.id, c.id)))[0]!
      .finalResultsHash;
    const seqBefore = (await handle.db.select().from(s.tournament).where(eq(s.tournament.id, t.id)))[0]!
      .changeSeq;

    const res = await org.req('POST', `/v1/entries/${e50.id}/anonymize`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      startNumber: 50,
      athlete: { fullName: 'Zawodniczka nr 50', club: null },
    });

    const [a] = await handle.db
      .select({ athlete: s.athlete })
      .from(s.entry)
      .innerJoin(s.athlete, eq(s.athlete.id, s.entry.athleteId))
      .where(eq(s.entry.id, e50.id));
    expect(a!.athlete).toMatchObject({ fullName: 'Zawodniczka nr 50', club: null, birthYear: null });
    expect(a!.athlete.pseudonymizedAt).not.toBeNull();

    const after = (await org.req('GET', `/v1/categories/${c.id}/results`)).body;
    const row = (r: Record<string, any>) =>
      (r.rows as { entryId: string }[]).find((x) => x.entryId === e50.id);
    expect(row(after)).toMatchObject({ ...row(before), fullName: 'Zawodniczka nr 50', club: null });
    expect(
      (await handle.db.select().from(s.category).where(eq(s.category.id, c.id)))[0]!.finalResultsHash,
    ).toBe(hashBefore);

    // PII usunięte także z audytu wcześniejszych zmian tej zawodniczki.
    const audits = await handle.db.select().from(s.auditLog).where(eq(s.auditLog.tournamentId, t.id));
    expect(JSON.stringify(audits)).not.toMatch(/Zuzanna Król|PoleFit Kraków/);
    const [anon] = audits.filter((x) => x.action === 'ATHLETE_ANONYMIZED');
    expect(anon).toMatchObject({
      actorType: 'ORGANIZER',
      entityId: a!.athlete.id,
      after: { startNumber: 50 },
    });

    // Zmiana dla tabletów.
    const changes = await handle.db
      .select()
      .from(s.changeLog)
      .where(and(eq(s.changeLog.tournamentId, t.id), eq(s.changeLog.entityType, 'athlete')));
    expect(changes.some((x) => x.entityId === a!.athlete.id && x.seq > seqBefore)).toBe(true);

    const data = await app
      .get(ExportDataService)
      .load({ scope: 'CATEGORY', tournamentId: t.id, categoryId: c.id });
    const parser = new PDFParse({ data: new Uint8Array(await new PdfRenderer().render(data, 'CATEGORY')) });
    const { text } = await parser.getText();
    await parser.destroy();
    expect(text).toContain('Zawodniczka nr 50');
    expect(text).not.toContain('Zuzanna Król');
    expect(text).not.toContain('PoleFit Kraków');

    const again = await org.req('POST', `/v1/entries/${e50.id}/anonymize`);
    expect([again.status, again.body.code]).toEqual([409, 'INVALID_STATE_TRANSITION']);
  });

  it('TC-EDGE-054: ta sama zawodniczka w dwóch startach – każdy start z własnym numerem', async () => {
    const t = await org.tournament();
    const c1 = await org.category(t.id, { name: 'Pole Sport Advanced' });
    const c2 = await org.category(t.id, { name: 'Pole Art Masters' });
    const e1 = await org.entry(c1.id, 12, 'Maja Wójcik');
    const e2 = await org.entry(c2.id, 77, 'Maja Wójcik');
    const [first] = await handle.db.select().from(s.entry).where(eq(s.entry.id, e1.id));
    await handle.db.update(s.entry).set({ athleteId: first!.athleteId }).where(eq(s.entry.id, e2.id));

    expect((await org.req('POST', `/v1/entries/${e1.id}/anonymize`)).status).toBe(200);
    const names = async (categoryId: string) =>
      (await org.req('GET', `/v1/categories/${categoryId}/results`)).body.rows.map(
        (r: { fullName: string }) => r.fullName,
      );
    expect(await names(c1.id)).toEqual(['Zawodniczka nr 12']);
    expect(await names(c2.id)).toEqual(['Zawodniczka nr 77']);
    expect((await org.req('POST', `/v1/entries/${e2.id}/anonymize`)).status).toBe(409);
  });

  it('cudzy start → 404', async () => {
    const t = await org.tournament();
    const c = await org.category(t.id);
    const e = await org.entry(c.id, 5);
    const other = organizer(call, (await registerAndLogin(call)).accessToken);
    expect((await other.req('POST', `/v1/entries/${e.id}/anonymize`)).status).toBe(404);
  });
});
