import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { routes } from '@polechamp/contracts';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AUTH_CONTEXTS, type AuthContext, authWorld } from '../setup/tokens.js';
import { startApp } from '../support/app.js';
import { type Call, client, flushValkey } from '../support/http.js';
import { mutation, push } from '../support/push.js';
import { connect, listen } from '../support/realtime.js';
import { type Expect, MATRIX, type MatrixRow, type ResourceIds, resolvePath } from './matrix.js';

/**
 * IMP-453: test tabelaryczny macierzy uprawnień (TC-AUTHZ-001…062, TC-SEC-011) i kontrola kompletności
 * – endpoint z OpenAPI bez wiersza w macierzy przerywa CI.
 */
let app: NestFastifyApplication;
let call: Call;

type World = { tokens: Record<AuthContext, string | undefined>; ids: ResourceIds };

/** Świat uprawnień + arkusz, odrzucone zgłoszenie i eksport (zasoby dla wierszy wyników). */
async function buildWorld(): Promise<World> {
  const w = await authWorld(call);
  const { owner, ids } = w;
  const criteria = (await owner.req('GET', `/v1/categories/${ids.categoryId}`)).body.criteria as {
    id: string;
  }[];
  const submit = (categoryId: string, entryId: string) =>
    mutation.submit({
      judgeId: ids.judgeId,
      judgeSessionId: sessionId,
      categoryId,
      entryId,
      criteria,
      notes: criteria.map(() => 8),
    });
  const sessionId = ids.judgeSessionId;
  await push(call, w.tablet.token, [submit(ids.categoryId, ids.entryId)]);
  const sheets = await owner.req('GET', `/v1/entries/${ids.entryId}/score-sheets`);
  // Druga kategoria zablokowana → odrzucone zgłoszenie CATEGORY_LOCKED.
  const c2 = (
    await owner.req('POST', `/v1/tournaments/${ids.tournamentId}/categories`, {
      name: 'Pole Art Open',
      style: 'POLE_ART',
      level: 'INTERMEDIATE',
    })
  ).body as { id: string; criteria: { id: string }[] };
  const e2 = (
    await owner.req('POST', `/v1/categories/${c2.id}/entries`, { startNumber: 61, fullName: 'Zofia Wójcik' })
  ).body as { id: string };
  await owner.req('POST', `/v1/categories/${c2.id}/start`);
  await owner.req('POST', `/v1/categories/${c2.id}/lock`, { force: true });
  await push(call, w.tablet.token, [
    mutation.submit({
      judgeId: ids.judgeId,
      judgeSessionId: sessionId,
      categoryId: c2.id,
      entryId: e2.id,
      criteria: c2.criteria,
      notes: c2.criteria.map(() => 7),
    }),
  ]);
  const rejected = await owner.req('GET', `/v1/tournaments/${ids.tournamentId}/rejected-submissions`);
  const exp = await owner.req('POST', '/v1/exports', { scope: 'TOURNAMENT', tournamentId: ids.tournamentId });
  return {
    tokens: w.tokens,
    ids: {
      ...ids,
      scoreSheetId: sheets.body.items[0].id,
      rejectedId: rejected.body.items[0].id,
      exportId: exp.body.id ?? exp.body.exportId,
    },
  };
}

let shared: World;

beforeAll(async () => {
  await flushValkey();
  ({ app } = await startApp());
  call = client(app);
  shared = await buildWorld();
});
afterAll(async () => {
  await app.close();
});

function verdict(expected: Expect, status: number, code: unknown): boolean {
  if (expected === 'ok') return ![401, 403, 404].includes(status);
  if (expected === 404) return status === 404 && code === 'NOT_FOUND';
  return status === expected;
}

const cases = MATRIX.flatMap((row) => AUTH_CONTEXTS.map((ctx) => ({ row, ctx, expected: row.expect[ctx] })));

describe('macierz uprawnień (IMP-453)', () => {
  it.each(cases)('$row.tc: $row.method $row.path – $ctx → $expected', async ({ row, ctx, expected }) => {
    await flushValkey(); // limity żądań nie mogą zafałszować odpowiedzi
    const world = expected === 'ok' && row.destructive ? await buildWorld() : shared;
    const res = await call(row.method, resolvePath(row.path, world.ids), {
      token: world.tokens[ctx],
      body: row.body?.(world.ids),
      // Bez If-Match trasy z wersjonowaniem odpowiadają 428 przed sprawdzeniem właściciela.
      headers: { 'if-match': 'W/"1"' },
      ip: `10.90.${AUTH_CONTEXTS.indexOf(ctx)}.${(MATRIX.indexOf(row) % 250) + 1}`,
    });
    expect(verdict(expected, res.status, res.body?.code), `${res.status} ${JSON.stringify(res.body)}`).toBe(
      true,
    );
    if (ctx === 'orgOther' && expected === 404) {
      // TC-SEC-011: tylko pola Problem (bez danych zasobu) – `instance` to ścieżka żądania.
      expect(Object.keys(res.body).sort()).toEqual([
        'code',
        'instance',
        'requestId',
        'status',
        'title',
        'type',
      ]);
      expect(JSON.stringify(res.body)).not.toContain('Mistrzostwa');
    }
    if (expected === 401 && ctx === 'deviceRevoked') expect(res.body.code).toBe('DEVICE_REVOKED');
  });

  it('TC-AUTHZ-062: WS /rt subscribe – pokoje tylko dla właściciela, tabletu i sędziego turnieju', async () => {
    const base = await listen(app);
    const attempt = async (ctx: AuthContext) => {
      try {
        const rt = await connect(base, shared.tokens[ctx]);
        const ack = await rt.subscribe(shared.ids.tournamentId);
        rt.close();
        return ack.ok ? 'ok' : (ack.code ?? 'odmowa');
      } catch {
        return 'odmowa';
      }
    };
    const out: Record<string, string> = {};
    for (const ctx of AUTH_CONTEXTS) out[ctx] = await attempt(ctx);
    expect(out).toEqual({
      none: 'odmowa',
      orgOwner: 'ok',
      orgOther: 'FORBIDDEN',
      device: 'ok',
      deviceOther: expect.not.stringMatching(/^ok$/),
      deviceRevoked: 'odmowa',
      judge: 'ok',
      judgeOther: expect.not.stringMatching(/^ok$/),
    });
  });

  it('TC-AUTHZ: każdy endpoint OpenAPI ma wiersz macierzy i zgodne x-permissions', () => {
    const require = createRequire(import.meta.url);
    const doc = JSON.parse(readFileSync(require.resolve('@polechamp/contracts/openapi.json'), 'utf8')) as {
      paths: Record<string, Record<string, { 'x-permissions'?: string }>>;
    };
    const key = (r: Pick<MatrixRow, 'method' | 'path'>) => `${r.method} ${r.path.split('?')[0]}`;
    const fromDoc = new Map<string, string | undefined>();
    for (const [path, ops] of Object.entries(doc.paths))
      for (const [method, op] of Object.entries(ops))
        fromDoc.set(`${method.toUpperCase()} ${path}`, op['x-permissions']);
    const fromMatrix = new Map(MATRIX.map((r) => [key(r), r.permission]));
    expect(
      [...fromDoc.keys()].filter((k) => !fromMatrix.has(k)),
      'endpointy bez wiersza macierzy',
    ).toEqual([]);
    expect(
      [...fromMatrix.keys()].filter((k) => !fromDoc.has(k)),
      'wiersze bez endpointu',
    ).toEqual([]);
    const mismatched = [...fromMatrix].filter(([k, p]) => fromDoc.get(k) !== p);
    expect(mismatched).toEqual([]);
    expect(fromDoc.size).toBe(routes.length);
  });
});
