import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkFlows, collectTestIds, idKnown } from '../src/maestro.ts';

const mobile = resolve(dirname(fileURLToPath(import.meta.url)), '../../../apps/mobile');

describe('przepływy Maestro (IMP-454)', () => {
  const ids = collectTestIds([resolve(mobile, 'src'), resolve(mobile, 'app')]);

  it('dopasowuje testID dokładne i z szablonów', () => {
    expect(idKnown('login-submit', ids)).toBe(true);
    expect(idKnown('profile-${output.ids[JUDGE]}', ids)).toBe(true);
    expect(idKnown('pin-key-7', ids)).toBe(true);
    expect(idKnown('nie-ma-takiego-id', ids)).toBe(false);
  });

  it('wszystkie przepływy są poprawne i używają istniejących testID', () => {
    expect(checkFlows(resolve(mobile, 'e2e/maestro'), ids)).toEqual([]);
  });
});
