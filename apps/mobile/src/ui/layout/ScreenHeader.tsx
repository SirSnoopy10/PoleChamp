import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { color, radius } from '@polechamp/tokens';
import { useT } from '../../i18n';
import { Icon } from '../Icon';
import { Text } from '../Text';

export interface BackLinkProps {
  /** „Turnieje” / „Turniej” – cel powrotu. */
  label: string;
  onPress: () => void;
}

/** „‹ Turniej”: `caret-left` 20 dp + 15 dp accent, padding 6, margines lewy −6 (§4.24). */
export function BackLink({ label, onPress }: BackLinkProps) {
  const t = useT();
  const tablet = useWindowDimensions().width >= 600;
  return (
    <Pressable
      testID="back-link"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t('nav.back')}: ${label}`}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [styles.back, pressed && { backgroundColor: 'rgba(145,132,217,0.10)' }]}
    >
      <Icon name="caret-left" size={tablet ? 16 : 20} color={color.accent} />
      <Text variant="body" color={color.accent} style={{ fontSize: tablet ? 13.5 : 15 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export interface ScreenHeaderProps {
  back?: BackLinkProps;
  /** Przyciski akcji po prawej (`Button iconRound` 36 dp). */
  actions?: ReactNode;
}

/** Wiersz nawigacji 44 dp: link wstecz i akcje (09-design-system §4.24). */
export function ScreenHeader({ back, actions }: ScreenHeaderProps) {
  return (
    <View style={styles.row} testID="screen-header">
      {back ? <BackLink {...back} /> : <View />}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 44,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 6,
    marginLeft: -6,
    borderRadius: radius.md,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
