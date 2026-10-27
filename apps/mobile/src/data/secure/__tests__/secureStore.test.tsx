import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import { PinPad } from '../../../ui/pin/PinPad';
import { render, screen } from '../../../test-utils/render';
import { tokenStore } from '../../api/tokens';
import { saveDeviceCredentials, clearDeviceCredentials } from '../../auth/deviceAuth';
import { copySecret, SECRET_CLIPBOARD_TTL_MS } from '../clipboard';
import { SECURE_OPTIONS } from '../secureStore';

jest.mock('expo-clipboard', () => {
  let value = '';
  return {
    setStringAsync: jest.fn(async (v: string) => {
      value = v;
      return true;
    }),
    getStringAsync: jest.fn(async () => value),
  };
});

const setItem = SecureStore.setItemAsync as jest.Mock;

describe('IMP-402: przechowywanie na urządzeniach', () => {
  afterEach(async () => {
    await clearDeviceCredentials();
    tokenStore.reset();
    setItem.mockClear();
    jest.useRealTimers();
  });

  it('TC-SEC-016: tokeny, sekret i pepper zapisywane z AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY, bez biometrii', async () => {
    expect(SECURE_OPTIONS).toEqual({
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      requireAuthentication: false,
    });
    await saveDeviceCredentials({
      deviceId: 'd1',
      deviceSecret: 's'.repeat(43),
      pinPepper: 'p'.repeat(44),
      tournament: { id: 't1', name: 'Puchar' },
    });
    await tokenStore.setOrg({ accessToken: 'a', refreshToken: 'r' });
    await tokenStore.setDevice('dev');
    expect(setItem.mock.calls.length).toBeGreaterThanOrEqual(6);
    for (const [, , options] of setItem.mock.calls) expect(options).toBe(SECURE_OPTIONS);
  });

  it('TC-SEC-020: PIN skopiowany świadomie znika ze schowka po 60 s', async () => {
    jest.useFakeTimers();
    await copySecret('8306');
    expect(await Clipboard.getStringAsync()).toBe('8306');
    jest.advanceTimersByTime(SECRET_CLIPBOARD_TTL_MS);
    await Promise.resolve();
    await Promise.resolve();
    expect(await Clipboard.getStringAsync()).toBe('');
  });

  it('TC-SEC-020: późniejsza zawartość schowka nie jest kasowana', async () => {
    jest.useFakeTimers();
    await copySecret('4719');
    await Clipboard.setStringAsync('inny tekst');
    jest.advanceTimersByTime(SECRET_CLIPBOARD_TTL_MS);
    await Promise.resolve();
    await Promise.resolve();
    expect(await Clipboard.getStringAsync()).toBe('inny tekst');
  });

  it('TC-SEC-020: klawisze PIN odrzucają dotyki przy nakładce (filterTouchesWhenObscured)', async () => {
    await render(<PinPad onDigit={() => undefined} onBackspace={() => undefined} />);
    for (const id of ['pin-key-1', 'pin-key-0', 'pin-key-back']) {
      expect(screen.getByTestId(id).props.filterTouchesWhenObscured).toBe(true);
    }
  });
});
