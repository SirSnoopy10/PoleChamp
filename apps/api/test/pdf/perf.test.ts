import { describe, expect, it } from 'vitest';
import { PdfRenderer } from '../../src/modules/exports/pdf/renderer.js';
import { fxMax } from './fixtures.js';

/** p95 z 5 przebiegów (przy 5 próbkach = maksimum). */
async function p95(fn: () => Promise<unknown>, runs = 5): Promise<number> {
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return times[Math.ceil(runs * 0.95) - 1] ?? Infinity;
}

describe('wydajność PDF (IMP-173, NFR-107)', () => {
  const renderer = new PdfRenderer();
  const max = fxMax();

  it('TC-PERF-007, TC-PDF-010: PDF kategorii FX-MAX ≤ 3 s, całego turnieju (60 kategorii, 1 500 startów) ≤ 10 s', async () => {
    const single = { ...max, categories: max.categories.slice(0, 1) };
    await renderer.render(single, 'CATEGORY'); // rozgrzanie (fonty)
    const category = await p95(() => renderer.render(single, 'CATEGORY'));
    const tournament = await p95(() => renderer.render(max, 'TOURNAMENT'));
    console.info(`PDF p95: kategoria ${category.toFixed(0)} ms, turniej ${tournament.toFixed(0)} ms`);
    expect(category).toBeLessThan(3_000);
    expect(tournament).toBeLessThan(10_000);
  }, 120_000);
});
