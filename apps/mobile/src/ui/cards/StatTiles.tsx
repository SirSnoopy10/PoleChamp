import { Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius, shadow } from '@polechamp/tokens';
import { useT } from '../../i18n';
import { Icon } from '../Icon';
import { ProgressBar } from '../ProgressBar';
import { Text } from '../Text';
import { Card, PRESSED_OVERLAY } from './Card';
import { cardStyles } from './TournamentCard';

export interface StatTile {
  label: string;
  value: string | number;
  onPress?: () => void;
  accessibilityLabel?: string;
}

/** Siatka 3 kolumn z separatorem 1 dp (SCR-ORG-02); opcjonalnie tapowalny kafel. */
export function StatTiles({ tiles }: { tiles: readonly StatTile[] }) {
  return (
    <View style={styles.grid} testID="stat-tiles">
      {tiles.map((tile, i) => {
        const content = (pressed: boolean) => (
          <View style={[styles.tile, pressed && { backgroundColor: PRESSED_OVERLAY }]}>
            <Text variant="numL" tabular>
              {tile.value}
            </Text>
            <View style={styles.label}>
              <Text variant="caption" color={color.neutral[400]} numberOfLines={1}>
                {tile.label}
              </Text>
              {tile.onPress ? <Icon name="caret-right" size={12} color={color.neutral[500]} /> : null}
            </View>
          </View>
        );
        return (
          <Fragment key={tile.label}>
            {i > 0 ? <View style={styles.separator} /> : null}
            {tile.onPress ? (
              <Pressable
                style={styles.cell}
                onPress={tile.onPress}
                accessibilityRole="button"
                accessibilityLabel={tile.accessibilityLabel ?? `${tile.label}: ${tile.value}`}
              >
                {({ pressed }) => content(pressed)}
              </Pressable>
            ) : (
              <View
                style={styles.cell}
                accessible
                accessibilityLabel={tile.accessibilityLabel ?? `${tile.label}: ${tile.value}`}
              >
                {content(false)}
              </View>
            )}
          </Fragment>
        );
      })}
    </View>
  );
}

/** Karta „Postęp oceniania” (SCR-ORG-02): pasek 6 dp i podsumowanie. */
export function ProgressCard({
  pct,
  summary,
  action,
}: {
  pct: number;
  summary: string;
  /** Przycisk statusu turnieju (44 dp) – brak w turnieju Zakończona (UI-02). */
  action?: ReactNode;
}) {
  const t = useT();
  return (
    <Card testID="progress-card" padding={16} style={styles.progressCard}>
      <View style={styles.progressHead}>
        <Text variant="subhead">{t('card.progressTitle')}</Text>
        <Text variant="numM" tabular color={color.accentRamp[200]}>
          {`${pct}%`}
        </Text>
      </View>
      <ProgressBar value={pct / 100} height={6} />
      <View style={cardStyles.progress}>
        <Text variant="caption" color={color.neutral[400]}>
          {summary}
        </Text>
      </View>
      {action}
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.sm,
  },
  cell: { flex: 1 },
  tile: { paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', gap: 2 },
  separator: { width: 1, backgroundColor: color.divider },
  label: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  progressCard: { gap: 10 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
