import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ChangesResponse, Snapshot } from '@polechamp/contracts';
import { and, eq, max } from 'drizzle-orm';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { groupBy } from '../../src/common/group-by.js';
import { deviceKey, unwrapVerifier } from '../../src/crypto/pin-wrap.js';
import type { DbHandle } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';
import { startApp } from '../support/app.js';
import { testDb } from '../support/db.js';
import { type Call, client, flushValkey, registerAndLogin } from '../support/http.js';
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
beforeEach(async () => {
  await flushValkey();
});

/** Migawka z `Accept-Encoding: gzip` – surowy rozmiar odpowiedzi i rozpakowany JSON. */
async function fetchSnapshot(token: string) {
  const started = performance.now();
  const res = await app.inject({
    method: 'GET',
    url: '/v1/sync/snapshot',
    headers: { authorization: `Bearer ${token}`, 'accept-encoding': 'gzip' },
  });
  const ms = performance.now() - started;
  const json = res.headers['content-encoding'] === 'gzip' ? gunzipSync(res.rawPayload).toString() : res.body;
  return { res, ms, json, body: JSON.parse(json) as Snapshot };
}

type Change = ChangesResponse['changes'][number];

const pull = async (token: string, since: number, limit?: number) =>
  call('GET', `/v1/sync/changes?since=${since}${limit ? `&limit=${limit}` : ''}`, { token });

/** Wszystkie strony zmian od kursora (do `hasMore = false`). */
async function pullAll(token: string, since: number) {
  const all: Change[] = [];
  let cursor = since;
  let pages = 0;
  for (;;) {
    const res = await pull(token, cursor);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const page = ChangesResponse.parse(res.body);
    all.push(...page.changes);
    cursor = page.cursor;
    pages++;
    if (!page.hasMore) return { changes: all, cursor, pages };
  }
}

const maxSeq = async (tournamentId: string) =>
  (
    await handle.db
      .select({ seq: max(s.changeLog.seq) })
      .from(s.changeLog)
      .where(eq(s.changeLog.tournamentId, tournamentId))
  )[0]?.seq ?? 0;

/** Wszystkie klucze obiektów w drzewie JSON (ścieżki bez indeksów tablic). */
function keyPaths(value: unknown, prefix = ''): Set<string> {
  const out = new Set<string>();
  if (Array.isArray(value)) {
    for (const item of value) for (const k of keyPaths(item, prefix)) out.add(k);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${k}` : k;
      out.add(path);
      for (const nested of keyPaths(v, path)) out.add(nested);
    }
  }
  return out;
}

/** Pola dozwolone w migawce (NFR-502): dane osobowe tylko imię i nazwisko oraz klub. */
const ALLOWED_KEYS = new Set(
  [
    'cursor serverTime tournament tournament.id tournament.name tournament.status',
    'tournament.allowOfflinePinLogin judges judges.id judges.fullName judges.initials judges.isActive',
    'judges.pinLocked judges.position judges.pinVersion judges.pinVerifier judges.pinVerifier.alg',
    'judges.pinVerifier.iterations judges.pinVerifier.salt judges.pinVerifier.wrapped categories',
    'categories.id categories.name categories.style categories.level categories.ageGroup',
    'categories.position categories.status categories.aggregationMethod categories.tieBreakCriterionId',
    'categories.panelJudgeIds categories.criteria categories.criteria.id categories.criteria.name',
    'categories.criteria.description categories.criteria.scaleMax categories.criteria.step',
    'categories.criteria.weight categories.criteria.position categories.penaltyTypes',
    'categories.penaltyTypes.id categories.penaltyTypes.name categories.penaltyTypes.points',
    'categories.penaltyTypes.maxOccurrences categories.penaltyTypes.position categories.entries',
    'categories.entries.id categories.entries.startNumber categories.entries.startOrder',
    'categories.entries.fullName categories.entries.club categories.entries.status',
  ]
    .join(' ')
    .split(' '),
);

describe('migawka urządzenia (IMP-144)', () => {
  it('TC-API-076 / TC-RODO-004: panel, kryteria, starty bez roku urodzenia, weryfikator PIN', async () => {
    const t = await org.tournament();
    const jA = await org.judge(t.id, 'Katarzyna Nowak');
    const jB = await org.judge(t.id, 'Ewa Zielińska');
    const c = await org.category(t.id);
    await org.req('POST', `/v1/categories/${c.id}/entries`, {
      startNumber: 41,
      fullName: 'Zuzanna Król',
      club: 'Aerial Dreams Warszawa',
      birthYear: 1998,
    });
    await org.req('POST', `/v1/categories/${c.id}/entries`, {
      startNumber: 42,
      fullName: 'Lena Mazur',
      birthYear: 2013,
      isMinor: true,
      guardianConsentConfirmed: true,
    });
    expect((await org.req('POST', `/v1/tournaments/${t.id}/start`)).status).toBe(200);
    expect((await org.req('POST', `/v1/categories/${c.id}/start`)).status).toBe(200);
    await handle.db.update(s.judge).set({ pinLockedAt: new Date() }).where(eq(s.judge.id, jB.id));
    const tablet = await pairTablet(call, org, t.id);

    const { res, json, body } = await fetchSnapshot(tablet.token);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-encoding']).toBe('gzip');
    expect(() => Snapshot.parse(body)).not.toThrow();
    expect(body.cursor).toBe(await maxSeq(t.id));
    expect(Math.abs(new Date(body.serverTime).getTime() - Date.now())).toBeLessThan(5_000);
    expect(body.tournament).toEqual({
      id: t.id,
      name: 'Mistrzostwa Polski Pole Sport 2026',
      status: 'IN_PROGRESS',
      allowOfflinePinLogin: true,
    });

    const [cat] = body.categories;
    expect(cat).toMatchObject({ id: c.id, status: 'IN_PROGRESS', style: 'POLE_SPORT', level: 'ADVANCED' });
    expect(cat!.panelJudgeIds).toEqual([jA.id, jB.id]);
    expect(cat!.criteria.map((k) => k.id)).toEqual(c.criteria.map((k) => k.id));
    expect(cat!.criteria[0]).toMatchObject({ step: 0.5, scaleMax: 10 });
    expect(cat!.penaltyTypes.map((p) => p.id)).toEqual(c.penaltyTypes.map((p) => p.id));
    expect(cat!.entries).toEqual([
      expect.objectContaining({ startNumber: 41, fullName: 'Zuzanna Król', club: 'Aerial Dreams Warszawa' }),
      expect.objectContaining({ startNumber: 42, fullName: 'Lena Mazur', status: 'ACTIVE' }),
    ]);

    // TL-04: odszyfrowanie kluczem HKDF(pinPepper) daje PBKDF2 PIN-u testowego.
    const [a, b] = body.judges;
    expect(a).toMatchObject({ id: jA.id, initials: 'KN', isActive: true, pinLocked: false, pinVersion: 1 });
    const verifier = unwrapVerifier(
      deviceKey(Buffer.from(tablet.pinPepper, 'base64')),
      a!.pinVerifier!.wrapped,
      jA.id,
      a!.pinVersion,
    );
    const salt = Buffer.from(a!.pinVerifier!.salt, 'base64');
    expect(a!.pinVerifier).toMatchObject({ alg: 'PBKDF2-SHA256', iterations: 600_000 });
    expect(verifier.equals(pbkdf2Sync(jA.pin, salt, 600_000, 32, 'sha256'))).toBe(true);
    expect(b).toMatchObject({ id: jB.id, pinLocked: true, pinVerifier: null });

    // TC-RODO-004: bez roku urodzenia, małoletności i sekretów; tylko pola z listy.
    expect([...keyPaths(body)].filter((k) => !ALLOWED_KEYS.has(k))).toEqual([]);
    for (const forbidden of ['birthYear', 'isMinor', '1998', '2013', 'pinHash', 'guardian']) {
      expect(json).not.toContain(forbidden);
    }
    const [d] = await handle.db.select().from(s.device).where(eq(s.device.id, tablet.deviceId));
    expect(d!.lastSyncCursor).toBe(body.cursor);
    expect(d!.lastSyncAt).not.toBeNull();
  });

  it('TC-AUTHZ-056: tablet i sędzia ✔, organizator 403, unieważnione urządzenie 401', async () => {
    const t = await org.tournament({ name: 'Puchar Śląska' });
    const j = await org.judge(t.id, 'Anna Wiśniewska');
    await handle.db
      .update(s.tournament)
      .set({ allowOfflinePinLogin: false })
      .where(eq(s.tournament.id, t.id));
    const tablet = await pairTablet(call, org, t.id);
    const session = await judgeLogin(call, tablet.token, j.id, j.pin);
    const asJudge = await call('GET', '/v1/sync/snapshot', { token: session.judgeToken });
    expect(asJudge.status).toBe(200);
    expect(asJudge.body.tournament).toMatchObject({ id: t.id, allowOfflinePinLogin: false });
    // Logowanie offline wyłączone → weryfikator nie jest wydawany.
    expect(asJudge.body.judges[0]).toMatchObject({ id: j.id, pinVerifier: null });
    expect((await org.req('GET', '/v1/sync/snapshot')).status).toBe(403);
    expect((await call('GET', '/v1/sync/snapshot')).status).toBe(401);
    await org.req('DELETE', `/v1/devices/${tablet.deviceId}`);
    const revoked = await call('GET', '/v1/sync/snapshot', { token: tablet.token });
    expect([revoked.status, revoked.body.code]).toEqual([401, 'DEVICE_REVOKED']);
  });

  it('TC-EDGE-050: migawka w trakcie dodawania zawodniczek – kursor spójny z danymi', async () => {
    const t = await org.tournament({ name: 'Grand Prix Krakowa' });
    await org.judge(t.id, 'Monika Lis');
    const c = await org.category(t.id);
    for (let n = 1; n <= 5; n++) await org.entry(c.id, n);
    const tablet = await pairTablet(call, org, t.id);

    const [{ body }] = await Promise.all([
      fetchSnapshot(tablet.token),
      ...Array.from({ length: 15 }, (_, i) => org.entry(c.id, 100 + i)),
    ]);
    const inSnapshot = new Set(body.categories[0]!.entries.map((e) => e.id));
    const logged = await handle.db
      .select({ entityId: s.changeLog.entityId, seq: s.changeLog.seq })
      .from(s.changeLog)
      .where(and(eq(s.changeLog.tournamentId, t.id), eq(s.changeLog.entityType, 'entry')));
    expect(logged).toHaveLength(20);
    // Każdy start w migawce ma zmianę ≤ kursora, każdy brakujący – zmianę > kursora (bez luk).
    for (const { entityId, seq } of logged)
      expect(seq <= body.cursor, entityId).toBe(inSnapshot.has(entityId));
    // Brakujące starty przychodzą przez sync/changes od kursora migawki.
    const pulled = await pullAll(tablet.token, body.cursor);
    const fromChanges = pulled.changes.filter((ch) => ch.entityType === 'entry').map((ch) => ch.entity.id);
    expect(new Set([...inSnapshot, ...fromChanges]).size).toBe(20);
    expect(pulled.cursor).toBe(await maxSeq(t.id));
  });

  it('TC-SYNC-036: migawka turnieju maksymalnego (FX-MAX) ≤ 1,5 MB JSON i ≤ 250 kB gzip', async () => {
    const t = await org.tournament({ name: 'Mistrzostwa Europy Pole Sport i Pole Art 2026 – Warszawa' });
    const tablet = await pairTablet(call, org, t.id);
    const db = handle.db;
    const judges = await db
      .insert(s.judge)
      .values(
        Array.from({ length: 30 }, (_, i) => ({
          tournamentId: t.id,
          fullName: `Sędzia Bartłomiejczyk-Wiśniewska ${String.fromCharCode(65 + (i % 26))}${i}`,
          initials: 'SBW',
          pinHash: 'x',
          pinFingerprint: randomBytes(32),
          pinOfflineSalt: randomBytes(16),
          pinOfflineVerifier: randomBytes(32),
          position: i + 1,
        })),
      )
      .returning({ id: s.judge.id });
    await db.insert(s.device).values(
      Array.from({ length: 19 }, (_, i) => ({
        tournamentId: t.id,
        name: `Tablet ${i + 2}`,
        platform: 'android' as const,
        secretHash: randomBytes(32),
        pepper: randomBytes(32),
      })),
    );
    const categories = await db
      .insert(s.category)
      .values(
        Array.from({ length: 60 }, (_, i) => ({
          tournamentId: t.id,
          name: `Pole Sport Seniorki Advanced – grupa ${i + 1}`,
          ageGroup: 'Senior 18+ (open)',
          position: i + 1,
          status: 'IN_PROGRESS' as const,
        })),
      )
      .returning({ id: s.category.id });
    for (const [i, cat] of categories.entries()) {
      const criteria = i === 0 ? 12 : 5;
      const penalties = i === 0 ? 10 : 3;
      await db.insert(s.criterion).values(
        Array.from({ length: criteria }, (_, k) => ({
          categoryId: cat.id,
          name: `Technika i siła ${k + 1}`,
          description: 'Siła, elastyczność, czystość elementów na rurze statycznej i obrotowej',
          weightTenths: 10,
          position: k + 1,
        })),
      );
      await db.insert(s.penaltyType).values(
        Array.from({ length: penalties }, (_, k) => ({
          categoryId: cat.id,
          name: `Upadek lub dotknięcie podłoża ${k + 1}`,
          pointsTenths: 20,
          position: k + 1,
        })),
      );
      await db.insert(s.categoryJudge).values(judges.map((j) => ({ categoryId: cat.id, judgeId: j.id })));
    }
    // 1 500 startów: 300 w pierwszej kategorii, reszta po równo (NFR-801).
    const perCategory = (i: number) =>
      i === 0 ? 300 : i <= 1200 % 59 ? Math.ceil(1200 / 59) : Math.floor(1200 / 59);
    let number = 1;
    for (const [i, cat] of categories.entries()) {
      const count = perCategory(i);
      const athletes = await db
        .insert(s.athlete)
        .values(
          Array.from({ length: count }, (_, k) => ({
            tournamentId: t.id,
            fullName: `Aleksandra Konstantynopolitańska-${number + k}`,
            club: 'Akademia Tańca na Rurze Aerial Dreams Warszawa',
            birthYear: 1995,
          })),
        )
        .returning({ id: s.athlete.id });
      await db.insert(s.entry).values(
        athletes.map((a, k) => ({
          tournamentId: t.id,
          categoryId: cat.id,
          athleteId: a.id,
          startNumber: number + k,
          startOrder: k + 1,
        })),
      );
      number += count;
    }
    expect(number - 1).toBe(1500);

    await fetchSnapshot(tablet.token); // rozgrzanie (JIT, pula połączeń)
    const { res, ms, json, body } = await fetchSnapshot(tablet.token);
    expect(res.statusCode).toBe(200);
    expect(body.categories).toHaveLength(60);
    expect(body.categories.reduce((n, c) => n + c.entries.length, 0)).toBe(1500);
    expect(body.categories[0]!.criteria).toHaveLength(12);
    expect(body.judges).toHaveLength(30);
    expect(Buffer.byteLength(json)).toBeLessThanOrEqual(1_500_000);
    expect(res.rawPayload.length).toBeLessThanOrEqual(250_000);
    expect(ms).toBeLessThan(2_000);
  });
});

describe('dziennik zmian i pobieranie zmian (IMP-145)', () => {
  it('TC-API-077: 1 200 zmian od kursora → 3 strony po 500, rosnące seq, kursor = maks. seq', async () => {
    const t = await org.tournament({ name: 'Mistrzostwa Mazowsza' });
    const tablet = await pairTablet(call, org, t.id);
    const since = (await fetchSnapshot(tablet.token)).body.cursor;
    const db = handle.db;
    const categories = await db
      .insert(s.category)
      .values([1, 2, 3, 4].map((n) => ({ tournamentId: t.id, name: `Kategoria ${n}`, position: n })))
      .returning({ id: s.category.id });
    const judges = await db
      .insert(s.judge)
      .values(
        Array.from({ length: 26 }, (_, i) => ({
          tournamentId: t.id,
          fullName: `Sędzia ${String.fromCharCode(65 + i)}`,
          initials: 'S',
          pinHash: 'x',
          pinFingerprint: randomBytes(32),
          pinOfflineSalt: randomBytes(16),
          pinOfflineVerifier: randomBytes(32),
          position: i + 1,
        })),
      )
      .returning({ id: s.judge.id });
    const entryIds: string[] = [];
    for (const [i, cat] of categories.entries()) {
      const n = i < 3 ? 300 : 270;
      const athletes = await db
        .insert(s.athlete)
        .values(
          Array.from({ length: n }, (_, k) => ({ tournamentId: t.id, fullName: `Zawodniczka ${i}-${k}` })),
        )
        .returning({ id: s.athlete.id });
      const rows = await db
        .insert(s.entry)
        .values(
          athletes.map((a, k) => ({
            tournamentId: t.id,
            categoryId: cat.id,
            athleteId: a.id,
            startNumber: i * 1000 + k + 1,
            startOrder: k + 1,
          })),
        )
        .returning({ id: s.entry.id });
      entryIds.push(...rows.map((r) => r.id));
    }
    const log = [
      ...categories.map((c) => ({ entityType: 'category', entityId: c.id })),
      ...judges.map((j) => ({ entityType: 'judge', entityId: j.id })),
      ...entryIds.map((id) => ({ entityType: 'entry', entityId: id })),
    ];
    expect(log).toHaveLength(1200);
    const inserted = await db
      .insert(s.changeLog)
      .values(log.map((l) => ({ ...l, tournamentId: t.id, op: 'U' as const })))
      .returning({ seq: s.changeLog.seq });
    const head = Math.max(...inserted.map((r) => r.seq));
    await db.update(s.tournament).set({ changeSeq: head }).where(eq(s.tournament.id, t.id));

    const pages: Change[][] = [];
    let cursor = since;
    for (;;) {
      const res = await pull(tablet.token, cursor, 500);
      expect(res.status).toBe(200);
      pages.push(res.body.changes);
      cursor = res.body.cursor;
      if (!res.body.hasMore) break;
      expect(cursor).toBe(res.body.changes.at(-1).seq);
    }
    expect(pages.map((p) => p.length)).toEqual([500, 500, 200]);
    const seqs = pages.flat().map((c) => c.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(1200);
    expect(cursor).toBe(head);
    const byType = groupBy(pages.flat(), (c) => c.entityType);
    expect(['category', 'judge', 'entry'].map((k) => byType.get(k)?.length)).toEqual([4, 26, 1170]);
    expect(byType.get('entry')![0]!.entity).toEqual({
      id: entryIds[0],
      categoryId: categories[0]!.id,
      startNumber: 1,
      startOrder: 1,
      status: 'ACTIVE',
      fullName: 'Zawodniczka 0-0',
      club: null,
    });
    expect(byType.get('judge')![0]!.entity).toMatchObject({
      id: judges[0]!.id,
      pinVersion: 1,
      pinLocked: false,
    });
    // Ostatnia strona bez nowych zmian: pusta, kursor bez zmian.
    expect((await pull(tablet.token, head)).body).toEqual({ changes: [], cursor: head, hasMore: false });
  });

  it('TC-API-079: kursor sprzed retencji (30 dni po turnieju) lub spoza zakresu → 410 CURSOR_EXPIRED', async () => {
    const t = await org.tournament({ name: 'Puchar Bałtyku' });
    await org.judge(t.id, 'Iwona Lis');
    const tablet = await pairTablet(call, org, t.id);
    const head = await maxSeq(t.id);
    const ahead = await pull(tablet.token, head + 1000);
    expect([ahead.status, ahead.body.code]).toEqual([410, 'CURSOR_EXPIRED']);
    await handle.db
      .update(s.tournament)
      .set({ status: 'FINISHED', finishedAt: new Date(Date.now() - 31 * 24 * 3600_000) })
      .where(eq(s.tournament.id, t.id));
    const expired = await pull(tablet.token, 1);
    expect([expired.status, expired.body.code]).toEqual([410, 'CURSOR_EXPIRED']);
    // Tablet z aktualnym kursorem nie musi pobierać migawki.
    expect((await pull(tablet.token, head)).status).toBe(200);
    const invalid = await pull(tablet.token, -1);
    expect([invalid.status, invalid.body.code]).toEqual([422, 'VALIDATION_FAILED']);
  });

  it('TC-SYNC-038 / TC-EDGE-061: nowy sędzia w panelu, reset PIN-u, usunięta kategoria', async () => {
    const t = await org.tournament({ name: 'Grand Prix Poznania' });
    const jA = await org.judge(t.id, 'Halina Kos');
    const c = await org.category(t.id);
    await org.entry(c.id, 1);
    const draft = await org.category(t.id, { name: 'Exotic Open', style: 'EXOTIC' });
    await org.req('POST', `/v1/categories/${c.id}/start`);
    const tablet = await pairTablet(call, org, t.id);
    const since = (await fetchSnapshot(tablet.token)).body.cursor;

    const jB = await org.judge(t.id, 'Dorota Pawlak');
    const reset = await org.req('POST', `/v1/judges/${jA.id}/pin/reset`);
    await org.req('DELETE', `/v1/categories/${draft.id}`, undefined, { 'if-match': `W/"${draft.version}"` });
    const { changes } = await pullAll(tablet.token, since);

    const cat = changes.find((ch) => ch.entityType === 'category' && ch.entity.id === c.id);
    expect(cat?.entity.panelJudgeIds).toEqual([jA.id, jB.id]);
    expect(changes).toContainEqual(
      expect.objectContaining({ entityType: 'category', op: 'D', entity: { id: draft.id } }),
    );
    const judgeA = changes.find((ch) => ch.entityType === 'judge' && ch.entity.id === jA.id)!
      .entity as Record<string, any>;
    expect(judgeA.pinVersion).toBe(2);
    const verifier = unwrapVerifier(
      deviceKey(Buffer.from(tablet.pinPepper, 'base64')),
      judgeA.pinVerifier.wrapped,
      jA.id,
      2,
    );
    const salt = Buffer.from(judgeA.pinVerifier.salt, 'base64');
    expect(verifier.equals(pbkdf2Sync(reset.body.pin, salt, 600_000, 32, 'sha256'))).toBe(true);
    expect(JSON.stringify(changes)).not.toMatch(/birthYear|isMinor|pinHash/);
  });

  it('TC-AUTHZ-057: tablet i sędzia ✔, organizator 403, bez tokenu 401', async () => {
    const t = await org.tournament({ name: 'Puchar Tatr' });
    const j = await org.judge(t.id, 'Ewelina Sowa');
    const tablet = await pairTablet(call, org, t.id);
    const session = await judgeLogin(call, tablet.token, j.id, j.pin);
    expect((await pull(session.judgeToken, 0)).status).toBe(200);
    expect((await org.req('GET', '/v1/sync/changes?since=0')).status).toBe(403);
    expect((await call('GET', '/v1/sync/changes?since=0')).status).toBe(401);
  });
});
