import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_MEDIAN_DIFF_MS, median, probe, type Fetch } from '../src/enumeration.ts';
import { missingPaths, read, ROOT, unknownTestCases } from '../src/docs.ts';

describe('IMP-404: zestaw testów nadużyć', () => {
  it('TC-SEC-012: probe wykrywa różne treści i różnicę czasu', async () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 10])).toBe(2.5);
    let clock = 0;
    const leaky: Fetch = async (_url, init) => {
      const known = String(init?.body).includes('istnieje@');
      clock += known ? 120 : 5; // istniejące konto liczy Argon2, nieistniejące nie
      return new Response(JSON.stringify({ code: 'INVALID_CREDENTIALS', requestId: String(clock) }), {
        status: 401,
      });
    };
    const results = await probe('https://api', ['istnieje@example.com'], 4, leaky, () => clock);
    expect(results.map((r) => r.endpoint)).toEqual(['login', 'forgot', 'register']);
    expect(results.every((r) => r.sameResponse)).toBe(true);
    expect(results.every((r) => !r.ok && r.medianDiffMs > MAX_MEDIAN_DIFF_MS)).toBe(true);
  });

  it('skrypty k6 mają progi blokujące przebieg przy przyjęciu prób po limicie', () => {
    for (const name of ['login', 'pin', 'pairing']) {
      const script = readFileSync(join(ROOT, `tools/security/k6/bruteforce-${name}.js`), 'utf8');
      expect(script).toContain('bruteforce_accepted_after_limit');
      expect(script).toMatch(/thresholds:/);
    }
    // Alfabet kodu w skrypcie zgodny z kontraktem.
    const contracts = read('packages/contracts/src/schemas/judges.ts');
    const alphabet = /PAIRING_ALPHABET = '([A-Z0-9]+)'/.exec(contracts)![1]!;
    expect(read('tools/security/k6/bruteforce-pairing.js')).toContain(`'${alphabet}'`);
  });

  it('workflow security.yml i dokument wyników obejmują wszystkie TC zestawu', () => {
    const wf = read('.github/workflows/security.yml');
    const doc = read('docs-dev/security/abuse-tests.md');
    for (const tc of ['TC-SEC-012', 'TC-SEC-013', 'TC-SEC-014', 'TC-SEC-015', 'TC-SEC-022'])
      expect(wf).toContain(tc);
    for (const tc of [
      'TC-SEC-011',
      'TC-SEC-012',
      'TC-SEC-013',
      'TC-SEC-014',
      'TC-SEC-015',
      'TC-SEC-021',
      'TC-SEC-022',
    ]) {
      expect(doc).toContain(tc);
    }
    expect(missingPaths(doc)).toEqual([]);
    expect(unknownTestCases(doc)).toEqual([]);
  });
});
