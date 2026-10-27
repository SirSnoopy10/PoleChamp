import { describe, expect, it } from 'vitest';
import { activeAgeDays, newKey, promote, publishNext, retire } from '../src/jwt-rotation.ts';
import { read } from '../src/docs.ts';

const day = (n: number) => new Date(Date.UTC(2026, 0, 1) + n * 86_400_000);

describe('IMP-405: narzędzie rotacji kluczy JWT', () => {
  it('TC-SEC-024: cykl publish-next → promote → retire po 30 dniach', async () => {
    const start = { active: await newKey(day(0)) };
    const published = await publishNext(start, day(90));
    expect(published.next!.kid).not.toBe(start.active.kid);
    await expect(publishNext(published, day(90))).rejects.toThrow(/już opublikowany/);

    const promoted = promote(published, day(91));
    expect(promoted.active.kid).toBe(published.next!.kid);
    expect(promoted.previous!.kid).toBe(start.active.kid);
    expect(promoted.previous!.publicJwk).not.toHaveProperty('d');
    expect(promoted.previous!.retireAfter).toBe(day(121).toISOString());

    expect(() => retire(promoted, day(100))).toThrow(/ważny do/);
    expect(retire(promoted, day(121))).toEqual({ active: promoted.active });
    expect(activeAgeDays(promoted, day(201))).toBe(111);
  });

  it('runbook opisuje wszystkie kroki i alarm wieku klucza', () => {
    const runbook = read('ops/runbooks/jwt-rotation.md');
    for (const s of ['publish-next', 'promote', 'retire', '30 dni', '90 dni', '100 dni', 'TC-SEC-024']) {
      expect(runbook).toContain(s);
    }
  });
});
