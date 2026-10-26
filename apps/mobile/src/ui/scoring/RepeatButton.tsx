import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { color } from '@polechamp/tokens';
import { Icon, type IconName } from '../Icon';

/** Powtarzanie przy przytrzymaniu (SCR-JDG-05): pierwsze po 400 ms, potem co 150 ms. */
export const REPEAT_DELAY_MS = 400;
export const REPEAT_INTERVAL_MS = 150;

export interface RepeatButtonProps {
  icon: IconName;
  size: 40 | 44;
  onStep: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  testID?: string;
}

/** Okrągły przycisk −/+ (tło bg, obrys divider) ze strefą dotyku ≥ 44 dp (G-27) i powtarzaniem. */
export function RepeatButton({
  icon,
  size,
  onStep,
  disabled = false,
  accessibilityLabel,
  testID,
}: RepeatButtonProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const step = useRef(onStep);
  step.current = onStep;
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);

  const repeat = () => {
    timer.current = setTimeout(() => {
      step.current();
      repeat();
    }, REPEAT_INTERVAL_MS);
  };
  const slop = Math.max(0, (44 - size) / 2);
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={onStep}
      onLongPress={() => {
        step.current();
        repeat();
      }}
      delayLongPress={REPEAT_DELAY_MS}
      onPressOut={stop}
      hitSlop={slop ? { top: slop, bottom: slop, left: slop, right: slop } : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon name={icon} size={18} color={color.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: color.divider,
  },
  pressed: { backgroundColor: color.neutral[800] },
  disabled: { opacity: 0.35 },
});
