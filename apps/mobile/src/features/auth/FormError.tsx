import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import type { ApiError } from '../../data/api/errors';
import { useT } from '../../i18n';
import { Icon } from '../../ui/Icon';
import { Text } from '../../ui/Text';

export interface FormErrorProps {
  error: ApiError | null;
  /** Dodatkowa linia pod komunikatem (np. odliczanie blokady). */
  detail?: ReactNode;
  testID?: string;
}

/** Komunikat błędu pod formularzem (accent-300, `warning-circle`) – tekst z `errors:<CODE>`. */
export function FormError({ error, detail, testID }: FormErrorProps) {
  const t = useT();
  if (!error) return null;
  return (
    <View testID={testID} style={styles.row} accessibilityLiveRegion="assertive">
      <Icon name="warning-circle" size={16} color={color.accentRamp[300]} />
      <View style={styles.text}>
        <Text variant="bodyS" color={color.accentRamp[300]}>
          {t(error.messageKey as never, error.messageParams)}
        </Text>
        {detail}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: layout[6], alignItems: 'flex-start' },
  text: { flex: 1, gap: layout[4] },
});
