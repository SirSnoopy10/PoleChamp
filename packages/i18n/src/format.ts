/** Formatery tekstów PL (NFR-602): przecinek dziesiętny, minus U+2212, półpauza w zakresach, cudzysłowy „…”. */
export const MINUS = '−';
export const EN_DASH = '–';

const MONTHS_GENITIVE = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
] as const;

export const DATE_TBD = 'Data do ustalenia';

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

/** `YYYY-MM-DD` – daty kalendarzowe turnieju (bez strefy; dzień w Europe/Warsaw). */
function parseDate(iso: string): CalendarDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Nieprawidłowa data ${iso}`);
  const [, y = '', mo = '', d = ''] = m;
  return { year: Number(y), month: Number(mo), day: Number(d) };
}

const month = (d: CalendarDate) => MONTHS_GENITIVE[d.month - 1] ?? '';

/**
 * „18 kwietnia 2027”, „3–4 października 2026”, „30 września – 1 października 2026”,
 * „31 grudnia 2026 – 1 stycznia 2027”, „Data do ustalenia” (TC-I18N-002).
 */
export function formatTournamentDate(start: string | null, end: string | null = null): string {
  if (!start) return DATE_TBD;
  const s = parseDate(start);
  if (!end || end === start) return `${s.day} ${month(s)} ${s.year}`;
  const e = parseDate(end);
  if (s.year !== e.year) return `${s.day} ${month(s)} ${s.year} ${EN_DASH} ${e.day} ${month(e)} ${e.year}`;
  if (s.month !== e.month) return `${s.day} ${month(s)} ${EN_DASH} ${e.day} ${month(e)} ${e.year}`;
  return `${s.day}${EN_DASH}${e.day} ${month(e)} ${e.year}`;
}

/** Liczba z przecinkiem i minusem U+2212 (wyniki punktowe formatuje `@polechamp/scoring`). */
export function formatDecimal(value: number, decimals: number): string {
  const text = Math.abs(value).toFixed(decimals).replace('.', ',');
  return value < 0 ? `${MINUS}${text}` : text;
}

/** Zakres liczb z półpauzą: „1–20”. */
export const formatRange = (from: number, to: number): string => `${from}${EN_DASH}${to}`;

/** Polskie cudzysłowy: „tekst”. */
export const quote = (text: string): string => `„${text}”`;
