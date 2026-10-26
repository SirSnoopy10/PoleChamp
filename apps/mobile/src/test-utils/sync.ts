// Helpery testów synchronizacji tabletu (EP-09): baza na better-sqlite3 z migracjami aplikacji,
// atrapa API (fetch → handler), zegar testowy i dane migawki (prototyp + FX-MAX).
import type { Snapshot } from '@polechamp/contracts';
import { createApiClient } from '../data/api/client';
import { LocalDb } from '../data/local/LocalDb';
import type { SyncClock } from '../data/sync/clock';

export const TEST_API = 'http://api.test';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const problemResponse = (status: number, code: string) =>
  new Response(JSON.stringify({ status, code, title: code }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });

export type Handler = (req: Request) => Response | Promise<Response>;

/** Klient API z handlerem zamiast sieci; `calls` – zapis żądań (metoda, ścieżka z zapytaniem, treść). */
export function fakeApi(handler: Handler) {
  const calls: { method: string; path: string; body: unknown; auth: string | null }[] = [];
  const api = createApiClient({
    baseUrl: TEST_API,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = input instanceof Request ? input : new Request(input, init);
      const url = new URL(req.url);
      const text = req.method === 'GET' ? '' : await req.clone().text();
      calls.push({
        method: req.method,
        path: url.pathname + url.search,
        body: text ? (JSON.parse(text) as unknown) : null,
        auth: req.headers.get('Authorization'),
      });
      return handler(req);
    },
  });
  return { api, calls };
}

export function testClock(start = Date.parse('2026-10-26T10:00:00.000Z')): SyncClock & {
  advance(ms: number): void;
} {
  let t = start;
  let mono = 1_000;
  return {
    now: () => t,
    monotonicMs: () => mono,
    advance(ms: number) {
      t += ms;
      mono += ms;
    },
  };
}

export const openTestDb = () => LocalDb.open('test.db');

const verifier = {
  alg: 'PBKDF2-SHA256' as const,
  iterations: 600_000,
  salt: 'c2FsdA==',
  wrapped: 'd3JhcA==',
};

export const judge = (id: string, position: number, over: Partial<Snapshot['judges'][number]> = {}) => ({
  id,
  fullName: `Sędzia ${id}`,
  initials: id.toUpperCase(),
  isActive: true,
  pinLocked: false,
  position,
  pinVersion: 1,
  pinVerifier: verifier,
  ...over,
});

/** Migawka prototypu: c1 w toku (panel jA, jB; 2 kryteria, 1 kara, 3 starty), c2 w przygotowaniu. */
export function snapshotFixture(over: Partial<Snapshot> = {}): Snapshot {
  return {
    cursor: 10,
    serverTime: '2026-10-26T10:00:05.000Z',
    tournament: { id: 't1', name: 'Puchar Polski', status: 'IN_PROGRESS', allowOfflinePinLogin: true },
    judges: [judge('jA', 1), judge('jB', 2), judge('jC', 3)],
    categories: [
      {
        id: 'c1',
        name: 'Pole Sport Seniorki',
        style: 'POLE_SPORT',
        level: 'ADVANCED',
        ageGroup: 'SENIOR',
        position: 1,
        status: 'IN_PROGRESS',
        aggregationMethod: 'MEAN',
        tieBreakCriterionId: null,
        panelJudgeIds: ['jA', 'jB'],
        criteria: [
          { id: 'k1', name: 'Technika', scaleMax: 10, step: 0.5, weight: 1, position: 1 },
          { id: 'k2', name: 'Artyzm', scaleMax: 10, step: 0.5, weight: 1.5, position: 2 },
        ],
        penaltyTypes: [{ id: 'p1', name: 'Upadek', points: 0.5, maxOccurrences: 3, position: 1 }],
        entries: [1, 2, 3].map((n) => ({
          id: `e${n}`,
          startNumber: 40 + n,
          startOrder: n,
          fullName: `Zawodniczka ${n}`,
          club: null,
          status: 'ACTIVE' as const,
        })),
      },
      {
        id: 'c2',
        name: 'Pole Art Juniorki',
        style: 'POLE_ART',
        level: 'BEGINNER',
        ageGroup: 'JUNIOR',
        position: 2,
        status: 'DRAFT',
        aggregationMethod: 'MEAN',
        tieBreakCriterionId: null,
        panelJudgeIds: ['jC'],
        criteria: [{ id: 'k3', name: 'Choreografia', scaleMax: 10, step: 0.5, weight: 1, position: 1 }],
        penaltyTypes: [],
        entries: [],
      },
    ],
    ...over,
  };
}

/** FX-MAX (NFR-801): 60 kategorii, 1 500 startów (300 w pierwszej), 30 sędziów, 12 kryteriów i 10 kar. */
export function fxMaxSnapshot(): Snapshot {
  const judges = Array.from({ length: 30 }, (_, i) => judge(`j${i + 1}`, i + 1));
  const sizes = [300, ...Array.from({ length: 59 }, (_, i) => (i < 20 ? 21 : 20))];
  let n = 0;
  const categories = sizes.map((size, c) => ({
    id: `c${c + 1}`,
    name: `Kategoria ${c + 1}`,
    style: 'POLE_SPORT' as const,
    level: 'PRO' as const,
    ageGroup: 'SENIOR',
    position: c + 1,
    status: 'IN_PROGRESS' as const,
    aggregationMethod: 'MEAN' as const,
    tieBreakCriterionId: null,
    panelJudgeIds: judges.slice(0, 5).map((j) => j.id),
    criteria: Array.from({ length: 12 }, (_, k) => ({
      id: `c${c + 1}_k${k + 1}`,
      name: `Kryterium ${k + 1}`,
      description: 'Opis kryterium oceny',
      scaleMax: 10,
      step: 0.5 as const,
      weight: 1,
      position: k + 1,
    })),
    penaltyTypes: Array.from({ length: 10 }, (_, p) => ({
      id: `c${c + 1}_p${p + 1}`,
      name: `Kara ${p + 1}`,
      points: 0.5,
      maxOccurrences: 3,
      position: p + 1,
    })),
    entries: Array.from({ length: size }, (_, e) => {
      n += 1;
      return {
        id: `e${n}`,
        startNumber: n,
        startOrder: e + 1,
        fullName: `Zawodniczka Testowa ${n}`,
        club: 'Klub Sportowy',
        status: 'ACTIVE' as const,
      };
    }),
  }));
  return snapshotFixture({ judges, categories });
}
