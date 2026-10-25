import { GetObjectTaggingCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { eq } from 'drizzle-orm';
import { PDFParse } from 'pdf-parse';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Env } from '../../src/config/env.js';
import type { DbHandle } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';
import { ExportStorage } from '../../src/infra/storage.js';
import { PDF_COLORS } from '../../src/modules/exports/pdf/templates/results.js';
import { startWorker, type WorkerHandle } from '../../src/worker/bootstrap.js';
import { startApp } from '../support/app.js';
import { testDb } from '../support/db.js';
import { type Call, client, flushValkey, registerAndLogin } from '../support/http.js';
import { insertSheet, organizer } from '../support/scenario.js';

let app: NestFastifyApplication;
let env: Env;
let call: Call;
let handle: DbHandle;
let worker: WorkerHandle;
let storage: ExportStorage;
let org: ReturnType<typeof organizer>;
const silent = { info: () => undefined, error: () => undefined };

beforeAll(async () => {
  await flushValkey();
  ({ app, env } = await startApp());
  call = client(app);
  handle = testDb();
  storage = new ExportStorage(env);
  // Rejestracja przed startem workera – kod weryfikacji odczytywany z kolejki `email`.
  org = organizer(call, (await registerAndLogin(call)).accessToken);
  worker = await startWorker(env, silent, { schedules: false, metricsIntervalMs: 0 });
});
afterAll(async () => {
  await worker.close();
  await app.close();
  await handle.pool.end();
  storage.close();
});

const CRLF = String.fromCharCode(13, 10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitExport(exportId: string, timeoutMs = 10_000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const res = await org.req('GET', `/v1/exports/${exportId}`);
    if (res.body.status !== 'PENDING' || Date.now() > end) return res;
    await sleep(100);
  }
}

async function pdfText(url: string): Promise<{ text: string; info: Record<string, unknown>; raw: string }> {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  const raw = Buffer.from(bytes).toString('latin1');
  const parser = new PDFParse({ data: bytes });
  const { text } = await parser.getText();
  const { info } = await parser.getInfo();
  await parser.destroy();
  return { text, info: info as Record<string, unknown>, raw };
}

/** c3 „Pole Sport Advanced” z trzema sędziami: nr 41–43 komplet, nr 47 1/3, nr 48 bez ocen, nr 49 wycofana. */
async function scenario() {
  const t = await org.tournament({ name: 'Mistrzostwa Łodzi – „Żuraw” 2026' });
  const judges = [];
  for (const name of ['Katarzyna Nowak', 'Ewa Zielińska', 'Iwona Lis'])
    judges.push(await org.judge(t.id, name));
  const c = await org.category(t.id);
  const named: Record<number, string> = {
    41: 'Natalia Kamińska',
    42: 'Źrebięta Ąćęłńóśźż',
    43: 'Agnieszka Mazur',
    47: 'Zuzanna Król',
    48: 'Lena Mazur',
    49: 'Ewa Wycofana',
  };
  const entries: Record<number, string> = {};
  for (const [n, name] of Object.entries(named)) {
    entries[Number(n)] = (await org.entry(c.id, Number(n), name)).id;
  }
  await handle.db
    .update(s.athlete)
    .set({ club: 'Łódź Pole Studio' })
    .where(eq(s.athlete.fullName, 'Natalia Kamińska'));
  expect((await org.req('POST', `/v1/categories/${c.id}/start`)).status).toBe(200);
  for (const [n, notes] of [
    [41, [9, 9, 9, 9, 9]],
    [42, [8, 8, 8, 8, 8]],
    [43, [7, 7, 7, 7, 7]],
  ] as const) {
    for (const j of judges) {
      await insertSheet(handle.db, {
        categoryId: c.id,
        entryId: entries[n]!,
        judgeId: j.id,
        notes: [...notes],
      });
    }
  }
  await insertSheet(handle.db, {
    categoryId: c.id,
    entryId: entries[47]!,
    judgeId: judges[0]!.id,
    notes: [8, 8, 8, 8, 8],
  });
  const e49 = (await org.req('GET', `/v1/entries/${entries[49]}`)).body;
  await org.req('POST', `/v1/entries/${entries[49]}/withdraw`, undefined, {
    'if-match': `W/"${e49.version}"`,
  });
  await org.req('POST', `/v1/categories/${c.id}/recalculate`);
  return { t, c, entries };
}

describe('eksport PDF (IMP-171, IMP-172)', () => {
  let ctx: Awaited<ReturnType<typeof scenario>>;
  beforeAll(async () => {
    ctx = await scenario();
  });

  it('TC-API-100: zlecenie 202 → READY ≤ 3 s, link 15 min, obiekt w S3 z wygaśnięciem, wersje i skrót zapisane', async () => {
    const started = Date.now();
    const res = await org.req('POST', '/v1/exports', {
      scope: 'CATEGORY',
      tournamentId: ctx.t.id,
      categoryId: ctx.c.id,
    });
    expect(res.status).toBe(202);
    const done = await waitExport(res.body.exportId);
    expect(Date.now() - started).toBeLessThan(3_000);
    expect(done.body).toMatchObject({
      status: 'READY',
      resultsHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    const url = new URL(done.body.downloadUrl);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    expect(url.searchParams.get('response-content-disposition')).toContain('wyniki-mistrzostwa-lodzi');
    expect(new Date(done.body.expiresAt).getTime() - Date.now()).toBeGreaterThan(6.9 * 24 * 3600_000);

    const [job] = await handle.db.select().from(s.exportJob).where(eq(s.exportJob.id, res.body.exportId));
    expect(job).toMatchObject({ status: 'DONE', s3Key: `exports/${ctx.t.id}/${res.body.exportId}.pdf` });
    expect(job!.resultsVersions).toEqual({ [ctx.c.id]: expect.any(Number) });
    const head = await storage.client.send(
      new HeadObjectCommand({ Bucket: storage.bucket, Key: job!.s3Key! }),
    );
    expect(head.ContentType).toBe('application/pdf');
    const tags = await storage.client.send(
      new GetObjectTaggingCommand({ Bucket: storage.bucket, Key: job!.s3Key! }),
    );
    expect(tags.TagSet).toEqual([{ Key: 'expires', Value: '7d' }]);
    const [audit] = await handle.db
      .select()
      .from(s.auditLog)
      .where(eq(s.auditLog.entityId, res.body.exportId));
    expect(audit).toMatchObject({ action: 'EXPORT_REQUESTED', actorType: 'ORGANIZER' });

    // Te same wyniki – ten sam gotowy plik, bez ponownego renderu.
    const again = await org.req('POST', '/v1/exports', {
      scope: 'CATEGORY',
      tournamentId: ctx.t.id,
      categoryId: ctx.c.id,
    });
    expect(again.body.exportId).toBe(res.body.exportId);
  });

  it('TC-PDF-001, TC-PDF-003, TC-PDF-005, TC-PDF-008: treść, polskie znaki, wyniki wstępne, zgodność z podglądem', async () => {
    await org.req('POST', `/v1/categories/${ctx.c.id}/lock`, { force: true });
    const res = await org.req('POST', '/v1/exports', {
      scope: 'CATEGORY',
      tournamentId: ctx.t.id,
      categoryId: ctx.c.id,
    });
    const done = await waitExport(res.body.exportId);
    const { text, info, raw } = await pdfText(done.body.downloadUrl);
    // Osadzone podzbiory Inter Regular i Medium (bez fontów standardowych).
    expect(raw).toMatch(/\/FontName \/[A-Z]{6}\+Inter-Regular/);
    expect(raw).toMatch(/\/FontName \/[A-Z]{6}\+Inter-Medium/);
    expect(raw).not.toContain('/Helvetica');
    expect(text).toContain('Mistrzostwa Łodzi – „Żuraw” 2026');
    expect(text).toContain('3–4 października 2026 · Warszawa, Hala Torwar');
    expect(text).toContain('Pole Sport Advanced · Zakończona');
    expect(text).toContain('Źrebięta Ąćęłńóśźż');
    expect(text).toContain('Łódź Pole Studio');
    for (const h of ['Zawodniczka', 'Klub', 'Wynik', 'Sędziowie']) expect(text).toContain(h);

    const preview = (await org.req('GET', `/v1/categories/${ctx.c.id}/results`)).body;
    let last = -1;
    for (const row of preview.rows.filter((r: { entryStatus: string }) => r.entryStatus === 'ACTIVE')) {
      const at = text.indexOf(row.fullName);
      expect(at).toBeGreaterThan(last);
      last = at;
      if (row.official !== null) expect(text).toContain(row.display);
    }
    expect(text).toMatch(/wstępny/);
    expect(text).toContain('1/3 sędziów');
    expect(text).toContain('Wycofana');
    expect(text).toContain('brak ocen');

    // TC-PDF-004: stopka i metadane.
    expect(text).toMatch(
      /Wygenerowano \d{2}\.\d{2}\.\d{4}, \d{2}:\d{2} · Zakończona · Wersja wyników \d+ · suma kontrolna [0-9a-f]{12}/,
    );
    expect(text).toContain(`suma kontrolna ${done.body.resultsHash.slice(0, 12)}`);
    expect(text).toContain('Dokument zawiera dane osobowe');
    expect(info.Keywords).toBe(done.body.resultsHash);
    expect(String(info.Subject)).toContain(done.body.resultsHash);
  });

  it('TC-PDF-002: PDF turnieju – rozegrane kategorie i „Nie rozegrano: …”', async () => {
    await org.category(ctx.t.id, { name: 'Pole Art Masters' });
    await org.category(ctx.t.id, { name: 'Exotic Pro' });
    const current = (await org.req('GET', `/v1/tournaments/${ctx.t.id}`)).body;
    const fin = await org.req('POST', `/v1/tournaments/${ctx.t.id}/finish`, undefined, {
      'if-match': `W/"${current.version}"`,
    });
    expect(fin.status).toBe(200);
    const res = await org.req('POST', '/v1/exports', { scope: 'TOURNAMENT', tournamentId: ctx.t.id });
    const done = await waitExport(res.body.exportId);
    const { text } = await pdfText(done.body.downloadUrl);
    expect(text).toContain('Pole Sport Advanced · Zakończona');
    expect(text).toContain('Nie rozegrano: Pole Art Masters, Exotic Pro');
    expect(text).toContain('Zakończona · Wersja wyników');
  });

  it('TC-PDF-006: kolory wydruku – wyniki accent-700, kontrast ≥ 4,5:1 na białym', () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const v = parseInt(hex.slice(i, i + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const contrast = (hex: string) => 1.05 / (lum(hex) + 0.05);
    expect(PDF_COLORS.result).toBe('#5d5294');
    expect(contrast(PDF_COLORS.result)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(PDF_COLORS.muted)).toBeGreaterThanOrEqual(4.5);
  });

  it('TC-PDF-007: dane pseudonimizowane – „Zawodniczka nr 47”, bez klubu', async () => {
    const [e] = await handle.db.select().from(s.entry).where(eq(s.entry.id, ctx.entries[41]!));
    await handle.db
      .update(s.athlete)
      .set({ pseudonymizedAt: new Date() })
      .where(eq(s.athlete.id, e!.athleteId));
    const res = await org.req('POST', '/v1/exports', {
      scope: 'CATEGORY',
      tournamentId: ctx.t.id,
      categoryId: ctx.c.id,
    });
    const { text } = await pdfText((await waitExport(res.body.exportId)).body.downloadUrl);
    expect(text).toContain('Zawodniczka nr 41');
    expect(text).not.toContain('Kamińska');
    expect(text).not.toContain('Łódź Pole Studio');
  });

  it('TC-API-101: błąd renderowania → FAILED po 3 próbach z opisem błędu', async () => {
    const [job] = await handle.db
      .insert(s.exportJob)
      .values({ tournamentId: ctx.t.id, scope: 'CATEGORY', categoryId: null })
      .returning();
    const queue = worker.runtime.queue('pdf');
    await queue.add(
      'export',
      { exportId: job!.id },
      { jobId: job!.id, backoff: { type: 'fixed', delay: 10 } },
    );
    const done = await waitExport(job!.id);
    expect(done.body.status).toBe('FAILED');
    const [row] = await handle.db.select().from(s.exportJob).where(eq(s.exportJob.id, job!.id));
    expect(row).toMatchObject({ status: 'FAILED', error: expect.stringContaining('NOT_FOUND') });
    expect((await queue.getJob(job!.id))?.attemptsMade).toBe(3);
  });

  it('TC-API-109: CSV wyników – UTF-8 z BOM, „;”, przecinek dziesiętny, kolumny PL', async () => {
    const res = await org.req('POST', '/v1/exports', {
      scope: 'CATEGORY',
      tournamentId: ctx.t.id,
      categoryId: ctx.c.id,
      format: 'CSV',
    });
    expect(res.status).toBe(202);
    const done = await waitExport(res.body.exportId);
    expect(done.body.status).toBe('READY');
    expect(new URL(done.body.downloadUrl).searchParams.get('response-content-disposition')).toContain('.csv');
    const bytes = Buffer.from(await (await fetch(done.body.downloadUrl)).arrayBuffer());
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = bytes.toString('utf8').slice(1).trimEnd().split(CRLF);
    expect(lines[0]).toBe('Kategoria;Miejsce;Numer;Zawodniczka;Klub;Wynik;Liczba ocen;Status');
    expect(lines).toHaveLength(1 + 6);
    const preview = (await org.req('GET', `/v1/categories/${ctx.c.id}/results`)).body;
    const first = preview.rows[0];
    expect(lines[1]).toBe(
      `Pole Sport Advanced;1;${first.startNumber};${first.fullName};${first.club ?? ''};${first.display};3;`,
    );
    expect(first.display).toMatch(/^\d+,\d{1,2}$/);
    expect(lines.at(-1)).toBe('Pole Sport Advanced;;49;Ewa Wycofana;Aerial Dreams Warszawa;;0;Wycofana');
  });

  it('cudzy eksport → 404', async () => {
    const other = organizer(call, (await registerAndLogin(call)).accessToken);
    const res = await org.req('POST', '/v1/exports', { scope: 'TOURNAMENT', tournamentId: ctx.t.id });
    expect((await other.req('GET', `/v1/exports/${res.body.exportId}`)).status).toBe(404);
    expect(
      (await other.req('POST', '/v1/exports', { scope: 'TOURNAMENT', tournamentId: ctx.t.id })).status,
    ).toBe(404);
  });
});
