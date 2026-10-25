import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import { useT } from '../../i18n';
import { useMode } from '../../mode/mode';
import { Icon } from '../../ui/Icon';
import { Text } from '../../ui/Text';
import { JUDGE_MIN_LANDSCAPE_WIDTH } from './deviceCapabilities';

/** Nakładka potrzebna, gdy okno trybu sędziego jest za wąskie albo w pionie (TL-23). */
export function needsRotation(width: number, height: number): boolean {
  return width < JUDGE_MIN_LANDSCAPE_WIDTH || height > width;
}

/**
 * Pełnoekranowa nakładka „Obróć tablet” w trybie sędziego (IMP-213, TL-23). Treść pod spodem
 * pozostaje zamontowana – stan formularza nie ginie przy zmianie rozmiaru okna.
 */
export function OrientationGuard({ children }: { children: ReactNode }) {
  const t = useT();
  const { mode } = useMode();
  const { width, height } = useWindowDimensions();
  const blocked = mode === 'judge' && needsRotation(width, height);
  return (
    <View style={styles.root}>
      <View
        style={styles.root}
        accessibilityElementsHidden={blocked}
        importantForAccessibility={blocked ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
      {blocked ? (
        <View testID="orientation-overlay" style={styles.overlay} accessibilityViewIsModal>
          <Icon name="device-rotate" size={28} color={color.accent} />
          <Text variant="heading" align="center" accessibilityRole="header">
            {t('orientation.title')}
          </Text>
          <Text variant="bodyS" align="center" color={color.neutral[400]}>
            {t('orientation.body')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: layout[12],
    padding: layout[22],
  },
});
