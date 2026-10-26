/**
 * Nietrywialne PIN-y testowe (00-strategia §5, FX-SEED) zamiast PIN-ów demo prototypu 1234…5678,
 * zakazanych w produkcie (05-bezpieczenstwo §3.1: równe cyfry, ciągi, rok 19xx/20xx, PIN-y demo).
 */
export const SEED_PINS = {
  jA: '8306',
  jB: '4719',
  jC: '2958',
  jD: '6143',
  jE: '7390',
} as const;

/** PIN-y demo prototypu – testy sprawdzają, że nie trafiają do danych testowych. */
export const DEMO_PINS = ['1234', '2345', '3456', '4567', '5678'] as const;

/** Kopia reguły `isForbiddenPin` z API (bez zależności od `apps/api`). */
export function isForbiddenPin(pin: string): boolean {
  const digits = [...pin].map(Number);
  const steps = digits.slice(1).map((d, i) => d - digits[i]!);
  return (
    steps.every((s) => s === 0) ||
    steps.every((s) => s === 1) ||
    steps.every((s) => s === -1) ||
    /^(19|20)\d\d$/.test(pin) ||
    (DEMO_PINS as readonly string[]).includes(pin)
  );
}
