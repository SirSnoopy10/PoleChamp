/** Paleta 4-tonowa z ramp Nocturne (accent-100…900, neutral-100…900) i tło. */
export interface PolePalette {
  accent: readonly string[];
  neutral: readonly string[];
  bg: string;
}

export const GRID: { width: number; height: number; fps: number; loop: number };

export class PoleEngine {
  constructor(palette: PolePalette, random?: () => number);
  /** Bufor klatki GW×GH, piksele RGBA (ABGR little-endian – jak `ImageData`). */
  readonly out: Uint32Array;
  /** Rysuje klatkę czasu `ft` (s); `steps` – liczba kroków fizyki kucyka od poprzedniej klatki. */
  step(ft: number, steps: number): void;
}

/** Statyczna klatka czasu `t` (s) – tryb „Ogranicz ruch”. */
export function renderStill(palette: PolePalette, t: number): Uint32Array;
