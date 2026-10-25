import { Linking } from 'react-native';
import { act, fireEvent, renderWithProviders, screen } from '../../../test-utils/render';
import { compareVersions, updateSignal } from '../../../data/api/app-version';
import { storeUrl, UpdateRequired } from '../UpdateRequired';

describe('wymuszona aktualizacja (IMP-217)', () => {
  afterEach(() => updateSignal.reset());

  it('porównanie wersji', () => {
    expect(compareVersions('1.2.0', '1.10.0')).toBeLessThan(0);
    expect(compareVersions('2.0', '2.0.0')).toBe(0);
    expect(compareVersions('2.1.3', '2.1.2')).toBeGreaterThan(0);
  });

  it('TC-SYNC-034: minAppVersion > wersja, minSyncAppVersion ≤ wersja – aktualizacja, outbox działa', async () => {
    updateSignal.report({ minAppVersion: '9.0.0', minSyncAppVersion: '0.1.0' }, '1.0.0');
    expect(updateSignal.getState()).toMatchObject({ updateRequired: true, syncBlocked: false });
    await renderWithProviders(<UpdateRequired unsentCount={3} />);
    expect(screen.getByRole('header', { name: 'Zaktualizuj aplikację' })).toBeOnTheScreen();
    expect(screen.getByTestId('update-sync')).toHaveTextContent('Niewysłane oceny są nadal wysyłane w tle.');
  });

  it('poniżej minSyncAppVersion – liczba niewysłanych ocen i instrukcja', async () => {
    await act(async () =>
      updateSignal.report({ minAppVersion: '9.0.0', minSyncAppVersion: '9.0.0' }, '1.0.0'),
    );
    await renderWithProviders(<UpdateRequired unsentCount={2} />);
    expect(screen.getByTestId('update-sync')).toHaveTextContent(/Masz 2 niewysłane oceny/);
  });

  it('przycisk otwiera sklep platformy', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderWithProviders(<UpdateRequired />);
    await fireEvent.press(screen.getByRole('button', { name: 'Zaktualizuj aplikację' }));
    expect(open).toHaveBeenCalledWith(storeUrl());
    expect(storeUrl('android')).toContain('app.polechamp');
  });
});
