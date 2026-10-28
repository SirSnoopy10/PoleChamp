import { Pressable, StyleSheet, View } from 'react-native';
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
  /** Tytuł jako link (np. kategoria na ekranie „Zawodniczki” – UX-37). */
  onPressTitle?: () => void;
  titleTestID?: string;
}

/** Nagłówek sekcji: kicker + opcjonalna akcja (09-design-system §4.17). */
export function SectionHeader({
  title,
  onAdd,
  addLabel,
  addAccessibilityLabel,
  onPressTitle,
  titleTestID,
}: SectionHeaderProps) {
  const t = useT();
  const kicker = (
    <Text
      variant="kicker"
      color={onPressTitle ? color.accentRamp[300] : color.neutral[400]}
      accessibilityRole="header"
    >
      {title}
    </Text>
  );
  return (
    <View style={styles.row}>
      {onPressTitle ? (
        <Pressable testID={titleTestID} accessibilityRole="link" onPress={onPressTitle} hitSlop={12}>
          {kicker}
        </Pressable>
      ) : (
        kicker
      )}
      {onAdd ? (
        <Button
          variant="ghost"
          size={28}
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
  add: { marginVertical: -8 },
});
