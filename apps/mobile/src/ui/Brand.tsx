import { StyleSheet, View } from 'react-native';
import { color, radius } from '@polechamp/tokens';
import { Icon } from './Icon';
import { Text } from './Text';

/** Nazwa produktu – znak towarowy, nie tłumaczony. */
export const BRAND_NAME = 'PoleChamp';

/** Logo 36 dp (`trophy` w obrysie accent) + „PoleChamp” 30 dp – splash, SCR-SYS-01, SCR-ORG-13. */
export function Brand() {
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel={BRAND_NAME}>
      <View style={styles.logo}>
        <Icon name="trophy" size={20} color={color.accent} />
      </View>
      <Text variant="titleM" style={styles.wordmark}>
        {BRAND_NAME}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
});
