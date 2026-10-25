import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius } from '@polechamp/tokens';
import { useT } from '../i18n';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type EmptyStateProps =
  | { variant: 'framed'; icon: IconName; text: string; onPress?: () => void }
  | { variant: 'inline'; text: string }
  | { variant: 'circle'; icon: IconName; text: string }
  | { variant: 'error'; onRetry: () => void; text?: string };

/** Stany puste (09-design-system §4.18) i stan błędu wczytywania z ponowieniem. */
export function EmptyState(props: EmptyStateProps) {
  const t = useT();
  switch (props.variant) {
    case 'framed':
      return (
        <Pressable
          testID="empty-framed"
          onPress={props.onPress}
          disabled={!props.onPress}
          accessibilityRole={props.onPress ? 'button' : undefined}
          accessibilityLabel={props.text}
          style={({ pressed }) => [styles.framed, pressed && { backgroundColor: 'rgba(233,233,237,0.04)' }]}
        >
          <Icon name={props.icon} size={26} color={color.accent} />
          <Text variant="meta" color={color.neutral[400]} align="center">
            {props.text}
          </Text>
        </Pressable>
      );
    case 'inline':
      return (
        <Text
          testID="empty-inline"
          variant="meta"
          color={color.neutral[400]}
          align="center"
          style={styles.inline}
        >
          {props.text}
        </Text>
      );
    case 'circle':
      return (
        <View testID="empty-circle" style={styles.centered}>
          <View style={styles.circle}>
            <Icon name={props.icon} size={24} color={color.accent} />
          </View>
          <Text variant="bodyS" color={color.neutral[400]} align="center">
            {props.text}
          </Text>
        </View>
      );
    case 'error':
      return (
        <View testID="empty-error" style={styles.centered} accessibilityLiveRegion="polite">
          <Icon name="warning-circle" size={26} color={color.accentRamp[300]} />
          <Text variant="bodyS" color={color.neutral[300]} align="center">
            {props.text ?? t('empty.loadFailed')}
          </Text>
          <Button
            variant="secondary"
            size={44}
            label={t('empty.retry')}
            icon="arrows-clockwise"
            onPress={props.onRetry}
          />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  framed: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.divider,
    alignItems: 'center',
    gap: 8,
  },
  inline: { paddingVertical: 16 },
  centered: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
