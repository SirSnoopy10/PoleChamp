import { fireEvent, renderWithProviders, screen } from '../../test-utils/render';
import { Button } from '../Button';

describe('Button (IMP-203)', () => {
  it('TC-UI-001: etykieta = tekst, rola button, onPress działa', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Utwórz turniej" icon="plus" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Utwórz turniej' });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('TC-UI-001: disabled – opacity 0,45 i brak onPress', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Zapisz" disabled onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Zapisz' });
    expect(button).toBeDisabled();
    expect(button).toHaveStyle({ opacity: 0.45 });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('TC-UI-001: loading – spinner zamiast ikony, busy i blokada', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Zapisz" icon="plus" loading onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Zapisz' });
    expect(screen.getByTestId('button-spinner')).toBeOnTheScreen();
    expect(screen.queryByTestId('icon-plus')).toBeNull();
    expect(button).toBeBusy();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('TC-UI-001: iconRound ma etykietę a11y i strefę dotyku 44 dp', async () => {
    await renderWithProviders(
      <Button
        variant="iconRound"
        roundSize={30}
        icon="x"
        accessibilityLabel="Zamknij"
        onPress={() => undefined}
      />,
    );
    const button = screen.getByRole('button', { name: 'Zamknij' });
    expect(button.props.hitSlop).toEqual({ left: 7, right: 7, top: 7, bottom: 7 });
  });

  it('TC-UI-001: primary bez wypełnienia akcentem, obrys accent', async () => {
    await renderWithProviders(<Button label="Zapisz" />);
    expect(screen.getByRole('button')).toHaveStyle({
      borderColor: '#9184d9',
      backgroundColor: 'transparent',
    });
  });
});
