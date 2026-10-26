import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { color } from '@polechamp/tokens';

/** Szerokość panelu bocznego SCR-JDG-04/05. */
export const SIDE_PANEL_WIDTH = 300;

/** Układ dwupanelowy tabletu (IMP-300): panel boczny 300 dp (surface 45% nad bg) + panel prawy. */
export function TwoPaneLayout({ side, children }: { side: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.root}>
      <View testID="side-panel" style={styles.side}>
        {side}
      </View>
      <View testID="main-panel" style={styles.main}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  side: {
    width: SIDE_PANEL_WIDTH,
    backgroundColor: color.mix.surface45OnBg,
    borderRightWidth: 1,
    borderRightColor: color.divider,
  },
  main: { flex: 1, minWidth: 0 },
});
