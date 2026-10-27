import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSeed } from '@polechamp/test-fixtures';
import { describe, expect, it } from 'vitest';
import { checkFlows, collectTestIds, collectTexts, idKnown, textKnown } from '../src/maestro.ts';

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
    const texts = collectTexts(
      resolve(mobile, '../../packages/i18n/src/locales/pl'),
      [
        resolve(mobile, '../../packages/test-fixtures/src/seed.ts'),
        resolve(mobile, '../api/src/modules/e2e/e2e-seed.service.ts'),
        resolve(mobile, 'e2e/maestro/_shared/api.js'),
      ],
      Object.values(buildSeed().participants).map((p) => p.name),
    );
    expect(textKnown('Turniej rozpoczęty', texts)).toBe(true);
    expect(textKnown('Tekst spoza aplikacji', texts)).toBe(false);
    expect(checkFlows(resolve(mobile, 'e2e/maestro'), ids, texts)).toEqual([]);
    expect(checkFlows(resolve(mobile, '../../tools/visual/maestro'), ids, texts)).toEqual([]);
  });
});
