import { describe, expect, it } from 'vitest';
import { FILTERED, scrubPii, scrubText } from '../src/privacy.js';

describe('scrubPii (NFR-504)', () => {
  it('TC-SEC-017: usuwa nazwiska, kluby, e-maile, komentarze, PIN-y i tokeny', () => {
    const event = {
      user: { email: 'zztest@example.com', id: 'u1' },
      extra: {
        athlete: { fullName: 'ZZTEST Kowalska', club: 'ZZTEST Klub', startNumber: 47 },
        sheet: { comment: 'ZZTEST świetny występ', pin: '1234' },
        headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSJ9.abc' },
      },
      breadcrumbs: [{ message: 'reset dla zztest@example.com', data: { url: '/reset?token=sekret&x=1' } }],
    };
    const scrubbed = scrubPii(event);
    const json = JSON.stringify(scrubbed);
    expect(json).not.toMatch(/ZZTEST|zztest|1234|sekret|eyJ/);
    expect(scrubbed.extra.athlete).toEqual({ fullName: FILTERED, club: FILTERED, startNumber: 47 });
    expect(scrubbed.user.id).toBe('u1');
    expect(scrubbed.breadcrumbs[0]?.data.url).toBe(`/reset?token=${FILTERED}&x=1`);
  });

  it('maskuje sekrety w tekstach i nie zmienia oryginału', () => {
    expect(scrubText('polechamp://pair?c=ABCD-1234&t=t1')).toBe(
      `polechamp://pair?c=${FILTERED}&t=${FILTERED}`,
    );
    const original = { name: 'Anna' };
    scrubPii(original);
    expect(original.name).toBe('Anna');
  });

  it('przerywa cykle', () => {
    const a: Record<string, unknown> = { id: 1 };
    a.self = a;
    expect(scrubPii(a)).toEqual({ id: 1, self: FILTERED });
  });
});
