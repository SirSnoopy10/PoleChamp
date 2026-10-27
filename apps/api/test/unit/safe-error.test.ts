import { describe, expect, it } from 'vitest';
import { safeError } from '../../src/common/errors/safe-error.js';

const MARK = 'PIIMARK-3f2a';

describe('IMP-403: błędy w logach bez PII (TC-SEC-017)', () => {
  it('TC-SEC-017: usuwa parametry zapytania, detail PostgreSQL i e-maile, zostawia kod i stos', () => {
    const pgError = Object.assign(new Error('duplicate key value violates unique constraint "athlete_uq"'), {
      code: '23505',
      detail: `Key (full_name)=(${MARK} Kowalska) already exists.`,
    });
    const query = new Error(
      `Failed query: insert into "athlete" ("full_name", "club") values ($1, $2)\nparams: ${MARK} Kowalska,${MARK} Klub`,
      { cause: pgError },
    );
    const safe = safeError(query);
    const text = JSON.stringify(safe);
    expect(text).not.toContain(MARK);
    expect(safe.message).toContain('params: [Filtered]');
    expect(safe.cause).toMatchObject({ code: '23505', name: 'Error' });
    expect(safe.stack).toMatch(/^\s+at /);
    expect(safeError(new Error(`brak konta ${MARK}@example.com`)).message).toBe('brak konta [Filtered]');
  });

  it('TC-SEC-017: wartości cytowane w komunikatach PostgreSQL, nazwy ograniczeń zostają', () => {
    const pg = Object.assign(new Error(`invalid input syntax for type integer: "${MARK}"`), {
      code: '22P02',
    });
    expect(safeError(pg).message).toBe('invalid input syntax for type integer: "[Filtered]"');
    const uq = Object.assign(new Error('duplicate key value violates unique constraint "athlete_uq"'), {
      code: '23505',
    });
    expect(safeError(uq).message).toContain('"athlete_uq"');
  });

  it('wartości niebędące błędem nie trafiają do logu', () => {
    expect(safeError({ fullName: MARK })).toEqual({ name: 'object', message: '[Filtered]' });
  });
});
