import { aggregate, type CategoryConfig, sheetTotal } from '@polechamp/scoring';
import { readFileSync } from 'node:fs';

/**
 * TC-UAT-016 (IMP-464/465): karty kontrolne (CSV `start,judge,k1…k5,p1,p2`) przeliczone silnikiem
 * `@polechamp/scoring` i porównane z wynikami API – brak utraconych, zduplikowanych i błędnych ocen.
 */
export const POLE_SPORT: CategoryConfig = {
  criteria: [
    { id: 'k1', scaleMax: 10, weightTenths: 20 },
    { id: 'k2', scaleMax: 10, weightTenths: 15 },
    { id: 'k3', scaleMax: 10, weightTenths: 10 },
    { id: 'k4', scaleMax: 10, weightTenths: 10 },
    { id: 'k5', scaleMax: 10, weightTenths: 10 },
  ],
  penaltyTypes: [
    { id: 'p1', pointsTenths: 20, maxOccurrences: 3 },
    { id: 'p2', pointsTenths: 10, maxOccurrences: 2 },
  ],
};

export interface CardRow {
  start: number;
  judge: string;
  totalHundredths: number;
}

export function parseCards(csv: string, config: CategoryConfig = POLE_SPORT): CardRow[] {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const cols = header!.split(',').map((c) => c.trim());
  return lines
    .filter((l) => l.trim())
    .map((line) => {
      const v = Object.fromEntries(line.split(',').map((x, i) => [cols[i], x.trim()]));
      const criteria = Object.fromEntries(
        config.criteria.map((k) => [k.id, Math.round(Number(v[k.id]) * 10)]),
      );
      const penalties = Object.fromEntries(config.penaltyTypes.map((p) => [p.id, Number(v[p.id] || 0)]));
      return {
        start: Number(v.start),
        judge: v.judge!,
        totalHundredths: sheetTotal({ criteria, penalties }, config).totalHundredths,
      };
    });
}

export interface ApiRow {
  startNumber: number;
  official: number | null;
  sheetCount: number;
}

export function verify(cards: readonly CardRow[], api: readonly ApiRow[]) {
  const problems: string[] = [];
  const byStart = new Map<number, CardRow[]>();
  for (const c of cards) byStart.set(c.start, [...(byStart.get(c.start) ?? []), c]);
  for (const [start, rows] of byStart) {
    const judges = new Set(rows.map((r) => r.judge));
    if (judges.size !== rows.length) problems.push(`nr ${start}: zdublowana karta sędziego`);
    const row = api.find((r) => r.startNumber === start);
    if (!row) {
      problems.push(`nr ${start}: brak w wynikach API`);
      continue;
    }
    if (row.sheetCount !== rows.length)
      problems.push(`nr ${start}: kart ${rows.length}, arkuszy w API ${row.sheetCount}`);
    const expected = aggregate(rows.map((r) => r.totalHundredths));
    const actual = row.official === null ? null : Math.round(row.official * 100);
    if (expected !== actual) problems.push(`nr ${start}: wynik z kart ${expected}, w API ${actual}`);
  }
  for (const r of api)
    if (r.sheetCount > 0 && !byStart.has(r.startNumber))
      problems.push(`nr ${r.startNumber}: oceny w API bez kart`);
  return problems;
}

/** `node tools/e2e/src/uat-verify.ts karty.csv <API_URL> <token> <categoryId>` */
if (/uat-verify\.ts$/.test(process.argv[1] ?? '')) {
  const [file, api, token, categoryId] = process.argv.slice(2);
  const res = await fetch(`${api}/v1/categories/${categoryId}/results`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = (await res.json()) as { rows: ApiRow[] };
  const problems = verify(parseCards(readFileSync(file!, 'utf8')), body.rows);
  console.log(problems.length ? problems.join('\n') : 'Karty zgodne z systemem.');
  process.exit(problems.length ? 1 : 0);
}
