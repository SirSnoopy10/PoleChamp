import { Dimensions, type ScaledSize } from 'react-native';

/** Progi NFR-702: najmniejszy wymiar ekranu ≥ 600 dp i szerokość w poziomie ≥ 1024 dp. */
export const JUDGE_MIN_SHORT_SIDE = 600;
export const JUDGE_MIN_LANDSCAPE_WIDTH = 1024;

export interface DeviceCapabilities {
  /** Ekran spełnia wymagania panelu sędziego (NFR-702). */
  supportsJudge: boolean;
  /** Tablet (najmniejszy wymiar ≥ 600 dp) – organizator bez blokady orientacji (TL-24). */
  isTablet: boolean;
}

/** Możliwości urządzenia z wymiarów fizycznego ekranu (nie okna – okno może być pomniejszone). */
export function deviceCapabilities(
  screen: Pick<ScaledSize, 'width' | 'height'> = Dimensions.get('screen'),
): DeviceCapabilities {
  const short = Math.min(screen.width, screen.height);
  const long = Math.max(screen.width, screen.height);
  const isTablet = short >= JUDGE_MIN_SHORT_SIDE;
  return { isTablet, supportsJudge: isTablet && long >= JUDGE_MIN_LANDSCAPE_WIDTH };
}
