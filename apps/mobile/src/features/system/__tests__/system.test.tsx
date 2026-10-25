import { useState } from 'react';
import * as RN from 'react-native';
import { TextInput } from 'react-native';
import { act, fireEvent, renderWithProviders, screen } from '../../../test-utils/render';
import { readStoredMode, ModeProvider, useMode } from '../../../mode/mode';
import { deviceCapabilities } from '../deviceCapabilities';
import { ModeScreen } from '../ModeScreen';
import { needsRotation, OrientationGuard } from '../OrientationGuard';
import { orientationPolicy } from '../orientation';

const PHONE = { supportsJudge: false, isTablet: false };
const TABLET = { supportsJudge: true, isTablet: true };

async function mockWindow(width: number, height: number) {
  const size = { width, height, scale: 2, fontScale: 1 };
  await act(async () => RN.Dimensions.set({ window: size, screen: size }));
}

describe('SCR-SYS-01, forma urządzenia i orientacja (IMP-213)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('TC-STATE-016: deviceCapabilities i nakładka orientacji', () => {
    expect(deviceCapabilities({ width: 393, height: 852 }).supportsJudge).toBe(false);
    expect(deviceCapabilities({ width: 820, height: 1180 }).supportsJudge).toBe(true);
    expect(deviceCapabilities({ width: 600, height: 960 })).toEqual({ supportsJudge: false, isTablet: true });
    expect(needsRotation(900, 600)).toBe(true);
    expect(needsRotation(1180, 820)).toBe(false);
    expect(needsRotation(820, 1180)).toBe(true);
  });

  it('polityka orientacji: telefon organizatora pion, sędzia poziom, tablet organizatora bez blokady', () => {
    expect(orientationPolicy('org', false)).toBe('portrait');
    expect(orientationPolicy('org', true)).toBe('free');
    expect(orientationPolicy('judge', true)).toBe('landscape');
  });

  it('TC-E2E-JDG-029 (komponent): na telefonie karta tabletu nieaktywna z podpisem', async () => {
    const onSelect = jest.fn();
    await renderWithProviders(<ModeScreen onSelect={onSelect} capabilities={PHONE} />, { mode: null });
    expect(screen.getByText('Jak będziesz używać tego urządzenia?')).toBeOnTheScreen();
    expect(screen.getByText('Panel sędziego wymaga tabletu.')).toBeOnTheScreen();
    const judge = screen.getByRole('button', { name: /Tablet sędziowski/ });
    expect(judge).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: /Jestem organizatorem/ }));
    expect(onSelect).toHaveBeenCalledWith('org');
  });

  it('TC-E2E-ORG-001 (komponent): wybór trybu zapisany w MMKV i odczytany przy kolejnym starcie', async () => {
    function Harness() {
      const { mode, setMode } = useMode();
      return mode ? (
        <RN.Text>{`tryb:${mode}`}</RN.Text>
      ) : (
        <ModeScreen onSelect={setMode} capabilities={TABLET} />
      );
    }
    const { unmount } = await renderWithProviders(
      <ModeProvider>
        <Harness />
      </ModeProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: /Tablet sędziowski/ }));
    expect(screen.getByText('tryb:judge')).toBeOnTheScreen();
    expect(readStoredMode()).toBe('judge');
    await unmount();
    await renderWithProviders(
      <ModeProvider>
        <Harness />
      </ModeProvider>,
    );
    expect(screen.getByText('tryb:judge')).toBeOnTheScreen();
  });

  it('TC-UI-030: nakładka przy 900×1200, znika po 1180×820, stan formularza zachowany', async () => {
    function Form() {
      const [v, setV] = useState('');
      return <TextInput testID="field" value={v} onChangeText={setV} />;
    }
    await mockWindow(900, 1200);
    const { rerender } = await renderWithProviders(
      <OrientationGuard>
        <Form />
      </OrientationGuard>,
      { mode: 'judge' },
    );
    expect(screen.getByText('Obróć tablet do pozycji poziomej.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('field', { includeHiddenElements: true }), '8,5');
    await mockWindow(1180, 820);
    await rerender(
      <OrientationGuard>
        <Form />
      </OrientationGuard>,
    );
    expect(screen.queryByTestId('orientation-overlay')).toBeNull();
    expect(screen.getByTestId('field')).toHaveDisplayValue('8,5');
  });

  it('organizator nie dostaje nakładki orientacji', async () => {
    await mockWindow(390, 844);
    await renderWithProviders(<OrientationGuard>{null}</OrientationGuard>, { mode: 'org' });
    expect(screen.queryByTestId('orientation-overlay')).toBeNull();
  });
});
