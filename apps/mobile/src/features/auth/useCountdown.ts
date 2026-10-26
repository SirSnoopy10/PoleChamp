import { useCallback, useEffect, useState } from 'react';

/** Odliczanie w sekundach (blokada logowania `retryAfterSeconds`, ponowne wysłanie kodu). */
export function useCountdown(initial = 0): [number, (seconds: number) => void] {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  const start = useCallback((seconds: number) => setLeft(Math.max(0, Math.ceil(seconds))), []);
  return [left, start];
}
