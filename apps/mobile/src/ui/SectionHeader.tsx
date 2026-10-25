import { StyleSheet, View } from 'react-native';
import { color } from '@polechamp/tokens';
import { useT } from '../i18n';
import { Button } from './Button';
import { Text } from './Text';

export interface SectionHeaderProps {
  title: string;
  /** Akcja ghost „Dodaj” (13 dp, `plus`). */
  onAdd?: () => void;
  addLabel?: string;
  addAccessibilityLabel?: string;
}

/** Nagłówek sekcji: kicker + opcjonalna akcja (09-design-system §4.17). */
export function SectionHeader({ title, onAdd, addLabel, addAccessibilityLabel }: SectionHeaderProps) {
  const t = useT();
  return (
    <View style={styles.row}>
      <Text variant="kicker" color={color.neutral[400]} accessibilityRole="header">
        {title}
      </Text>
      {onAdd ? (
        <Button
          variant="ghost"
          size={44}
          icon="plus"
          label={addLabel ?? t('section.add')}
          accessibilityLabel={addAccessibilityLabel}
          onPress={onAdd}
          style={styles.add}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 4,
    marginBottom: 8,
    minHeight: 20,
  },
  // Akcja w wierszu nagłówka nie zwiększa jego wysokości – strefa dotyku przez hitSlop.
  add: { minHeight: 28, marginVertical: -8 },
});
