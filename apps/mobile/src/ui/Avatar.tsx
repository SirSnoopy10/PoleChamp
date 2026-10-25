import { StyleSheet, View } from 'react-native';
import { color } from '@polechamp/tokens';
import { useT } from '../i18n';
import { Icon } from './Icon';
import { Text } from './Text';

export type AvatarSize = 28 | 38 | 44 | 64;

/** Inicjały: pierwsze litery słów imienia i nazwiska (z członami „-”), maks. 3 (TC-UI-023). */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0]?.toLocaleUpperCase('pl') ?? '')
    .join('');
}

export interface AvatarProps {
  name: string;
  /** Nadpisanie inicjałów z pola `initials`. */
  initials?: string;
  size?: AvatarSize;
  state?: 'active' | 'inactive' | 'locked';
}

/** Awatar z inicjałami (09-design-system §4.16, IMP-204). */
export function Avatar({ name, initials, size = 38, state = 'active' }: AvatarProps) {
  const t = useT();
  const active = state === 'active';
  const fontSize = Math.round(size * 0.36);
  return (
    <View
      testID="avatar"
      accessible
      accessibilityLabel={state === 'locked' ? t('avatar.locked', { name }) : name}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: active ? color.accentRamp[900] : color.neutral[900],
        },
      ]}
    >
      {state === 'locked' ? (
        <Icon name="lock-simple" size={Math.round(size * 0.45)} color={color.neutral[400]} />
      ) : (
        <Text
          variant="subhead"
          color={active ? color.accentRamp[200] : color.neutral[400]}
          style={{ fontSize, lineHeight: fontSize * 1.2 }}
        >
          {initials ?? initialsOf(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ circle: { alignItems: 'center', justifyContent: 'center' } });
