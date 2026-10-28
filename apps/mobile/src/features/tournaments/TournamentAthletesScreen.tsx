import { StyleSheet, View } from 'react-native';
import { layout } from '@polechamp/tokens';
import type { EntryRow, TournamentDetails } from '@polechamp/contracts';
import { orderEntries } from '../../data/org/entries';
import { useT } from '../../i18n';
import { EmptyState } from '../../ui/EmptyState';
import { ScreenContainer } from '../../ui/layout/ScreenContainer';
import { ScreenHeader } from '../../ui/layout/ScreenHeader';
import { GroupedList, ListRow } from '../../ui/list/GroupedList';
import { OfflineBanner } from '../../ui/OfflineBanner';
import { SectionHeader } from '../../ui/SectionHeader';
import { SkeletonRow } from '../../ui/Skeleton';
import { Text } from '../../ui/Text';

type Category = TournamentDetails['categories'][number];

export interface CategoryEntries {
  category: Category;
  entries: EntryRow[] | undefined;
}

export interface TournamentAthletesScreenProps {
  groups: CategoryEntries[] | undefined;
  error: boolean;
  onBack: () => void;
  onRetry: () => void;
  onOpenCategory: (categoryId: string) => void;
}

/** Zawodniczki turnieju z podziałem na kategorie (kafelek „Zawodniczki” w SCR-ORG-03). */
export function TournamentAthletesScreen({
  groups,
  error,
  onBack,
  onRetry,
  onOpenCategory,
}: TournamentAthletesScreenProps) {
  const t = useT();

  const body = !groups ? (
    error ? (
      <EmptyState variant="error" onRetry={onRetry} />
    ) : (
      <View testID="athletes-loading">
        <SkeletonRow />
        <SkeletonRow />
      </View>
    )
  ) : groups.length === 0 ? (
    <EmptyState variant="inline" text={t('org:athletes.noCategories')} />
  ) : (
    groups.map(({ category, entries }) => (
      <View key={category.id} style={styles.section} testID={`athletes-category-${category.id}`}>
        <SectionHeader title={`${category.name} (${category.entryCount})`} />
        {!entries ? (
          error ? (
            <EmptyState variant="error" onRetry={onRetry} />
          ) : (
            <SkeletonRow />
          )
        ) : entries.length ? (
          <GroupedList>
            {orderEntries(entries).map((e) => (
              <ListRow
                key={e.id}
                testID={`athlete-${e.id}`}
                minHeight={60}
                title={t('org:athletes.row', { nr: e.startNumber, name: e.athlete.fullName })}
                subtitle={
                  e.status === 'WITHDRAWN' ? t('org:athletes.withdrawn') : (e.athlete.club ?? undefined)
                }
                inactive={e.status === 'WITHDRAWN'}
                onPress={() => onOpenCategory(category.id)}
              />
            ))}
          </GroupedList>
        ) : (
          <EmptyState variant="inline" text={t('org:athletes.empty')} />
        )}
      </View>
    ))
  );

  return (
    <ScreenContainer testID="athletes-screen">
      <ScreenHeader back={{ label: t('nav.tournament'), onPress: onBack }} />
      <OfflineBanner />
      <Text variant="titleM" accessibilityRole="header">
        {t('org:athletes.title')}
      </Text>
      <View style={styles.list}>{body}</View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: layout[18], gap: layout[24] },
  section: { gap: layout[4] },
});
