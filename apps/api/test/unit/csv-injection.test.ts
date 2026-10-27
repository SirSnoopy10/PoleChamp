import { describe, expect, it } from 'vitest';
import { field } from '../../src/modules/exports/csv/results-csv.js';

describe('IMP-400: ASVS V1 – wstrzyknięcie formuł w CSV (TC-SEC-022)', () => {
  it('neutralizuje tekst zaczynający się od znaku formuły', () => {
    expect(field('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(field('+48 123')).toBe(`'+48 123`);
    expect(field('@SUM(A1)')).toBe(`'@SUM(A1)`);
    expect(field('\tKowalska')).toBe(`'\tKowalska`);
  });

  it('zostawia liczby ujemne, zwykły tekst i puste pola', () => {
    expect(field('-1,5')).toBe('-1,5');
    expect(field(-2)).toBe('-2');
    expect(field('Anna Nowak')).toBe('Anna Nowak');
    expect(field(null)).toBe('');
  });
});
