import { act, renderWithProviders, screen } from '../../test-utils/render';
import { GRID, PoleEngine, pose, renderStill } from '../splash/pole-engine';
import { SPLASH_MIN_MS, SplashScreen } from '../splash/SplashScreen';
import { POLE_PALETTE } from '../splash/usePoleFrames';

describe('splash (IMP-211)', () => {
  it('silnik rysuje sylwetkę na siatce 80×70 i jest deterministyczny przy tej samej losowości', () => {
    const a = new PoleEngine(POLE_PALETTE, () => 0.3);
    const b = new PoleEngine(POLE_PALETTE, () => 0.3);
    for (let f = 0; f < 30; f++) {
      a.step(f / GRID.fps, 1);
      b.step(f / GRID.fps, 1);
    }
    expect(a.out).toHaveLength(GRID.width * GRID.height);
    expect(Array.from(a.out)).toEqual(Array.from(b.out));
    expect(new Set(a.out).size).toBeGreaterThan(8);
  });

  it('obrót z hakiem: dłoń trzyma rurę, biodra w zasięgu ręki, stopy nad sceną (wariant „klub”, 10.11.2026)', () => {
    for (let t = 1; t <= 2.6; t += 1 / GRID.fps) {
      const s = pose(t);
      expect(Math.abs(s.grip[0] - GRID.poleX)).toBeLessThanOrEqual(1);
      // Ramię z przedramieniem to ok. 16 px – biodra dalej oznaczałyby ciało oderwane od rury.
      expect(s.reach).toBeLessThanOrEqual(10);
      for (const f of s.feet) expect(GRID.floorY - f[1]).toBeGreaterThanOrEqual(2);
    }
  });

  it('pętla zamyka się bez skoku, a na jej początku tancerka stoi na scenie', () => {
    const a = pose(0);
    const b = pose(GRID.loop);
    for (const [p, q] of [
      [a.hips, b.hips],
      [a.head, b.head],
      [a.grip, b.grip],
      [a.feet[0], b.feet[0]],
      [a.feet[1], b.feet[1]],
    ] as const) {
      expect(q[0]).toBeCloseTo(p[0], 3);
      expect(q[1]).toBeCloseTo(p[1], 3);
    }
    for (const f of a.feet) expect(Math.abs(GRID.floorY - f[1])).toBeLessThanOrEqual(1.5);
  });

  it('sylwetka mieści się w kadrze 80×70 przez całą pętlę', () => {
    for (let t = 0; t <= GRID.loop; t += 1 / GRID.fps) {
      const s = pose(t);
      for (const p of [s.hips, s.head, s.grip, ...s.feet]) {
        expect(p[0]).toBeGreaterThanOrEqual(4);
        expect(p[0]).toBeLessThanOrEqual(GRID.width - 4);
        expect(p[1]).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('TC-DESIGN-016/019: statyczna klatka jest powtarzalna (źródło wzorca zrzutu)', () => {
    expect(Array.from(renderStill(POLE_PALETTE, 1.6))).toEqual(Array.from(renderStill(POLE_PALETTE, 1.6)));
  });

  it('TC-UI-017: splash 1.0 bez animacji tancerki, komunikat etapu dla czytnika', async () => {
    await renderWithProviders(<SplashScreen mode="org" stage="loadingTournaments" />, {
      reducedMotion: true,
    });
    expect(screen.queryByTestId('pole-spinner-still')).toBeNull();
    expect(screen.queryByTestId('pole-spinner')).toBeNull();
    const message = screen.getByTestId('splash-message');
    expect(message).toHaveTextContent('Wczytywanie turniejów…');
    expect(message).toHaveProp('accessibilityLiveRegion', 'polite');
  });

  it('splash trwa co najmniej 1,2 s także przy natychmiastowym „ready”', async () => {
    jest.useFakeTimers();
    const onFinish = jest.fn();
    await renderWithProviders(<SplashScreen mode="judge" stage="ready" onFinish={onFinish} />, {
      reducedMotion: true,
    });
    expect(screen.getByText('Panel sędziego')).toBeOnTheScreen();
    await act(async () => jest.advanceTimersByTime(SPLASH_MIN_MS - 100));
    expect(onFinish).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(200));
    expect(onFinish).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
