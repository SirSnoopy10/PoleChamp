import { describe, expect, it } from 'vitest';
import { InvalidEnvError, loadEnv } from '../../src/config/env.js';
import { uuidv7 } from '../../src/common/ids.js';

const base = {
  DATABASE_URL: 'postgres://pc_app:x@localhost:5432/polechamp',
  VALKEY_URL: 'redis://localhost:6379',
  JWT_KEYS: '{}',
  PIN_FINGERPRINT_KEY: Buffer.alloc(32).toString('base64'),
};

describe('IMP-100: konfiguracja środowiska', () => {
  it('uzupełnia wartości domyślne', () => {
    const env = loadEnv(base);
    expect(env).toMatchObject({
      PORT: 3000,
      DATABASE_SSL: false,
      APP_MIN_VERSION: '1.0.0',
      SHUTDOWN_DELAY_MS: 10_000,
    });
  });

  it('przerywa start z czytelną listą błędów', () => {
    try {
      loadEnv({ ...base, DATABASE_URL: 'nie-url', PIN_FINGERPRINT_KEY: undefined, PORT: '-1' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidEnvError);
      const problems = (error as InvalidEnvError).problems.join('\n');
      expect(problems).toMatch(/DATABASE_URL/);
      expect(problems).toMatch(/PIN_FINGERPRINT_KEY/);
      expect(problems).toMatch(/PORT/);
    }
  });
});

describe('uuidv7', () => {
  it('ma wersję 7, wariant RFC i rośnie z czasem', () => {
    const a = uuidv7(1_700_000_000_000);
    const b = uuidv7(1_700_000_000_001);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a < b).toBe(true);
  });
});
