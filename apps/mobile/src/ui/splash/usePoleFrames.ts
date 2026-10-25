import { useEffect, useMemo, useRef, useState } from 'react';
import { color } from '@polechamp/tokens';
import { GRID, PoleEngine, renderStill, type PolePalette } from './pole-engine';

const ramp = (r: Record<number, string>) =>
  [100, 200, 300, 400, 500, 600, 700, 800, 900].map((k) => r[k] ?? '#000000');

export const POLE_PALETTE: PolePalette = {
  accent: ramp(color.accentRamp),
  neutral: ramp(color.neutral),
  bg: color.bg,
};

/** Klatka pokazywana przy „Ogranicz ruch” (tancerka w odwróconej pozycji – rozpoznawalna sylwetka). */
export const STILL_FRAME_T = 2.5;

/**
 * Klatki animacji 24 kl./s (pętla 5,5 s) liczone w JS – bufor 80×70 jest mały, a rysowanie
 * piksel w piksel robi renderer platformy. `version` zmienia się z każdą klatką.
 */
export function usePoleFrames(animated: boolean): { pixels: Uint32Array; version: number } {
  const engine = useMemo(() => new PoleEngine(POLE_PALETTE), []);
  const still = useMemo(() => renderStill(POLE_PALETTE, STILL_FRAME_T), []);
  const [version, setVersion] = useState(0);
  const state = useRef({ t: 0, last: 0, fi: -1 });

  useEffect(() => {
    if (!animated) return;
    let raf = 0;
    const s = state.current;
    const frame = (ts: number) => {
      const now = ts / 1000;
      const dt = s.last ? Math.min(0.1, Math.max(0, now - s.last)) : 0;
      s.last = now;
      s.t += dt;
      const fi = Math.floor(s.t * GRID.fps);
      if (fi !== s.fi) {
        const steps = s.fi < 0 ? 1 : Math.min(3, fi - s.fi);
        s.fi = fi;
        engine.step(fi / GRID.fps, steps);
        setVersion(fi);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [animated, engine]);

  return animated ? { pixels: engine.out, version } : { pixels: still, version: -1 };
}
