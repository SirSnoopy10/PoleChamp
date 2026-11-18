import { useReducedMotion } from '../motion';
import { GRID } from './pole-engine';
import { PixelCanvas } from './PixelCanvas';
import { usePoleFrames } from './usePoleFrames';

/** Rozmiary z 09-design-system §4.21: telefon 340×300, tablet 470×410. */
export const SPINNER_SIZE = { org: { width: 340, height: 300 }, judge: { width: 470, height: 410 } } as const;

export interface PoleSpinnerProps {
  size: keyof typeof SPINNER_SIZE;
  /** Wymuszenie statycznej klatki (poza ustawieniem „Ogranicz ruch”). */
  still?: boolean;
}

/** Animacja tancerki pixel-art (siatka 80×70, 24 kl./s, pętla 4,3 s); „Ogranicz ruch” → klatka. */
export function PoleSpinner({ size, still }: PoleSpinnerProps) {
  const reduced = useReducedMotion();
  const animated = !reduced && !still;
  const { pixels, version } = usePoleFrames(animated);
  const { width, height } = SPINNER_SIZE[size];
  return (
    <PixelCanvas
      testID={animated ? 'pole-spinner' : 'pole-spinner-still'}
      pixels={pixels}
      version={version}
      gridWidth={GRID.width}
      gridHeight={GRID.height}
      width={width}
      height={height}
    />
  );
}
