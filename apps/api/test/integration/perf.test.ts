import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '../../src/db/client.js';
import { startApp } from '../support/app.js';
import { testDb } from '../support/db.js';
import { type Call, client, flushValkey, registerAndLogin } from '../support/http.js';
import { mutation, push, runningCategory } from '../support/push.js';
import { insertSheet, organizer } from '../support/scenario.js';

/**
 * IMP-502 (TC-PERF-002 – część lokalna): czasy tras na danych rzędu kategorii FX-MAX (150 startów,
 * 5 sędziów, 600 arkuszy) i plany zapytań. Plany sprawdzane z `enable_seqscan = off`: skan
 * sekwencyjny dużej tabeli mimo zakazu = brak użytecznego indeksu. Pomiar docelowy – k6 na staging.
 */
const LARGE_TABLES = new Set([
  'tournament',
  'category',
  'entry',
  'athlete',
  'judge',
  'device',
  'score_sheet',
  'score_value',
  'score_penalty',
  'score_sheet_revision',
  'change_log',
  'domain_event',
  'audit_log',
  'rejected_submission',
  'processed_mutation',
  'category_result',
  'judge_session',
]);
const RUNS = 30;

let app: NestFastifyApplication;
let call: Call;
let handle: DbHandle;

beforeAll(async () => {
  ({ app } = await startApp());
  call = client(app);
  handle = testDb();
  await flushValkey();
});
afterAll(async () => {
  await app.close();
  await handle.pool.end();
});

const p95 = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * 0.95) - 1]!;

/** Zapytania SQL wysłane przez aplikację w trakcie `fn` (tekst + parametry). */
async function captureSql(fn: () => Promise<unknown>) {
  const seen = new Map<string, unknown[]>();
  const proto = pg.Client.prototype as unknown as { query: (...args: unknown[]) => unknown };
  const original = proto.query;
  proto.query = function (this: unknown, ...args: unknown[]) {
    const [q, v] = args;
    const text = typeof q === 'string' ? q : (q as { text?: string })?.text;
    const values = typeof q === 'string' ? v : (q as { values?: unknown[] })?.values;
    if (text && !seen.has(text)) seen.set(text, Array.isArray(values) ? values : []);
    return original.apply(this, args);
  } as typeof original;
  try {
    await fn();
  } finally {
    proto.query = original;
  }
  return seen;
}

interface PlanNode {
  'Node Type': string;
  'Relation Name'?: string;
  Plans?: PlanNode[];
}

const seqScans = (node: PlanNode): string[] => [
  ...(node['Node Type'] === 'Seq Scan' && node['Relation Name'] ? [node['Relation Name']] : []),
  ...(node.Plans ?? []).flatMap(seqScans),
];

/** Skany sekwencyjne dużych tabel w planach odczytów (`SELECT`/`WITH`) przy wyłączonym seq scan. */
async function missingIndexes(queries: Map<string, unknown[]>) {
  const found: string[] = [];
  const db = await handle.pool.connect();
  try {
    for (const text of queries.keys()) {
      if (!/^\s*(select|with)\b/i.test(text)) continue;
      await db.query('BEGIN');
      try {
        await db.query('SET LOCAL enable_seqscan = off');
        const res = await db.query<{ 'QUERY PLAN': { Plan: PlanNode }[] }>(
          `EXPLAIN (FORMAT JSON, GENERIC_PLAN) ${text}`,
        );
        const tables = seqScans(res.rows[0]!['QUERY PLAN'][0]!.Plan).filter((t) => LARGE_TABLES.has(t));
        for (const t of new Set(tables)) found.push(`${t}: ${text.replace(/\s+/g, ' ').slice(0, 160)}`);
      } finally {
        await db.query('ROLLBACK');
      }
    }
  } finally {
    db.release();
  }
  return found;
}

async function timed(fn: () => Promise<{ status: number }>, runs = RUNS) {
  const ms: number[] = [];
  await flushValkey();
  for (let i = 0; i < runs; i++) {
    const started = performance.now();
    const res = await fn();
    ms.push(performance.now() - started);
    expect(res.status).toBeLessThan(300);
  }
  return p95(ms);
}

describe('IMP-502: wydajność API', () => {
  it('TC-PERF-002: odczyty p95 ≤ 300 ms, zapis z przeliczeniem p95 ≤ 500 ms, zapytania z indeksami', async () => {
    const org = organizer(call, (await registerAndLogin(call)).accessToken);
    const judges = ['Katarzyna Nowak', 'Ewa Zielińska', 'Iwona Lis', 'Monika Sowa', 'Dorota Pawlak'];
    const {
      t,
      c,
      jA,
      judges: js,
      entries,
      tablet,
      session,
    } = await runningCategory(call, org, {
      judges,
      entries: [1, 2, 3],
    });
    // Limit `token` (120/min) – Valkey czyszczony co serię zapytań.
    for (let n = 4; n <= 150; n++) {
      if (n % 50 === 0) await flushValkey();
      entries.push(await org.entry(c.id, n));
    }
    await flushValkey();
    for (const j of js.slice(1)) {
      for (const e of entries) {
        await insertSheet(handle.db, {
          categoryId: c.id,
          entryId: e.id,
          judgeId: j.id,
          notes: [7, 7.5, 8, 6.5, 7],
        });
      }
    }
    // Druga kategoria (wersja robocza) – lista kategorii z licznikami.
    const c2 = await org.category(t.id, { name: 'Pole Art Amateur', style: 'POLE_ART', level: 'AMATEUR' });
    for (const n of [201, 202, 203]) await org.entry(c2.id, n);

    const reads: Record<string, () => Promise<{ status: number }>> = {
      'GET /tournaments': () => org.req('GET', '/v1/tournaments'),
      'GET /tournaments/{id}': () => org.req('GET', `/v1/tournaments/${t.id}`),
      'GET /tournaments/{id}/categories': () => org.req('GET', `/v1/tournaments/${t.id}/categories`),
      'GET /categories/{id}/entries': () => org.req('GET', `/v1/categories/${c.id}/entries`),
      'GET /categories/{id}/results': () => org.req('GET', `/v1/categories/${c.id}/results`),
      'GET /tournaments/{id}/results': () => org.req('GET', `/v1/tournaments/${t.id}/results`),
      'GET /tournaments/{id}/judges': () => org.req('GET', `/v1/tournaments/${t.id}/judges`),
      'GET /entries/{id}/score-sheets': () => org.req('GET', `/v1/entries/${entries[10]!.id}/score-sheets`),
      'GET /sync/changes': () => call('GET', '/v1/sync/changes?since=0', { token: tablet.token }),
    };

    const report: Record<string, number> = {};
    const queries = await captureSql(async () => {
      for (const [name, fn] of Object.entries(reads)) report[name] = await timed(fn);
      // Zapisy: ocena jA dla kolejnych startów – każdy push przelicza ranking kategorii.
      const writes: number[] = [];
      await flushValkey();
      for (const e of entries.slice(0, RUNS)) {
        const started = performance.now();
        const res = await push(call, tablet.token, [
          mutation.submit({
            judgeId: jA.id,
            judgeSessionId: session.sessionId,
            categoryId: c.id,
            entryId: e.id,
            criteria: c.criteria,
            notes: [8, 8, 8, 8, 8],
          }),
        ]);
        writes.push(performance.now() - started);
        expect(res.body.results[0].status).toBe('APPLIED');
      }
      report['POST /sync/push (przeliczenie)'] = p95(writes);
    });

    console.info(
      `TC-PERF-002 p95 (ms):\n${Object.entries(report)
        .map(([k, v]) => `  ${k}: ${v.toFixed(1)}`)
        .join('\n')}`,
    );
    for (const [name, ms] of Object.entries(report)) {
      expect(ms, name).toBeLessThanOrEqual(name.startsWith('POST') ? 500 : 300);
    }

    const missing = await missingIndexes(queries);
    console.info(`Zapytania: ${queries.size}, bez indeksu: ${missing.length}\n${missing.join('\n')}`);
    expect(missing).toEqual([]);
    // Kontrola detektora: filtr po kolumnie bez indeksu musi zostać wykryty.
    expect(await missingIndexes(new Map([['SELECT id FROM athlete WHERE club = $1', []]]))).toHaveLength(1);
  });
});
