import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { color } from '@polechamp/tokens';
import { useT } from '../../i18n';
import { Icon } from '../Icon';
import { ProgressBar } from '../ProgressBar';
import { StatusPill, type StatusVariant } from '../StatusPill';
import { Text } from '../Text';
import { Card } from './Card';

export interface TournamentCardProps {
  name: string;
  status: Extract<StatusVariant, 'draft' | 'live' | 'done'>;
  /** Sformatowana data („3–4 października 2026”). */
  date: string;
  place: string;
  categories: number;
  /** Postęp 0–100. */
  pct: number;
  onPress?: () => void;
  testID?: string;
}

// 160° w CSS ≈ wektor (0,3; 0) → (0,7; 1); kolor accent 9% nad surface do 60% długości.
const GRADIENT = {
  colors: [color.mix.accent9OnSurface, color.surface] as const,
  locations: [0, 0.6] as const,
};

/** Karta turnieju (SCR-ORG-01, 09-design-system §4.4). Jeden element dostępności (TC-UI-028). */
export function TournamentCard({
  name,
  status,
  date,
  place,
  categories,
  pct,
  onPress,
  testID,
}: TournamentCardProps) {
  const t = useT();
  const statusLabel = t(`status.${status}`);
  return (
    <Card
      testID={testID ?? 'tournament-card'}
      padding={16}
      onPress={onPress}
      accessibilityLabel={t('card.tournamentA11y', { name, status: statusLabel, date, place, pct })}
      background={
        <LinearGradient
          colors={GRADIENT.colors}
          locations={GRADIENT.locations}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      }
    >
      <View style={styles.top}>
        <StatusPill variant={status} />
        {onPress ? <Icon name="caret-right" size={16} color={color.neutral[500]} /> : null}
      </View>
      <Text variant="cardTitle">{name}</Text>
      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Icon name="calendar-blank" size={14} color={color.neutral[400]} />
          <Text variant="meta" color={color.neutral[400]} style={styles.metaText}>
            {date}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="map-pin" size={14} color={color.neutral[400]} />
          <Text variant="meta" color={color.neutral[400]} style={styles.metaText}>
            {place}
          </Text>
        </View>
      </View>
      <View style={styles.progress}>
        <View style={styles.bar}>
          <ProgressBar value={pct / 100} />
        </View>
        <Text variant="caption" tabular color={color.neutral[400]} numberOfLines={1}>
          {t('card.categories', { count: categories, pct })}
        </Text>
      </View>
    </Card>
  );
}

export const cardStyles = StyleSheet.create({
  progress: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { flex: 1 },
});

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12.5 },
  ...cardStyles,
});
