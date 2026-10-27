import { describe, expect, it } from 'vitest';
import { createLimiter } from '../../src/common/concurrency/limiter.js';
import { PasswordService } from '../../src/modules/auth/password.service.js';

const tick = () => new Promise((r) => setTimeout(r, 5));

describe('IMP-502: ograniczenie współbieżności Argon2id', () => {
  it('TC-PERF-002: limiter – najwyżej N zadań naraz, kolejność FIFO, błąd zwalnia miejsce', async () => {
    const limiter = createLimiter(2);
    let peak = 0;
    const order: number[] = [];
    const tasks = Array.from({ length: 6 }, (_, i) =>
      limiter.run(async () => {
        peak = Math.max(peak, limiter.active);
        await tick();
        order.push(i);
        if (i === 1) throw new Error('x');
        return i;
      }),
    );
    expect(limiter.pending).toBe(4);
    const results = await Promise.allSettled(tasks);
    expect(peak).toBe(2);
    expect(order).toEqual([0, 1, 2, 3, 4, 5]);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(limiter.active).toBe(0);
    expect(() => createLimiter(0)).toThrow();
  });

  it('TC-PERF-002: fala logowań – PasswordService hashuje najwyżej HASH_CONCURRENCY naraz', async () => {
    const service = new PasswordService({ HASH_CONCURRENCY: 2 });
    const hash = await service.hash('Poprawne-Haslo-1');
    let peak = 0;
    const watch = setInterval(() => (peak = Math.max(peak, service.limiter.active)), 1);
    const started = performance.now();
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => service.verify(i % 2 ? hash : null, 'Poprawne-Haslo-1')),
    );
    const elapsed = performance.now() - started;
    clearInterval(watch);
    expect(results).toEqual([false, true, false, true, false, true]);
    expect(peak).toBeLessThanOrEqual(2);
    expect(service.limiter.pending).toBe(0);
    // Koszt jednego Argon2id (m = 19 MiB, t = 2) na tej maszynie – do raportu docs-dev/perf/api.md.
    console.info(`argon2id: 6 weryfikacji / 2 równolegle = ${Math.round(elapsed)} ms`);
  });
});
