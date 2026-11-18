/** Rampy Nocturne (accent-100…900, neutral-100…900) i tło – scena, rura i kontur; reflektory mają własne barwy. */
export interface PolePalette {
  accent: readonly string[];
  neutral: readonly string[];
  bg: string;
}

/** Siatka, tempo i pętla animacji; `poleX` – oś rury, `floorY` – linia podłogi (piksele siatki). */
export const GRID: {
  width: number;
  height: number;
  fps: number;
  loop: number;
  poleX: number;
  floorY: number;
};

export class PoleEngine {
  constructor(palette: PolePalette, random?: () => number);
  /** Bufor klatki GW×GH, piksele RGBA (ABGR little-endian – jak `ImageData`; 0 = przezroczysty). */
  readonly out: Uint32Array;
  /** Rysuje klatkę czasu `ft` (s); `steps` – liczba kroków fizyki włosów od poprzedniej klatki. */
  step(ft: number, steps: number): void;
}

/** Statyczna klatka czasu `t` (s) – tryb „Ogranicz ruch”. */
export function renderStill(palette: PolePalette, t: number): Uint32Array;

type Pt = [number, number];
/**
 * Stawy w czasie `t` (piksele siatki) – testy naturalności ruchu. `grip` – dłoń nośna,
 * `reach` – odległość bioder od osi rury (w pikselach, w poziomie – niezależnie od obrotu).
 */
export function pose(t: number): { hips: Pt; head: Pt; grip: Pt; feet: [Pt, Pt]; reach: number };
