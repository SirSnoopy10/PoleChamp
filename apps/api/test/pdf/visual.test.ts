import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compare } from 'odiff-bin';
import { pdf } from 'pdf-to-img';
import { describe, expect, it } from 'vitest';
import { PdfRenderer } from '../../src/modules/exports/pdf/renderer.js';
import { FROZEN_AT, fxCategory, fxTournament } from './fixtures.js';

const here = dirname(fileURLToPath(import.meta.url));
const BASELINES = join(here, '__baselines__');
const OUT = join(here, '..', '..', 'reports', 'pdf');
const UPDATE = process.env.UPDATE_BASELINES === '1';

/** Pierwsza strona jako PNG w 150 dpi (skala 150/72). */
async function firstPage(bytes: Buffer): Promise<Buffer> {
  const doc = await pdf(bytes, { scale: 150 / 72 });
  return doc.getPage(1);
}

async function check(name: string, bytes: Buffer) {
  const png = await firstPage(bytes);
  const baseline = join(BASELINES, `${name}.png`);
  if (UPDATE || !existsSync(baseline)) {
    mkdirSync(BASELINES, { recursive: true });
    writeFileSync(baseline, png);
    return;
  }
  mkdirSync(OUT, { recursive: true });
  const actual = join(OUT, `${name}.actual.png`);
  writeFileSync(actual, png);
  // Różnica zapisywana jako artefakt CI (reports/pdf/*.diff.png) przy porażce.
  const result = await compare(baseline, actual, join(OUT, `${name}.diff.png`), { threshold: 0.1 });
  const percent = result.match ? 0 : 'diffPercentage' in result ? result.diffPercentage : 100;
  expect(percent, `różnica ${name}: ${JSON.stringify(result)}`).toBeLessThanOrEqual(0.1);
}

describe('regresja wizualna PDF (IMP-173)', () => {
  const renderer = new PdfRenderer();

  it('TC-PDF-009: pierwsza strona PDF kategorii zgodna ze wzorcem (odiff ≤ 0,1%)', async () => {
    await check('category-c3', await renderer.render(fxCategory(), 'CATEGORY', FROZEN_AT));
  });

  it('TC-PDF-009: pierwsza strona PDF turnieju zgodna ze wzorcem (odiff ≤ 0,1%)', async () => {
    await check('tournament-t1', await renderer.render(fxTournament(), 'TOURNAMENT', FROZEN_AT));
  });
});
