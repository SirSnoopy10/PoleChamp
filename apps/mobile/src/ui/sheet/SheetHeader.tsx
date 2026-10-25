import { StyleSheet, View } from 'react-native';
import { color } from '@polechamp/tokens';
import { useT } from '../../i18n';
import { Button } from '../Button';
import { Text } from '../Text';
import { useSheetContext } from './context';

/** Nagłówek arkusza: tytuł `heading` + „×” 30 dp (09-design-system §4.9). */
export function SheetHeader({ title }: { title: string }) {
  const t = useT();
  const { close, titleRef } = useSheetContext();
  return (
    <View style={styles.row}>
      <Text ref={titleRef} variant="heading" accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Button
        variant="iconRound"
        roundSize={30}
        icon="x"
        accessibilityLabel={t('sheet.close')}
        onPress={close}
        testID="sheet-close"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, color: color.text },
});
