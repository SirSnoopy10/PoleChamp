import { BackHandler } from 'react-native';
import { act, fireEvent, renderWithProviders, screen } from '../../test-utils/render';
import { Button } from '../Button';
import { ConfirmContent, Sheet, SheetHeader, SheetStep, useSheet, useSheetStep } from '../sheet';

function Harness({ onAction }: { onAction?: () => void }) {
  const sheet = useSheet();
  const { step, setStep } = useSheetStep<'form' | 'confirm'>('form');
  return (
    <>
      <Button label="Otwórz" onPress={sheet.open} />
      <Sheet {...sheet.props} accessibilityLabel="Kryterium">
        <SheetStep stepKey={step}>
          {step === 'form' ? (
            <>
              <SheetHeader title="Technika" />
              <Button label="Usuń kryterium" onPress={() => setStep('confirm')} />
            </>
          ) : (
            <ConfirmContent
              icon="trash"
              title="Usunąć kryterium?"
              actions={
                <>
                  <Button label="Usuń" onPress={onAction} />
                  <Button label="Anuluj" onPress={() => setStep('form')} />
                </>
              }
            />
          )}
        </SheetStep>
      </Sheet>
    </>
  );
}

async function open() {
  await fireEvent.press(screen.getByRole('button', { name: 'Otwórz' }));
  expect(screen.getByTestId('sheet')).toBeOnTheScreen();
}

const settle = () => act(async () => jest.runAllTimers());

describe('Sheet (IMP-206)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('TC-UI-011: zamknięcie przyciskiem „×” odmontowuje arkusz', async () => {
    await renderWithProviders(<Harness />, { reducedMotion: true });
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Zamknij' }));
    await settle();
    expect(screen.queryByTestId('sheet')).toBeNull();
  });

  it('TC-UI-011: zamknięcie tapnięciem tła – po zamknięciu tło nie istnieje (nie blokuje dotyku)', async () => {
    await renderWithProviders(<Harness />, { reducedMotion: true });
    await open();
    await fireEvent.press(screen.getByTestId('sheet-backdrop', { includeHiddenElements: true }));
    await settle();
    expect(screen.queryByTestId('sheet-backdrop', { includeHiddenElements: true })).toBeNull();
  });

  it('TC-UI-011: przycisk wstecz Androida zamyka arkusz', async () => {
    const listeners: (() => boolean)[] = [];
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, handler) => {
      listeners.push(handler as () => boolean);
      return { remove: () => undefined };
    });
    await renderWithProviders(<Harness />, { reducedMotion: true });
    await open();
    let handled = false;
    await act(async () => {
      handled = listeners[listeners.length - 1]!();
    });
    await settle();
    expect(handled).toBe(true);
    expect(screen.queryByTestId('sheet')).toBeNull();
  });

  it('TC-A11Y-011: arkusz jest modalny dla czytnika ekranu', async () => {
    await renderWithProviders(<Harness />, { reducedMotion: true });
    await open();
    expect(screen.getByTestId('sheet')).toHaveProp('accessibilityViewIsModal', true);
    expect(screen.getByRole('header', { name: 'Technika' })).toBeOnTheScreen();
  });

  it('TC-UI-012: drugi krok – Anuluj wraca, Usuń wywołuje akcję', async () => {
    const onAction = jest.fn();
    await renderWithProviders(<Harness onAction={onAction} />, { reducedMotion: true });
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Usuń kryterium' }));
    expect(screen.getByText('Usunąć kryterium?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Anuluj' }));
    expect(screen.getByRole('button', { name: 'Usuń kryterium' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Usuń kryterium' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Usuń' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
