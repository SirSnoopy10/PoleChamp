import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { color } from '@polechamp/tokens';
import { PRESSED_OVERLAY } from '../cards/Card';
import { useReducedMotion } from '../motion';
import { ProgressBar } from '../ProgressBar';
import { StatusPill } from '../StatusPill';
import { Text } from '../Text';

export interface RankingRowProps {
  /** Miejsce albo `null` – „–” (bez ocen, G-31). */
  rank: number | null;
  name: string;
  /** Wynik z API (`display`) albo „—”. */
  score: string;
  /** „#{nr} · {klub}”. */
  meta: string;
  /** „{n}/{J} sędziów” / „brak ocen” / „Wycofana”. */
  judges: string;
  /** Szerokość paska 0–1 (wynik / maks. wynik sędziego). */
  bar: number;
  /** Pigułka „wstępny” (wynik niekompletny w kategorii Zakończona). */
  provisional?: boolean;
  /** Wycofana – przygaszona, bez paska. */
  muted?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

const transition = LinearTransition.duration(200);

/** Wiersz rankingu (SCR-ORG-08): miejsce 26 dp, nazwisko + wynik, meta, pasek 3 dp; zmiana kolejności 200 ms. */
export function RankingRow({
  rank,
  name,
  score,
  meta,
  judges,
  bar,
  provisional,
  muted,
  onPress,
  accessibilityLabel,
  testID,
}: RankingRowProps) {
  const reduced = useReducedMotion();
  const top = rank !== null && rank <= 3;
  return (
    <Animated.View layout={reduced ? undefined : transition}>
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.row,
          pressed && onPress ? { backgroundColor: PRESSED_OVERLAY } : null,
        ]}
      >
        <Text
          variant="numM"
          tabular
          align="center"
          color={top ? color.accentRamp[300] : color.neutral[500]}
          style={styles.rank}
        >
          {rank === null ? '–' : String(rank)}
        </Text>
        <View style={styles.body}>
          <View style={styles.line}>
            <Text
              variant="body"
              numberOfLines={1}
              color={muted ? color.neutral[500] : undefined}
              style={styles.flex}
            >
              {name}
            </Text>
            {provisional ? <StatusPill variant="provisional" /> : null}
            <Text variant="cardTitle" tabular style={styles.score}>
              {score}
            </Text>
          </View>
          <View style={styles.line}>
            <Text variant="caption" color={color.neutral[400]} numberOfLines={1} style={styles.flex}>
              {meta}
            </Text>
            <Text variant="caption" tabular color={color.neutral[400]}>
              {judges}
            </Text>
          </View>
          {muted ? null : <ProgressBar value={bar} height={3} tone={rank === 1 ? 'primary' : 'secondary'} />}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  rank: { width: 26, fontSize: 20 },
  body: { flex: 1, gap: 5 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  score: { fontSize: 17 },
});
