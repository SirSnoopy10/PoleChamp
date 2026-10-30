import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, layout } from '@polechamp/tokens';
import { env } from '../../config/env';
import { readJudge, readTournament } from '../../data/judge/queries';
import { judgeRuntime } from '../../data/judge/runtime';
import { endActiveSession } from '../../data/judge/session';
import { useLocalQuery } from '../../data/judge/useLocalQuery';
import { useT } from '../../i18n';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { BackLink } from '../../ui/layout/ScreenHeader';
import { ScreenGlow } from '../../ui/layout/ScreenGlow';
import { PIN_LENGTH, PinDots } from '../../ui/pin/PinDots';
import { PinPad } from '../../ui/pin/PinPad';
import { Text } from '../../ui/Text';
import { useCountdown } from '../auth/useCountdown';
import { JudgeAuth, type LoginResult } from './auth/JudgeAuth';
import { JudgeTitleBlock } from './ProfilePicker';
import { MEDIUM } from './styles';

/** Odstęp między 4. cyfrą a weryfikacją (SCR-JDG-02). */
export const VERIFY_DELAY_MS = 160;
/** Po tym czasie weryfikacji kropki pulsują (SCR-JDG-08). */
export const PULSE_AFTER_MS = 500;
/** Pobieranie zmian na ekranie blokady do resetu. */
export const LOCKED_PULL_MS = 10_000;

type Message = { key: string; params?: Record<string, number> } | null;

const MESSAGE: Partial<Record<LoginResult['kind'], string>> = {
  invalid: 'errors:PIN_INVALID',
  needsOnline: 'judge:pin.needsOnline',
  inactive: 'errors:JUDGE_INACTIVE',
  revoked: 'errors:DEVICE_REVOKED',
};

/**
 * SCR-JDG-02 – PIN (IMP-304/305): 4 cyfry tylko w `useRef`, weryfikacja 160 ms po 4. cyfrze,
 * błąd z potrząśnięciem kropek, stany SCR-JDG-08 (blokada czasowa z odliczaniem, blokada do resetu,
 * brak sieci > 24 h, pulsowanie > 500 ms). `reauth` – powrót po przerwie: bez „Zmień sędziego”, z „Wyloguj”.
 */
export function PinScreen({ judgeId, reauth = false }: { judgeId: string; reauth?: boolean }) {
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const judge = useLocalQuery((db) => readJudge(db, judgeId), [judgeId]);
  const tournament = useLocalQuery(readTournament, []);
  const digits = useRef('');
  const [filled, setFilled] = useState(0);
  const [message, setMessage] = useState<Message>(null);
  const [shake, setShake] = useState(0);
  const [checking, setChecking] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [serverLocked, setLockedReset] = useState(false);
  // Profil zablokowany do resetu (10 błędów – serwer) z migawki albo z odpowiedzi logowania.
  const lockedReset = serverLocked || !!judge?.pinLocked;
  const [lockLeft, startLock] = useCountdown(0);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  // Reset PIN-u przez organizatora (nowa `pinVersion` z pull/realtime) zdejmuje blokadę – powrót do
  // klawiatury bez „Zmień sędziego” (UX-34).
  const pinVersion = judge?.pinVersion;
  const seenVersion = useRef(pinVersion);
  useEffect(() => {
    if (pinVersion === undefined || pinVersion === seenVersion.current) return;
    seenVersion.current = pinVersion;
    setLockedReset(false);
    setMessage(null);
  }, [pinVersion]);

  // Blokada do resetu: bez sesji zmiany mogą nie przyjść od razu – własne pobieranie, żeby nowy PIN
  // od organizatora zdjął blokadę w kilka sekund (UX2-37).
  useEffect(() => {
    if (!lockedReset) return;
    const id = setInterval(
      () =>
        void judgeRuntime()
          .engine.pullNow()
          .catch(() => undefined),
      LOCKED_PULL_MS,
    );
    return () => clearInterval(id);
  }, [lockedReset]);

  // Lokalna blokada czasowa zapisana w SQLite – trwa także po restarcie aplikacji (TC-E2E-JDG-006).
  const lockedUntil = judge?.lockedUntil ?? null;
  useEffect(() => {
    if (!lockedUntil) return;
    const left = Date.parse(lockedUntil) - judgeRuntime().clock.now();
    if (left > 0) startLock(left / 1000);
  }, [lockedUntil, startLock]);

  useEffect(() => {
    if (lockLeft === 0 && message?.key === 'errors:PIN_LOCKED') setMessage(null);
  }, [lockLeft, message]);

  const clear = () => {
    digits.current = '';
    setFilled(0);
  };

  const verify = useCallback(async () => {
    const pin = digits.current;
    setChecking(true);
    const pulse = setTimeout(() => mounted.current && setPulsing(true), PULSE_AFTER_MS);
    let result: LoginResult;
    try {
      result = await JudgeAuth.login(judgeRuntime(), judgeId, pin);
    } finally {
      clearTimeout(pulse);
    }
    if (!mounted.current) return;
    setChecking(false);
    setPulsing(false);
    clear();
    if (result.kind === 'ok') return;
    if (result.kind === 'locked') {
      startLock(result.seconds);
      setMessage({ key: 'errors:PIN_LOCKED' });
    } else if (result.kind === 'lockedReset') {
      setLockedReset(true);
      setMessage(null);
    } else if (result.kind === 'invalid' && result.remaining !== undefined) {
      setMessage({ key: 'judge:pin.remaining', params: { count: result.remaining } });
    } else if (result.kind === 'error') {
      setMessage({ key: result.messageKey });
    } else {
      setMessage({ key: MESSAGE[result.kind] ?? 'errors:PIN_INVALID' });
    }
    setShake((n) => n + 1);
  }, [judgeId, startLock]);

  const onDigit = (d: string) => {
    if (checking || digits.current.length >= PIN_LENGTH) return;
    if (message?.key !== 'errors:PIN_LOCKED') setMessage(null);
    digits.current += d;
    setFilled(digits.current.length);
    if (digits.current.length === PIN_LENGTH) setTimeout(() => void verify(), VERIFY_DELAY_MS);
  };
  const onBackspace = () => {
    if (checking) return;
    if (message?.key !== 'errors:PIN_LOCKED') setMessage(null);
    digits.current = digits.current.slice(0, -1);
    setFilled(digits.current.length);
  };

  const logout = async () => {
    const rt = judgeRuntime();
    await endActiveSession(rt.local, rt.clock.now());
  };

  const locked = lockLeft > 0;
  const shown: Message = locked ? { key: 'errors:PIN_LOCKED', params: { s: lockLeft } } : message;

  return (
    <View testID="pin-screen" style={styles.root}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + layout[48] }]}>
        <JudgeTitleBlock tournamentName={tournament?.name ?? ''} />
        <View style={styles.who}>
          <Avatar name={judge?.fullName ?? ''} initials={judge?.initials} size={44} />
          <View>
            <Text variant="body" style={MEDIUM}>
              {judge?.fullName ?? ''}
            </Text>
            {lockedReset ? null : (
              <Text variant="caption" color={color.neutral[400]}>
                {t('judge:pin.hint')}
              </Text>
            )}
          </View>
        </View>
        {lockedReset ? (
          <Icon name="lock-simple" size={24} color={color.accentRamp[300]} testID="pin-locked-icon" />
        ) : (
          <PinDots filled={filled} shakeKey={shake} pulsing={pulsing} />
        )}
        <View style={styles.message} accessibilityLiveRegion="assertive">
          {lockedReset ? (
            <Text variant="meta" color={color.accentRamp[300]} testID="pin-message">
              {t('errors:PIN_LOCKED_requiresReset')}
            </Text>
          ) : checking ? (
            <Text variant="meta" color={color.neutral[300]} testID="pin-verifying">
              {t('judge:pin.verifying')}
            </Text>
          ) : shown ? (
            <View style={styles.messageRow}>
              <Icon name="warning-circle" size={15} color={color.accentRamp[300]} />
              <Text variant="meta" color={color.accentRamp[300]} testID="pin-message">
                {t(shown.key as never, shown.params)}
              </Text>
            </View>
          ) : null}
        </View>
        {lockedReset ? null : (
          <PinPad onDigit={onDigit} onBackspace={onBackspace} disabled={locked || checking} />
        )}
        {reauth ? (
          <Button
            variant="ghost"
            label={t('judge:pin.logout')}
            onPress={() => void logout()}
            testID="pin-logout"
          />
        ) : (
          <BackLink label={t('judge:pin.changeJudge')} onPress={() => router.replace('/profiles')} />
        )}
        {env.demoBuild && env.demoPins ? (
          <Text variant="caption" color={color.neutral[500]} testID="pin-demo">
            {t('judge:pin.demo', { pins: env.demoPins })}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  content: {
    alignItems: 'center',
    gap: layout[18],
    paddingHorizontal: layout[28],
    paddingBottom: layout[48],
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: layout[12] },
  message: { height: 18, justifyContent: 'center' },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: layout[6] },
});
