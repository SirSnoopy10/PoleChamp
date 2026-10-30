import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/Text';

export interface StartMissingItem {
  key: string;
  label: string;
  onPress: () => void;
}

/** Stała lista faktycznych braków przed startem turnieju lub kategorii, z linkami (UX2-04, UX2-05). */
export function StartMissing({ items, testID }: { items: readonly StartMissingItem[]; testID: string }) {
  const t = useT();
  if (!items.length) return null;
  return (
    <View testID={testID} style={styles.root}>
      <Text variant="caption" color={color.neutral[400]}>
        {t('org:tournament.missing')}
      </Text>
      {items.map((item) => (
        <Button
          key={item.key}
          testID={`${testID}-${item.key}`}
          variant="ghost"
          size={44}
          icon="plus"
          label={item.label}
          onPress={item.onPress}
          style={styles.link}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: layout[4] },
  link: { alignSelf: 'flex-start' },
});
