import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { color } from '@polechamp/tokens';

const FADE = 48;

/**
 * Linia 1 dp wygaszana na końcach (48 dp z każdej strony) – nagłówek i stopka tabletu
 * (06-ekrany-sedziego §0, SCR-JDG-05). `position` – przyklejenie do dolnej / górnej krawędzi rodzica.
 */
export function FadedDivider({ position }: { position: 'top' | 'bottom' }) {
  return (
    <View pointerEvents="none" style={[styles.row, position === 'top' ? styles.top : styles.bottom]}>
      <LinearGradient
        colors={['transparent', color.divider]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fade}
      />
      <View style={styles.line} />
      <LinearGradient
        colors={[color.divider, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fade}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 0, right: 0, height: 1, flexDirection: 'row' },
  top: { top: 0 },
  bottom: { bottom: 0 },
  fade: { width: FADE, height: 1 },
  line: { flex: 1, height: 1, backgroundColor: color.divider },
});
