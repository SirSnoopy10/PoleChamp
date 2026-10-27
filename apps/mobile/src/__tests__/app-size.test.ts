import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// @ts-expect-error – skrypt Node (.mjs) bez deklaracji typów
import { compareSize, MAX_GROWTH } from '../../scripts/size-check.mjs';

describe('rozmiar aplikacji (IMP-506)', () => {
  it('TC-PERF-009: wzrost bajtkodu ponad +10% względem poprzedniego wydania przerywa CI', () => {
    expect(MAX_GROWTH).toBe(0.1);
    expect(compareSize(9000, 8435).pass).toBe(true);
    expect(compareSize(9300, 8435).pass).toBe(false);
    expect(compareSize(9300, null)).toEqual({ pass: true, growth: null });
  });

  it('TC-PERF-009: build release z R8 i usuwaniem zasobów, tylko fonty Inter 400/500', () => {
    const config = readFileSync(join(__dirname, '../../app.config.ts'), 'utf8');
    expect(config).toContain('enableMinifyInReleaseBuilds: true');
    expect(config).toContain('enableShrinkResourcesInReleaseBuilds: true');
    const layout = readFileSync(join(__dirname, '../../app/_layout.tsx'), 'utf8');
    const fonts = layout.match(/Inter_\d{3}\w+/g) ?? [];
    expect(new Set(fonts)).toEqual(new Set(['Inter_400Regular', 'Inter_500Medium']));
  });
});
