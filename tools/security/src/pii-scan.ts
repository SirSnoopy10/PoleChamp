import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Skan PII w telemetrii (IMP-403, TC-SEC-017, NFR-504): znacznik `PIIMARK-<uuid>` trafia do API staging jako
 * nazwa wyświetlana konta, nazwisko, klub, komentarz i e-mail – w żądaniach poprawnych, błędnych (422)
 * i wymuszonym 500 (`/__e2e/error`, flaga `E2E_HELPERS`). Po odczekaniu na ingest znacznik nie może wystąpić
 * w CloudWatch Logs ani w Sentry. Zdarzenie aplikacji ze znacznikiem wysyła przepływ Maestro (`PII_MARK`).
 */

export type Fetch = typeof fetch;

export interface Hit {
  source: 'cloudwatch' | 'sentry';
  count: number;
  sample?: string;
}

export interface Searcher {
  name: Hit['source'];
  search(mark: string, sinceMs: number): Promise<Hit | null>;
}

export const newMark = () => `PIIMARK-${randomUUID()}`;

/** Żądania z danymi ze znacznikiem; zwraca statusy (do raportu – sprawdzamy tylko, że API odpowiedziało). */
export async function injectMark(apiUrl: string, mark: string, http: Fetch = fetch): Promise<number[]> {
  const post = (path: string, body: unknown, token?: string) =>
    http(`${apiUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  const email = `${mark.toLowerCase()}@example.com`;
  const password = `Pii-${randomUUID()}`;
  const statuses: number[] = [];
  const register = await post('/v1/auth/register', {
    email,
    password,
    displayName: mark,
    acceptTerms: true,
    termsVersion: '2026-11',
  });
  statuses.push(register.status);
  const login = await post('/v1/auth/login', { email, password });
  statuses.push(login.status);
  const token = login.ok ? ((await login.json()) as { accessToken: string }).accessToken : undefined;
  // Błąd walidacji i 404 z danymi zawodniczki (losowa kategoria).
  const entry = { startNumber: 0, fullName: `${mark} Kowalska`, club: mark, isMinor: false };
  statuses.push((await post(`/v1/categories/${randomUUID()}/entries`, entry, token)).status);
  statuses.push((await post('/v1/auth/register', { email: 'zly', displayName: mark })).status);
  // Wymuszony 500 z wartością w zapytaniu do bazy.
  statuses.push((await post('/__e2e/error', { fullName: mark, club: mark, comment: mark, email })).status);
  return statuses;
}

const run = promisify(execFile);

/** CloudWatch Logs Insights przez `aws` CLI (rola nocnego workflow, region eu-central-1). */
export function cloudWatchSearcher(logGroups: string[], exec = run): Searcher {
  return {
    name: 'cloudwatch',
    async search(mark, sinceMs) {
      const aws = async (args: string[]) =>
        JSON.parse((await exec('aws', [...args, '--output', 'json'])).stdout);
      const { queryId } = await aws([
        'logs',
        'start-query',
        '--log-group-names',
        ...logGroups,
        '--start-time',
        String(Math.floor(sinceMs / 1000)),
        '--end-time',
        String(Math.ceil(Date.now() / 1000) + 60),
        '--query-string',
        `fields @message | filter @message like /${mark}/ | limit 5`,
      ]);
      for (let i = 0; i < 30; i++) {
        const result = await aws(['logs', 'get-query-results', '--query-id', queryId]);
        if (result.status === 'Complete') {
          const rows = result.results as { field: string; value: string }[][];
          return rows.length
            ? {
                source: 'cloudwatch',
                count: rows.length,
                sample: rows[0]?.find((f) => f.field === '@message')?.value,
              }
            : null;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      throw new Error('CloudWatch: zapytanie nie zakończyło się w 60 s');
    },
  };
}

/** Sentry API (region UE): zdarzenia projektu z wyszukiwaniem pełnotekstowym znacznika. */
export function sentrySearcher(
  opts: { baseUrl: string; org: string; project: string; token: string },
  http: Fetch = fetch,
): Searcher {
  return {
    name: 'sentry',
    async search(mark) {
      const url = `${opts.baseUrl}/api/0/projects/${opts.org}/${opts.project}/events/?full=true&query=${encodeURIComponent(mark)}`;
      const res = await http(url, { headers: { authorization: `Bearer ${opts.token}` } });
      if (!res.ok) throw new Error(`Sentry: ${res.status}`);
      const events = (await res.json()) as { eventID: string }[];
      return events.length ? { source: 'sentry', count: events.length, sample: events[0]?.eventID } : null;
    },
  };
}

/** Przeszukanie wszystkich źródeł; trafienie = wyciek (workflow kończy się błędem). */
export async function scan(mark: string, sinceMs: number, searchers: Searcher[]): Promise<Hit[]> {
  const hits: Hit[] = [];
  for (const s of searchers) {
    const hit = await s.search(mark, sinceMs);
    if (hit) hits.push(hit);
  }
  return hits;
}

async function main() {
  const env = process.env;
  const apiUrl = env.PII_SCAN_API_URL;
  if (!apiUrl) throw new Error('Brak PII_SCAN_API_URL (staging)');
  const mark = env.PII_MARK ?? newMark();
  const since = Date.now() - 60_000;
  console.log(JSON.stringify({ mark, statuses: await injectMark(apiUrl, mark) }));
  await new Promise((r) => setTimeout(r, Number(env.PII_SCAN_INGEST_WAIT_MS ?? 120_000)));
  const searchers: Searcher[] = [
    cloudWatchSearcher((env.PII_SCAN_LOG_GROUPS ?? '').split(',').filter(Boolean)),
  ];
  if (env.SENTRY_AUTH_TOKEN) {
    for (const project of (env.SENTRY_PROJECTS ?? '').split(',').filter(Boolean)) {
      searchers.push(
        sentrySearcher({
          baseUrl: env.SENTRY_URL ?? 'https://de.sentry.io',
          org: env.SENTRY_ORG ?? '',
          project,
          token: env.SENTRY_AUTH_TOKEN,
        }),
      );
    }
  }
  const hits = await scan(mark, since, searchers);
  console.log(JSON.stringify({ mark, hits }));
  if (hits.length > 0) process.exitCode = 1;
}

if (process.argv[1]?.endsWith('pii-scan.ts')) await main();
