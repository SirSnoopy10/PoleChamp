import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Test architektury dostępu (IMP-108, IMP-409, NFR-409): kontrolery nie sięgają do bazy, a serwisy tras
 * organizatora używają `OwnershipRepository` (cudzy zasób → 404). Uruchamiany w `pnpm test` i w nocnym CI.
 */
const SRC = join(import.meta.dirname, '../../src');

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : [],
  );
}
const all = files(join(SRC, 'modules'));
const rel = (f: string) => relative(SRC, f).replaceAll('\\', '/');
const controllers = all.filter((f) => /\.controllers?\.ts$/.test(f));

/** Serwisy tras organizatora bez `OwnershipRepository` – z uzasadnieniem. */
const OWNERSHIP_EXEMPT: Record<string, string> = {
  AuthService:
    'konto zalogowanego organizatora – zakres z `sub` tokenu, brak identyfikatora zasobu w ścieżce',
  JudgeSessionsService: 'trasy tokenu urządzenia/sędziego – zakres z `trn` tokenu, nie organizatora',
};

describe('IMP-409: architektura dostępu do danych (TC-INT-008)', () => {
  it('kontrolery nie importują schematu, Drizzle ani klienta bazy (poza helperami E2E)', () => {
    const offenders = controllers
      .filter((f) => !rel(f).startsWith('modules/e2e/'))
      .filter((f) => /db\/schema\.js|from 'drizzle-orm'|Inject\(DB\)/.test(readFileSync(f, 'utf8')))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('serwisy tras @Auth(org) używają OwnershipRepository', () => {
    const missing: string[] = [];
    let checked = 0;
    for (const controller of controllers) {
      const source = readFileSync(controller, 'utf8');
      if (!source.includes("@Auth('org'")) continue;
      for (const [, service] of source.matchAll(/@Inject\((\w+Service)\)/g)) {
        if (OWNERSHIP_EXEMPT[service!]) continue;
        checked++;
        const file = all.find((f) => readFileSync(f, 'utf8').includes(`export class ${service} `));
        if (!file) missing.push(`${service}: brak pliku`);
        else if (!readFileSync(file, 'utf8').includes('OwnershipRepository'))
          missing.push(`${service} (${rel(file)})`);
      }
    }
    expect(missing).toEqual([]);
    expect(checked).toBeGreaterThanOrEqual(8);
  });
});
