import { exportJWK, generateKeyPair, type JWK } from 'jose';
import { describe, expect, it } from 'vitest';
import type { Env } from '../../src/config/env.js';
import { InvalidTokenError, JwtService, type JwtKeysSecret } from '../../src/modules/auth/jwt.service.js';

async function key(kid: string) {
  const { privateKey } = await generateKeyPair('ES256', { extractable: true });
  return { kid, privateJwk: await exportJWK(privateKey) };
}
const publicOf = ({ d: _d, ...jwk }: JWK) => jwk;
const service = (keys: JwtKeysSecret) =>
  new JwtService({ JWT_KEYS: JSON.stringify(keys), JWT_ISSUER: 'https://api.test' } as Env);

describe('IMP-405: rotacja kluczy JWT (TC-SEC-024)', () => {
  it('TC-SEC-024: publikacja next → przełączenie → wygaszenie bez przerw w uwierzytelnianiu', async () => {
    const a = await key('kid-a');
    const b = await key('kid-b');
    const phase0 = service({ active: a });
    const phase1 = service({ active: a, next: b }); // next opublikowany, podpis nadal A
    const phase2 = service({ active: b, previous: { kid: a.kid, publicJwk: publicOf(a.privateJwk) } });
    const phase3 = service({ active: b }); // previous wygaszony po 30 dniach

    const old = (await phase0.sign({ typ: 'judge', sub: 'j1', dev: 'd1', trn: 't1', sid: 's1' })).token;
    expect(JSON.parse(Buffer.from(old.split('.')[0]!, 'base64url').toString()).kid).toBe('kid-a');
    await expect(phase1.verify(old)).resolves.toMatchObject({ sub: 'j1' });
    await expect(phase2.verify(old)).resolves.toMatchObject({ sub: 'j1' });

    const fresh = (await phase2.sign({ typ: 'org', sub: 'u1' })).token;
    expect(JSON.parse(Buffer.from(fresh.split('.')[0]!, 'base64url').toString()).kid).toBe('kid-b');
    // Wdrożenie kroczące: zadania jeszcze w fazie 1 akceptują tokeny nowego klucza.
    await expect(phase1.verify(fresh)).resolves.toMatchObject({ sub: 'u1' });
    await expect(phase0.verify(fresh)).rejects.toBeInstanceOf(InvalidTokenError);

    await expect(phase3.verify(old)).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(phase3.verify(fresh)).resolves.toMatchObject({ sub: 'u1' });
  });

  it('klucz next nie podpisuje przed przełączeniem', async () => {
    const a = await key('kid-a');
    const b = await key('kid-b');
    const { token } = await service({ active: a, next: b }).sign({ typ: 'org', sub: 'u1' });
    expect(JSON.parse(Buffer.from(token.split('.')[0]!, 'base64url').toString()).kid).toBe('kid-a');
  });
});
