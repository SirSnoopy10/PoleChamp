import { resetToken } from '../../../data/auth/orgSession';
import { maskPairingCode, parsePairingLink } from '../pairing';

describe('IMP-404: linki głębokie (TC-SEC-021)', () => {
  it('TC-SEC-021: złośliwy payload parowania – odrzucony albo oczyszczony, bez awarii', () => {
    const hostile = [
      'polechamp://pair?c=<script>alert(1)</script>',
      "polechamp://pair?c=K7QM4ZTX'--",
      `polechamp://pair?c=${'A'.repeat(5000)}`,
      'polechamp://pair?c=%00%00%00',
      'javascript:alert(1)//polechamp://pair?c=K7QM4ZTX',
      'polechamp://evil.example/pair?c=K7QM4ZTX',
      'https://polechamp.app.evil.example/pair?c=K7QM4ZTX',
    ];
    for (const link of hostile) expect(parsePairingLink(link)).toBeNull();
    // Nieprawidłowy identyfikator turnieju jest ignorowany (kod zostaje).
    expect(parsePairingLink('polechamp://pair?c=K7QM4ZTX&t=../../x')).toEqual({
      code: 'K7QM4ZTX',
      tournamentId: null,
    });
    // Parametr trasy `c` przed wyświetleniem – tylko alfabet kodu, maks. 8 znaków.
    expect(maskPairingCode('<script>alert(1)</script>')).toBe('SCRI-PTAL');
  });

  it('TC-SEC-021: token resetu z XSS albo zbyt długi – pusty (API zwróci błąd linku)', () => {
    const valid = 'q'.repeat(43);
    expect(resetToken(valid)).toBe(valid);
    expect(resetToken('<script>alert(1)</script>')).toBe('');
    expect(resetToken('a'.repeat(10_000))).toBe('');
    expect(resetToken(['a', 'b'])).toBe('');
    expect(resetToken(undefined)).toBe('');
  });
});
