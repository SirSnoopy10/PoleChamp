import * as Sentry from '@sentry/react-native';
import { interactiveScreen, markInteractive } from '../sentry';

jest.mock('@sentry/react-native', () => ({
  ...jest.requireActual<object>('@sentry/react-native'),
  setMeasurement: jest.fn(),
  setTag: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

describe('zimny start – znacznik TTI (IMP-501)', () => {
  it('TC-PERF-001: TTI raportowane raz, z ekranem trybu', () => {
    const measure = jest.mocked(Sentry.setMeasurement);
    const tag = jest.mocked(Sentry.setTag);
    jest.spyOn(performance, 'now').mockReturnValue(1834.4);

    expect(interactiveScreen('org')).toBe('tournaments');
    expect(interactiveScreen('judge')).toBe('profiles');
    expect(interactiveScreen(null)).toBe('mode');

    expect(markInteractive('profiles')).toBe(1834);
    expect(measure).toHaveBeenCalledWith('time_to_interactive', 1834, 'millisecond');
    expect(tag).toHaveBeenCalledWith('tti_screen', 'profiles');
    // Powrót na ekran (np. ponowne zamknięcie splasha) nie nadpisuje pomiaru zimnego startu.
    expect(markInteractive('tournaments')).toBeNull();
    expect(measure).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });
});
