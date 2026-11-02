import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { Text } from './Text';
import { useReducedMotion } from './motion';
import { useTheme } from './theme/ThemeProvider';

/** Odstęp toastu od górnej krawędzi bezpiecznego obszaru – nie zasłania treści ani paska akcji (UX2-30). */
const TOAST_OFFSET = 8;

export type ToastVariant = 'success' | 'error' | 'info';
type Params = Record<string, string | number>;

export interface ToastMessage {
  id: number;
  variant: ToastVariant;
  /** Klucz i18n `ns:klucz` (katalog toastów – 09-design-system §6). */
  key: string;
  params?: Params;
}

export const TOAST_DURATION_MS = 2200;
const DEDUPE_MS = 300;

let current: ToastMessage | null = null;
let lastShown: { key: string; at: number } | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit(next: ToastMessage | null) {
  current = next;
  listeners.forEach((l) => l());
}

function show(variant: ToastVariant, key: string, params?: Params) {
  const now = Date.now();
  // Ten sam klucz w ciągu 300 ms (np. podwójne tapnięcie) nie pokazuje drugiego toastu.
  if (lastShown && lastShown.key === key && now - lastShown.at < DEDUPE_MS) return;
  lastShown = { key, at: now };
  emit({ id: nextId++, variant, key, params });
}

/** API toastów (IMP-208): nowy toast zastępuje poprzedni. */
export const toast = {
  success: (key: string, params?: Params) => show('success', key, params),
  error: (key: string, params?: Params) => show('error', key, params),
  info: (key: string, params?: Params) => show('info', key, params),
  hide: () => emit(null),
  /** Tylko testy: czyści stan modułu. */
  reset: () => {
    lastShown = null;
    emit(null);
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Host toastów w root layoutcie: kapsuła 28 dp nad dolną krawędzią safe area. */
export function ToastHost() {
  const message = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!message) return;
    const label = String(t(message.key as never, message.params as never));
    setText(label);
    AccessibilityInfo.announceForAccessibility(label);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => emit(null), TOAST_DURATION_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [message, t]);

  if (!message) return null;
  const success = message.variant === 'success';
  const duration = reduced ? 0 : theme.motion.toast.duration;
  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + TOAST_OFFSET }]}>
      <Animated.View
        key={message.id}
        entering={FadeIn.duration(duration)}
        exiting={FadeOut.duration(duration)}
        testID="toast"
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          styles.toast,
          theme.shadow.md,
          { backgroundColor: theme.color.surface, borderRadius: theme.radius.lg },
        ]}
      >
        <Icon
          name={success ? 'check-circle' : message.variant === 'error' ? 'warning-circle' : 'info'}
          weight={success ? 'fill' : 'regular'}
          color={success ? theme.color.accent : theme.color.accentRamp[300]}
          size={18}
        />
        <Text variant="bodyS" numberOfLines={4} style={styles.text}>
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 11,
    paddingBottom: 11,
    paddingLeft: 14,
    paddingRight: 18,
    maxWidth: 440,
  },
  /** Zawijanie zamiast wyjścia poza ekran (UX-18). */
  text: { fontSize: 13.5, lineHeight: 18, flexShrink: 1 },
});
