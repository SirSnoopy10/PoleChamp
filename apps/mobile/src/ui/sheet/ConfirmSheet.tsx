import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { color } from '@polechamp/tokens';
import { Icon, type IconName } from '../Icon';
import { Text } from '../Text';
import { useSheetContext } from './context';

export interface ConfirmContentProps {
  icon: IconName;
  title: string;
  text?: string;
  /** Przyciski w kolumnie, 48 dp (zwykle primary + secondary „Anuluj”). */
  actions: ReactNode;
}

/** Treść arkusza potwierdzenia (SCR-ORG-04, 18): ikona w kole 52 dp, tekst wyśrodkowany. */
export function ConfirmContent({ icon, title, text, actions }: ConfirmContentProps) {
  const { titleRef } = useSheetContext();
  return (
    <View style={styles.body}>
      <View style={styles.circle}>
        <Icon name={icon} size={24} color={color.accentRamp[300]} />
      </View>
      <Text ref={titleRef} variant="heading" align="center" accessibilityRole="header">
        {title}
      </Text>
      {text ? (
        <Text variant="bodyS" align="center" color={color.neutral[400]}>
          {text}
        </Text>
      ) : null}
      <View style={styles.actions}>{actions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: 10, paddingTop: 8 },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: color.accentRamp[900],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actions: { alignSelf: 'stretch', gap: 8, marginTop: 8 },
});
