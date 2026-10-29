import { StyleSheet, View } from 'react-native';
import { color } from '@polechamp/tokens';
import { useT } from '../../i18n';
import { ProgressBar } from '../ProgressBar';
import { StatusPill, type StatusVariant } from '../StatusPill';
import { Text } from '../Text';
import { Card } from './Card';
import { cardStyles } from './TournamentCard';

export interface CategoryCardProps {
  name: string;
  style: string;
  level: string;
  athletes: number;
  status: Extract<StatusVariant, 'draft' | 'live' | 'done' | 'unplayed'>;
  done: number;
  expected: number;
  onPress?: () => void;
  testID?: string;
}

/** Karta kategorii (SCR-ORG-03, SCR-JDG-03): nazwa z wielokropkiem, pigułka bez zawijania. */
export function CategoryCard({
  name,
  style,
  level,
  athletes,
  status,
  done,
  expected,
  onPress,
  testID,
}: CategoryCardProps) {
  const t = useT();
  const subtitle = t('card.athletes', { style, level, count: athletes });
  const progress = t('card.sheets', { done, expected });
  return (
    <Card
      testID={testID ?? 'category-card'}
      onPress={onPress}
      accessibilityLabel={`${name}, ${t(`status.${status}`)}, ${subtitle}, ${progress}`}
    >
      {/* Pigułka nad nazwą – meta w jednej linii na całej szerokości karty (UX-30). */}
      <View style={styles.titles}>
        <View style={styles.pill}>
          <StatusPill variant={status} />
        </View>
        <Text variant="subhead" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" color={color.neutral[400]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={cardStyles.progress}>
        <View style={cardStyles.bar}>
          <ProgressBar value={expected ? done / expected : 0} />
        </View>
        <Text variant="caption" tabular color={color.neutral[400]} numberOfLines={1}>
          {progress}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  titles: { minWidth: 0, gap: 3 },
  pill: { alignSelf: 'flex-start', marginBottom: 3 },
});
