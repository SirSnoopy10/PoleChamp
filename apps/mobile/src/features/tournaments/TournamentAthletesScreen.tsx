import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { layout } from '@polechamp/tokens';
import type { EntryRow, TournamentDetails } from '@polechamp/contracts';
import { orderEntries } from '../../data/org/entries';
import { useT } from '../../i18n';
import { EmptyState } from '../../ui/EmptyState';
import { SearchField } from '../../ui/form';
import { ScreenContainer } from '../../ui/layout/ScreenContainer';
import { ScreenHeader } from '../../ui/layout/ScreenHeader';
import { GroupedList } from '../../ui/list/GroupedList';
import { OfflineBanner } from '../../ui/OfflineBanner';
import { SectionHeader } from '../../ui/SectionHeader';
import { SkeletonRow } from '../../ui/Skeleton';
import { Text } from '../../ui/Text';
import { EntryListRow } from '../entries/EntryListRow';

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
  /** Arkusz zawodniczki (SCR-ORG-17) w miejscu – edycja, wycofanie, przywrócenie (UX-37). */
  onOpenEntry: (entry: EntryRow, category: Category) => void;
  /** „Dodaj” w sekcji – tylko gdy kategoria pozwala na zmianę listy. */
  onAdd?: (category: Category) => void;
  canAdd: (category: Category) => boolean;
}

/** Dopasowanie do nazwiska, klubu albo numeru startowego (UX-43). */
export function matchesEntry(e: EntryRow, query: string): boolean {
  const q = query.trim().toLocaleLowerCase('pl');
  if (!q) return true;
  return (
    e.athlete.fullName.toLocaleLowerCase('pl').includes(q) ||
    (e.athlete.club ?? '').toLocaleLowerCase('pl').includes(q) ||
    String(e.startNumber) === q.replace(/^#|^nr\s*/, '')
  );
}

/** Zawodniczki turnieju z podziałem na kategorie (kafelek „Zawodniczki” w SCR-ORG-03). */
export function TournamentAthletesScreen({
  groups,
  error,
  onBack,
  onRetry,
  onOpenCategory,
  onOpenEntry,
  onAdd,
  canAdd,
}: TournamentAthletesScreenProps) {
  const t = useT();
  const [query, setQuery] = useState('');
  const total = groups?.reduce((n, g) => n + (g.entries?.length ?? 0), 0) ?? 0;
  const filtered = groups?.map((g) => ({
    ...g,
    entries: g.entries?.filter((e) => matchesEntry(e, query)),
  }));
  const visible = query.trim() ? filtered?.filter((g) => !g.entries || g.entries.length) : filtered;

  const body = !visible ? (
    error ? (
      <EmptyState variant="error" onRetry={onRetry} />
    ) : (
      <View testID="athletes-loading">
        <SkeletonRow />
        <SkeletonRow />
      </View>
    )
  ) : groups?.length === 0 ? (
    <EmptyState variant="inline" text={t('org:athletes.noCategories')} />
  ) : visible.length === 0 ? (
    <EmptyState variant="inline" text={t('org:entries.noMatches')} />
  ) : (
    visible.map(({ category, entries }) => (
      <View key={category.id} style={styles.section} testID={`athletes-category-${category.id}`}>
        <SectionHeader
          title={`${category.name} (${category.entryCount})`}
          onPressTitle={() => onOpenCategory(category.id)}
          titleTestID={`athletes-open-${category.id}`}
          onAdd={onAdd && canAdd(category) ? () => onAdd(category) : undefined}
          addAccessibilityLabel={t('org:entries.addA11y')}
        />
        {!entries ? (
          error ? (
            <EmptyState variant="error" onRetry={onRetry} />
          ) : (
            <SkeletonRow />
          )
        ) : entries.length ? (
          <GroupedList>
            {orderEntries(entries).map((e) => (
              <EntryListRow key={e.id} entry={e} onPress={() => onOpenEntry(e, category)} />
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
      {groups ? (
        <Text variant="meta" testID="athletes-total">
          {t('org:athletes.total', { count: total })}
        </Text>
      ) : null}
      <View style={styles.list}>
        {total > 0 ? (
          <SearchField
            testID="athletes-search"
            value={query}
            onChangeText={setQuery}
            placeholder={t('org:entries.search')}
          />
        ) : null}
        {body}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: layout[18], gap: layout[24] },
  section: { gap: layout[4] },
});
