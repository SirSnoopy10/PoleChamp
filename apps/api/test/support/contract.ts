import { Problem, type RouteDef, routes } from '@polechamp/contracts';

/**
 * Walidacja odpowiedzi kontraktem (IMP-452, NFR-903): każda odpowiedź w testach integracyjnych
 * musi pasować do schematu trasy z `@polechamp/contracts` (sukces) albo do `Problem` (błąd).
 */
const compiled = routes.map((route) => ({
  route,
  method: route.method.toUpperCase(),
  re: new RegExp(`^${route.path.replace(/\{\w+\}/g, '[^/]+')}$`),
}));

export function findRoute(method: string, url: string): RouteDef | undefined {
  const path = url.split('?')[0]!;
  return compiled.find((c) => c.method === method && c.re.test(path))?.route;
}

export class ContractViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractViolation';
  }
}

/** Zwraca opis niezgodności albo `null`. Trasy spoza kontraktu (np. `/health`) są pomijane. */
export function checkResponse(method: string, url: string, status: number, body: unknown): string | null {
  const route = findRoute(method, url);
  if (!route) return null;
  const where = `${method} ${route.path} → ${status}`;
  if (status === 304) return null;
  if (status >= 400) {
    const parsed = Problem.safeParse(body);
    return parsed.success ? null : `${where}: treść niezgodna z Problem (${parsed.error.issues[0]?.message})`;
  }
  if (status !== route.success.status)
    return `${where}: status nieopisany w kontrakcie (${route.success.status})`;
  if (route.success.schema === null) return body === undefined ? null : `${where}: oczekiwano pustej treści`;
  const parsed = route.success.schema.safeParse(body);
  if (parsed.success) return null;
  const issue = parsed.error.issues[0];
  return `${where}: ${issue?.path.join('.')} – ${issue?.message}`;
}

let enabled = true;
/** Wyłącza walidację na czas bloku (testy celowo wysyłające odpowiedzi spoza kontraktu). */
export async function withoutContractCheck<T>(fn: () => Promise<T>): Promise<T> {
  enabled = false;
  try {
    return await fn();
  } finally {
    enabled = true;
  }
}

export function assertContract(method: string, url: string, status: number, body: unknown): void {
  if (!enabled || process.env.CONTRACT_CHECK === '0') return;
  const problem = checkResponse(method, url, status, body);
  if (problem) throw new ContractViolation(problem);
}
