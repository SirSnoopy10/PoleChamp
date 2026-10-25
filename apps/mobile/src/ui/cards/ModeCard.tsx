import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius, shadow } from '@polechamp/tokens';
import { Icon, type IconName } from '../Icon';
import { Text } from '../Text';
import { PRESSED_OVERLAY } from './Card';

export interface ModeCardProps {
  icon: IconName;
  title: string;
  hint: string;
  /** Podpis stanu nieaktywnego (np. „Panel sędziego wymaga tabletu.”). */
  disabledHint?: string;
  /** Brak `onPress` = karta nieaktywna. */
  onPress?: () => void;
  testID?: string;
}

/** Duża karta wyboru (SCR-SYS-01): surface, radius lg, padding 22, ikona 28 dp, tytuł 17 dp/500. */
export function ModeCard({ icon, title, hint, disabledHint, onPress, testID }: ModeCardProps) {
  const disabled = !onPress;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${disabled && disabledHint ? disabledHint : hint}`}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.card,
        disabled && styles.disabled,
        pressed && { backgroundColor: PRESSED_OVERLAY },
      ]}
    >
      <Icon name={icon} size={28} color={color.accent} />
      <View style={styles.texts}>
        <Text variant="subhead" style={styles.title}>
          {title}
        </Text>
        <Text variant="meta" color={color.neutral[400]}>
          {hint}
        </Text>
        {disabled && disabledHint ? (
          <Text variant="meta" color={color.accentRamp[300]}>
            {disabledHint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 22,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    ...shadow.sm,
  },
  disabled: { opacity: 0.45 },
  texts: { flex: 1, gap: 4 },
  title: { fontSize: 17, lineHeight: 22 },
});
