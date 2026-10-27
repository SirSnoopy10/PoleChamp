import { randomUUID } from 'node:crypto';

/**
 * Enumeracja kont przez sieć (IMP-404, TC-SEC-012) – staging: `register`, `login`, `password/forgot` dla
 * istniejącego i nieistniejącego e-maila, porównanie statusów, treści i median czasu (próg 50 ms).
 * Istniejące konto podaje zespół (`ENUM_EXISTING_EMAIL`); logowanie maks. 4 próby na konto (blokada 5).
 */
export type Fetch = typeof fetch;

export interface EndpointResult {
  endpoint: string;
  sameResponse: boolean;
  medianDiffMs: number;
  ok: boolean;
}

export const MAX_MEDIAN_DIFF_MS = 50;

export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
};

const body = (endpoint: string, email: string) =>
  endpoint === 'login'
    ? { email, password: `zle-${randomUUID()}` }
    : endpoint === 'register'
      ? {
          email,
          password: `Enum-${randomUUID()}`,
          displayName: 'Test',
          acceptTerms: true,
          termsVersion: '2026-11',
        }
      : { email };

const PATH: Record<string, string> = {
  login: '/v1/auth/login',
  register: '/v1/auth/register',
  forgot: '/v1/auth/password/forgot',
};

/** Treść bez pól zmiennych (identyfikator żądania, ścieżka). */
async function signature(res: Response): Promise<string> {
  const text = await res.text();
  const parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  const { requestId: _r, instance: _i, ...rest } = parsed;
  return JSON.stringify([res.status, rest]);
}

export async function probe(
  apiUrl: string,
  existingEmails: string[],
  samples: number,
  http: Fetch = fetch,
  now = () => performance.now(),
): Promise<EndpointResult[]> {
  const results: EndpointResult[] = [];
  for (const endpoint of ['login', 'forgot', 'register']) {
    const times: [number[], number[]] = [[], []];
    const sigs = new Set<string>();
    for (let i = 0; i < samples; i++) {
      const known = existingEmails[i % existingEmails.length] ?? '';
      for (const [k, email] of [known, `enum-${randomUUID()}@example.com`].entries()) {
        const start = now();
        const res = await http(`${apiUrl}${PATH[endpoint]}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body(endpoint, email)),
        });
        times[k as 0 | 1].push(now() - start);
        sigs.add(await signature(res));
      }
    }
    const medianDiffMs = Math.abs(median(times[0]) - median(times[1]));
    results.push({
      endpoint,
      sameResponse: sigs.size === 1,
      medianDiffMs,
      ok: sigs.size === 1 && medianDiffMs < MAX_MEDIAN_DIFF_MS,
    });
  }
  return results;
}

async function main() {
  const apiUrl = process.env.SECURITY_API_URL;
  const emails = (process.env.ENUM_EXISTING_EMAILS ?? '').split(',').filter(Boolean);
  if (!apiUrl || emails.length === 0) throw new Error('Wymagane SECURITY_API_URL i ENUM_EXISTING_EMAILS');
  // 200 prób (TC-SEC-012) przy 4 na konto wymaga 50 kont; mniej kont → mniej prób logowania.
  const results = await probe(apiUrl, emails, Math.min(200, emails.length * 4));
  console.log(JSON.stringify(results, null, 2));
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

if (process.argv[1]?.endsWith('enumeration.ts')) await main();
