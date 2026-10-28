import { useState } from 'react';
import { z } from 'zod';
import { act, fireEvent, renderHook, renderWithProviders, screen } from '../../test-utils/render';
import {
  ChoiceChipGroup,
  DateRangeField,
  NumberField,
  TextArea,
  TextField,
  useZodForm,
  type DateRange,
} from '../form';

function WeightField() {
  const [value, setValue] = useState<number | null>(1);
  const [text, setText] = useState('1');
  const valid = value !== null && Number.isInteger(value * 2);
  return (
    <>
      <NumberField
        label="Waga"
        value={value}
        testID="weight"
        error={value !== null && !valid ? 'Wartość musi być wielokrotnością 0,5.' : undefined}
        stepper={{ min: 0.5, max: 5 }}
        onChange={(v, t) => {
          setValue(v);
          setText(t);
        }}
      />
      <TextField label="Echo" testID="echo" value={`${value ?? ''}|${text}`} />
    </>
  );
}

describe('pola formularzy (IMP-207)', () => {
  it('TC-UI-007: grupa chipów – jeden wybrany, radio z checked, disabled bez zmiany', async () => {
    const onChange = jest.fn();
    const options = [
      { value: 'sport', label: 'Pole Sport' },
      { value: 'exotic', label: 'Exotic' },
    ] as const;
    const { rerender } = await renderWithProviders(
      <ChoiceChipGroup label="Styl" testID="styl" options={options} value="sport" onChange={onChange} />,
    );
    expect(screen.getByTestId('styl')).toHaveProp('accessibilityRole', 'radiogroup');
    expect(screen.getByRole('radio', { name: 'Pole Sport' })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: 'Exotic' }));
    expect(onChange).toHaveBeenCalledWith('exotic');
    onChange.mockClear();
    await rerender(
      <ChoiceChipGroup
        label="Styl"
        testID="styl"
        options={options}
        value="sport"
        onChange={onChange}
        disabled
      />,
    );
    expect(screen.getByTestId('styl')).toHaveStyle({ opacity: 0.45 });
    expect(screen.getByRole('radio', { name: 'Exotic' })).toBeDisabled();
  });

  it('TC-UI-008: TextField – błąd pod polem, obrys accent-300, w spoczynku neutral-600', async () => {
    const { rerender } = await renderWithProviders(<TextField label="Nazwa turnieju" testID="name" />);
    expect(screen.getByTestId('name')).toHaveStyle({ borderColor: '#75798c' });
    const error = 'Podaj nazwę turnieju (min. 3 znaki).';
    await rerender(<TextField label="Nazwa turnieju" testID="name" error={error} />);
    expect(screen.getByText(error)).toBeOnTheScreen();
    expect(screen.getByTestId('name')).toHaveStyle({ borderColor: '#d2cefd' });
    expect(screen.getByTestId('name')).toHaveProp('accessibilityHint', error);
    expect(screen.getByTestId('icon-warning-circle', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('TC-UI-009: NumberField – przecinek, kropka, błąd kroku, granice steppera', async () => {
    await renderWithProviders(<WeightField />);
    const input = screen.getByTestId('weight');
    await fireEvent.changeText(input, '1,5');
    expect(screen.getByTestId('echo')).toHaveDisplayValue('1.5|1,5');
    await fireEvent.changeText(input, '1.5');
    expect(screen.getByTestId('echo')).toHaveDisplayValue('1.5|1.5');
    await fireEvent.changeText(input, '1,3');
    expect(screen.getByText('Wartość musi być wielokrotnością 0,5.')).toBeOnTheScreen();
    await fireEvent.changeText(input, '0,5');
    const minus = screen.getByRole('button', { name: 'Zmniejsz: Waga' });
    expect(minus).toBeDisabled();
    await fireEvent.changeText(input, '4,5');
    await fireEvent.press(screen.getByRole('button', { name: 'Zwiększ: Waga' }));
    expect(screen.getByTestId('echo')).toHaveDisplayValue('5|5');
    expect(screen.getByRole('button', { name: 'Zwiększ: Waga' })).toBeDisabled();
  });

  it('TC-UI-010: TextArea – licznik od 400, maks. 500, nadmiar obcięty', async () => {
    function Harness() {
      const [v, setV] = useState('');
      return <TextArea label="Komentarz" value={v} onChangeText={setV} testID="c" />;
    }
    await renderWithProviders(<Harness />);
    const input = screen.getByTestId('c');
    await fireEvent.changeText(input, 'a'.repeat(399));
    expect(screen.queryByTestId('c-counter')).toBeNull();
    await fireEvent.changeText(input, 'a'.repeat(400));
    expect(screen.getByText('400/500')).toBeOnTheScreen();
    await fireEvent.changeText(input, 'a'.repeat(501));
    expect(screen.getByText('500/500')).toBeOnTheScreen();
    expect(input.props.value).toHaveLength(500);
  });

  it('TC-UI-027: pole daty – jeden dzień, zakres, czyszczenie', async () => {
    function Harness() {
      const [v, setV] = useState<DateRange>({ start: null, end: null });
      return <DateRangeField label="Data" value={v} onChange={setV} placeholder="Data do ustalenia" />;
    }
    await renderWithProviders(<Harness />);
    const set = async (date: Date) => {
      const picker = screen.getByTestId('date-range-picker');
      await fireEvent(picker, 'change', { nativeEvent: { timestamp: date.getTime() } });
    };
    await fireEvent.press(screen.getByTestId('date-range-open'));
    await set(new Date(2027, 3, 18));
    expect(screen.getByTestId('date-range-value')).toHaveTextContent('18 kwietnia 2027');

    await fireEvent.press(screen.getByRole('radio', { name: 'Kilka dni' }));
    expect(screen.getByTestId('date-range-end-value')).toHaveTextContent('Data zakończenia');
    await fireEvent.press(screen.getByTestId('date-range-open'));
    await set(new Date(2026, 9, 3));
    expect(screen.getByTestId('date-range-value')).toHaveTextContent('3 października 2026');
    await fireEvent.press(screen.getByTestId('date-range-end-open'));
    await set(new Date(2026, 9, 4));
    expect(screen.getByTestId('date-range-end-value')).toHaveTextContent('4 października 2026');

    // Nowy początek po końcu – koniec wyczyszczony.
    await fireEvent.press(screen.getByTestId('date-range-open'));
    await set(new Date(2026, 9, 10));
    expect(screen.getByTestId('date-range-end-value')).toHaveTextContent('Data zakończenia');

    await fireEvent.press(screen.getByRole('button', { name: 'Wyczyść datę' }));
    expect(screen.getByTestId('date-range-value')).toHaveTextContent('Data do ustalenia');
  });

  it('useZodForm: kody pól → teksty PL, błędy API na polach', async () => {
    const schema = z.object({ startNumber: z.number({ error: 'REQUIRED' }) });
    const { result } = await renderHook(() => useZodForm(schema));
    await act(async () => {
      await result.current.trigger();
    });
    expect(result.current.fieldError('startNumber')).toBe('To pole jest wymagane.');
    await act(async () => result.current.applyApiErrors([{ field: 'startNumber', code: 'OUT_OF_RANGE' }]));
    expect(result.current.fieldError('startNumber')).toBe('Wartość spoza zakresu {min}–{max}.');
  });
});
