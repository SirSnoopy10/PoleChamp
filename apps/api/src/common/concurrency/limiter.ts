/**
 * Ogranicznik współbieżności (IMP-502): najwyżej `max` zadań naraz, reszta czeka w kolejce FIFO.
 * Używany dla Argon2id – każde hashowanie zajmuje wątek puli libuv (domyślnie 4) i 19 MiB pamięci,
 * więc fala logowań nie może zablokować puli dla DNS, `pbkdf2` i plików ani wyczerpać pamięci zadania.
 */
export interface Limiter {
  run<T>(task: () => Promise<T>): Promise<T>;
  readonly active: number;
  readonly pending: number;
}

export function createLimiter(max: number): Limiter {
  if (!Number.isInteger(max) || max < 1) throw new Error(`Niepoprawny limit współbieżności: ${max}`);
  let active = 0;
  const queue: (() => void)[] = [];

  const release = () => {
    active--;
    queue.shift()?.();
  };

  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      if (active >= max) await new Promise<void>((resolve) => queue.push(resolve));
      active++;
      try {
        return await task();
      } finally {
        release();
      }
    },
    get active() {
      return active;
    },
    get pending() {
      return queue.length;
    },
  };
}
