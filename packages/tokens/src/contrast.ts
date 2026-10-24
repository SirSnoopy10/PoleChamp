/** Kolor RGB 0–255. */
export type Rgb = readonly [number, number, number];

/** `#rrggbb` → RGB. */
export function hexToRgb(hex: string): Rgb {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`Nieprawidłowy kolor ${hex}`);
  const [, r = '', g = '', b = ''] = m;
  return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
}

export function rgbToHex(rgb: Rgb): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

/** Odpowiednik `color-mix(in srgb, fg pct%, bg)`. */
export function mix(fg: string, pct: number, bg: string): string {
  const [fr, fg_, fb] = hexToRgb(fg);
  const [br, bg_, bb] = hexToRgb(bg);
  const blend = (x: number, y: number) => x * pct + y * (1 - pct);
  return rgbToHex([blend(fr, br), blend(fg_, bg_), blend(fb, bb)]);
}

function luminance(hex: string): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Kontrast WCAG 2.x (1–21). */
export function contrastRatio(fg: string, bg: string): number {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}
