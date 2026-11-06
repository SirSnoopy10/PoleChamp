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

  it('wejście i zejście z odwrócenia blisko rury – bez ciała wyrzuconego w bok (próba 6.11.2026)', () => {
    const POLE_X = GRID.width / 2;
    for (const [from, to] of [
      [1.35, 2.3],
      [2.8, 3.9],
    ] as const) {
      let legs = 0;
      let hips = 0;
      for (let t = from; t <= to; t += 1 / GRID.fps) {
        const s = pose(t);
        hips = Math.max(hips, Math.abs(s.P[0] - POLE_X));
        for (const p of [s.lN.m, s.lN.e, s.lF.m, s.lF.e]) legs = Math.max(legs, Math.abs(p[0] - POLE_X));
      }
      // Poprzednia choreografia: nogi do 33,5 px, biodra do 19,5 px od rury przy zejściu.
      expect(legs).toBeLessThanOrEqual(17);
      expect(hips).toBeLessThanOrEqual(8);
    }
  });

  it('TC-DESIGN-016/019: statyczna klatka jest powtarzalna (źródło wzorca zrzutu)', () => {
    expect(Array.from(renderStill(POLE_PALETTE, 2.5))).toEqual(Array.from(renderStill(POLE_PALETTE, 2.5)));
  });

  it('TC-UI-017: „Ogranicz ruch” – statyczna klatka i komunikat etapu dla czytnika', async () => {
    await renderWithProviders(<SplashScreen mode="org" stage="loadingTournaments" />, {
      reducedMotion: true,
    });
    expect(screen.getByTestId('pole-spinner-still')).toBeOnTheScreen();
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
