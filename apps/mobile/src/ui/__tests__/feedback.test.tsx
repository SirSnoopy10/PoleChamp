import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, renderWithProviders, screen } from '../../test-utils/render';
import { Banner } from '../Banner';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { toast, TOAST_DURATION_MS } from '../Toast';

describe('Toast, Banner, Dialog (IMP-208)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    toast.reset();
  });
  afterEach(() => jest.useRealTimers());

  it('TC-UI-013: drugi toast zastępuje pierwszy, znika po 2,2 s, ogłoszenie a11y', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await renderWithProviders(<></>);
    await act(async () => toast.success('toasts:changesSaved'));
    expect(screen.getByText('Zapisano zmiany')).toBeOnTheScreen();
    await act(async () => jest.advanceTimersByTime(1000));
    await act(async () => toast.error('toasts:saveFailed'));
    expect(screen.queryByText('Zapisano zmiany')).toBeNull();
    expect(screen.getByText('Nie udało się zapisać. Spróbuj ponownie.')).toBeOnTheScreen();
    expect(screen.getByTestId('icon-warning-circle', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith('Zapisano zmiany');
    expect(announce).toHaveBeenCalledWith('Nie udało się zapisać. Spróbuj ponownie.');
    await act(async () => jest.advanceTimersByTime(TOAST_DURATION_MS));
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('TC-UI-013: ten sam klucz w ciągu 300 ms pokazany raz', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockClear();
    await renderWithProviders(<></>);
    await act(async () => {
      toast.success('toasts:changesSaved');
      toast.success('toasts:changesSaved');
    });
    expect(announce).toHaveBeenCalledTimes(1);
  });

  it('TC-UI-014: warianty banera z ikonami i tekstami z katalogu', async () => {
    const onAction = jest.fn();
    const onPress = jest.fn();
    await renderWithProviders(
      <>
        <Banner variant="locked" />
        <Banner variant="rejected" text="2 oceny nie zostały przyjęte" onPress={onPress} />
        <Banner variant="offline" />
        <Banner variant="emailVerify" onAction={onAction} />
      </>,
    );
    expect(screen.getByText('Kategoria zablokowana — tylko podgląd')).toBeOnTheScreen();
    expect(
      screen.getByText('Brak połączenia — dane mogą być nieaktualne. Zmiany są niedostępne.'),
    ).toBeOnTheScreen();
    for (const icon of ['lock-simple', 'warning-circle', 'cloud-slash']) {
      expect(screen.getByTestId(`icon-${icon}`, { includeHiddenElements: true })).toBeOnTheScreen();
    }
    await fireEvent.press(screen.getByRole('button', { name: '2 oceny nie zostały przyjęte' }));
    expect(onPress).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Wyślij kod ponownie' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('TC-UI-015: dialog tabletu – tytuł, treść, akcje do prawej', async () => {
    await renderWithProviders(
      <Dialog
        visible
        onClose={() => undefined}
        title="Wylogować się?"
        text="Masz 2 niewysłane oceny."
        actions={
          <>
            <Button variant="secondary" label="Anuluj" />
            <Button label="Wyloguj" />
          </>
        }
      />,
    );
    expect(screen.getByRole('header', { name: 'Wylogować się?' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Anuluj' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Wyloguj' })).toBeOnTheScreen();
    expect(screen.getByTestId('dialog')).toHaveProp('accessibilityViewIsModal', true);
  });
});
