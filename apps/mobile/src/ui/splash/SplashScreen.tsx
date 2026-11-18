import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { color, motion } from '@polechamp/tokens';
import { useT } from '../../i18n';
import type { AppMode } from '../../mode/mode';
import { Brand } from '../Brand';
import { useReducedMotion } from '../motion';
import { Text } from '../Text';

/** Etapy ładowania (logika etapów – IMP-254 / IMP-302). */
export const SPLASH_STAGES = {
  org: ['loadingTournaments', 'syncingResults', 'ready'],
  judge: ['connecting', 'loadingStartLists', 'ready'],
} as const;
export type SplashStage = (typeof SPLASH_STAGES)[AppMode][number];

/** Splash pokazywany co najmniej 1,2 s i najwyżej 4,3 s (IMP-211 krok 4). */
export const SPLASH_MIN_MS = 1200;
export const SPLASH_MAX_MS = 4300;

export interface SplashScreenProps {
  mode: AppMode;
  stage: SplashStage;
  /** Po animacji wyjścia (0,5 s) – nawigacja do pierwszego ekranu. */
  onFinish?: () => void;
  /** Pierwsza klatka narysowana – moment na `SplashScreen.hideAsync()` (natywny splash). */
  onReady?: () => void;
}

/** Wejście elementów 2–4: uniesienie z przenikaniem 0,6 s z opóźnieniem (motion.splashRise). */
const rise = (delay: number, reduced: boolean) =>
  reduced ? undefined : FadeInUp.duration(motion.splashRise.duration).delay(delay);

/** SCR-ORG-00 / SCR-JDG-00 – animowany splash (IMP-211). */
export function SplashScreen({ mode, stage, onFinish, onReady }: SplashScreenProps) {
  const t = useT();
  const reduced = useReducedMotion();
  const started = useRef(Date.now());
  const stages = SPLASH_STAGES[mode] as readonly SplashStage[];
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);
  const [finished, setFinished] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const index = Math.max(0, stages.indexOf(stage));
  const target = stage === 'ready' ? 1 : (index + 1) / stages.length;

  useEffect(() => {
    progress.value = withTiming(target, {
      duration: reduced ? 0 : 600,
      easing: Easing.bezier(0.4, 0.1, 0.3, 1),
    });
  }, [target, reduced, progress]);

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), SPLASH_MAX_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (finished || (stage !== 'ready' && !timedOut)) return;
    const wait = Math.max(0, SPLASH_MIN_MS - (Date.now() - started.current));
    const id = setTimeout(() => {
      setFinished(true);
      const done = () => onFinish?.();
      const ms = reduced ? 0 : motion.splashExit.duration;
      if (!ms) return done();
      opacity.value = withTiming(0, { duration: ms }, (ok) => {
        if (ok) scheduleOnRN(done);
      });
    }, wait);
    return () => clearTimeout(id);
  }, [stage, timedOut, finished, reduced, onFinish, opacity]);

  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const message = t(`splash.${stage}`);
  const glow = mode === 'judge' ? 520 : 420;

  return (
    <Animated.View testID="splash" style={[StyleSheet.absoluteFill, styles.root, fade]} onLayout={onReady}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient
              id="splashGlow"
              cx="50%"
              cy="38%"
              rx={glow / 2}
              ry={glow / 2}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={color.mix.glowAccent900_70} stopOpacity={1} />
              <Stop offset="0.7" stopColor={color.accentRamp[900]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#splashGlow)" />
        </Svg>
      </View>
      {/* Wersja 1.0: bez animacji tancerki (PoleSpinner zostaje w kodzie i w DevCatalog). */}
      <Animated.View entering={rise(motion.splashRise.delays[0], reduced)} style={styles.brand}>
        <Brand />
        <Text variant="bodyS" color={color.neutral[400]} style={styles.tagline}>
          {t(mode === 'judge' ? 'splash.taglineJudge' : 'splash.taglineOrg')}
        </Text>
      </Animated.View>
      <Animated.View entering={rise(motion.splashRise.delays[1], reduced)} style={styles.progress}>
        <View
          style={styles.track}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Animated.View style={[styles.fill, bar]} />
        </View>
        <Text
          testID="splash-message"
          variant="caption"
          color={color.neutral[400]}
          accessibilityLiveRegion="polite"
          style={styles.message}
        >
          {message}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  brand: { alignItems: 'center', gap: 8 },
  tagline: { fontSize: 13.5 },
  progress: { alignItems: 'center', gap: 10 },
  track: { width: 160, height: 3, borderRadius: 2, backgroundColor: color.neutral[800], overflow: 'hidden' },
  fill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: color.accent,
    shadowColor: color.accent,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  message: { height: 16, lineHeight: 16 },
});
