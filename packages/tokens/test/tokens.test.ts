import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { color, contrastRatio, hexToRgb, mix, radius, shadow, space, typography } from '../src/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const dsDir = resolve(root, 'design/_ds');
const css = readFileSync(resolve(dsDir, readdirSync(dsDir)[0] as string, 'styles.css'), 'utf8');
const cssVar = (name: string) => new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim();

describe('@polechamp/tokens (IMP-068)', () => {
  it('parytet z design/_ds/nocturne/styles.css', () => {
    for (const k of ['bg', 'surface', 'text', 'accent', 'section'] as const)
      expect(color[k], k).toBe(cssVar(`color-${k}`));
    for (const step of [100, 200, 300, 400, 500, 600, 700, 800, 900] as const) {
      expect(color.neutral[step]).toBe(cssVar(`color-neutral-${step}`));
      expect(color.accentRamp[step]).toBe(cssVar(`color-accent-${step}`));
    }
    for (const step of [1, 2, 3, 4, 6, 8] as const) expect(`${space[step]}px`).toBe(cssVar(`space-${step}`));
    expect([`${radius.sm}px`, `${radius.md}px`, `${radius.lg}px`]).toEqual([
      cssVar('radius-sm'),
      cssVar('radius-md'),
      cssVar('radius-lg'),
    ]);
    expect(cssVar('shadow-sm')).toContain(shadow.sm.borderColor);
    expect(cssVar('shadow-md')).toContain(shadow.md.borderColor);
    expect(cssVar('shadow-lg')).toContain(shadow.lg.borderColor);
    expect(cssVar('color-divider')).toBe('color-mix(in srgb, #e9e9ed 16%, transparent)');
    expect(cssVar('font-body')).toMatch(/^"Inter"/);
  });

  it('TC-TOKENS-001 / TC-A11Y-001: kontrast par tokenów (NFR-202, 08-NFR §2.1)', () => {
    const divider = mix(color.text, 0.16, color.surface);
    const pairs: [string, string, number, number][] = [
      [color.text, color.bg, 14.54, 4.5],
      [color.text, color.surface, 12.55, 4.5],
      [color.neutral[300], color.surface, 10.2, 4.5],
      [color.neutral[400], color.surface, 7.55, 4.5],
      [color.neutral[500], color.surface, 5.25, 4.5],
      [color.neutral[600], color.surface, 3.52, 3],
      [color.neutral[600], color.bg, 4.08, 3],
      [color.accent, color.bg, 5.45, 4.5],
      [color.accent, color.surface, 4.71, 4.5],
      [color.accentRamp[300], color.accentRamp[900], 9.52, 4.5],
      [color.accentRamp[200], color.accentRamp[900], 11.6, 4.5],
      [color.neutral[200], color.neutral[900], 11.49, 4.5],
    ];
    for (const [fg, bg, documented, minimum] of pairs) {
      const ratio = contrastRatio(fg, bg);
      expect(ratio, `${fg}/${bg}`).toBeCloseTo(documented, 1);
      expect(ratio, `${fg}/${bg}`).toBeGreaterThanOrEqual(minimum);
    }
    // Pary świadomie poniżej 3:1 – tylko dekoracja (tabela §2.1).
    expect(contrastRatio(divider, color.surface)).toBeCloseTo(1.58, 1);
    expect(contrastRatio(color.neutral[800], color.bg)).toBeCloseTo(1.76, 1);
    expect(contrastRatio(color.neutral[600], color.surface)).toBeLessThan(4.5);
  });

  it('TC-TOKENS-002: kolory mieszane = color-mix z prototypu (±1 na kanał)', () => {
    const recipes: Record<keyof typeof color.mix, string> = {
      accent9OnSurface: mix(color.accent, 0.09, color.surface),
      accent10OnBg: mix(color.accent, 0.1, color.bg),
      accent14OnBg: mix(color.accent, 0.14, color.bg),
      accent10OnSurface: mix(color.accent, 0.1, color.surface),
      surface45OnBg: mix(color.surface, 0.45, color.bg),
      accent12OnBg: mix(color.accent, 0.12, color.bg),
      accent12OnSurface: mix(color.accent, 0.12, color.surface),
      glowAccent900_70: mix(color.accentRamp[900], 0.7, color.bg),
    };
    for (const [name, expected] of Object.entries(recipes)) {
      const actual = hexToRgb(color.mix[name as keyof typeof color.mix]);
      hexToRgb(expected).forEach((c, i) =>
        expect(Math.abs((actual[i] as number) - c), name).toBeLessThanOrEqual(1),
      );
    }
  });

  it('TC-TOKENS-004: typografia – wagi 400/500, rozmiary, cyfry tabelaryczne', () => {
    for (const [name, s] of Object.entries(typography)) {
      expect(['400', '500'], name).toContain(s.fontWeight);
      expect(s.fontFamily, name).toBe(s.fontWeight === '500' ? 'Inter_500Medium' : 'Inter_400Regular');
      expect(s.lineHeight, name).toBeGreaterThanOrEqual(s.fontSize);
    }
    const sizes = Object.fromEntries(
      Object.entries(typography).map(([k, s]) => [k, [s.fontSize, s.lineHeight]]),
    );
    expect(sizes).toMatchObject({
      display: [32, 36],
      titleL: [28, 32],
      titleM: [26, 31],
      titleS: [24, 28],
      heading: [20, 24],
      cardTitle: [18, 22.5],
      subhead: [16, 20],
      body: [15, 23],
      bodyS: [14, 21],
      caption: [12, 17],
      kicker: [11.5, 14],
      micro: [11, 13],
      numXL: [30, 30],
      numL: [22, 26],
      pin: [26, 30],
    });
    for (const k of ['numXL', 'numL', 'numM'] as const)
      expect(typography[k].fontVariant).toEqual(['tabular-nums']);
    expect(typography.kicker.textTransform).toBe('uppercase');
  });

  it('hexToRgb odrzuca nieprawidłowy kolor', () => {
    expect(() => hexToRgb('#fff')).toThrow();
  });
});
