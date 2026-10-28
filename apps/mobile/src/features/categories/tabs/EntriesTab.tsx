import { StyleSheet, View } from 'react-native';
import { layout } from '@polechamp/tokens';
import type { EntryRow } from '@polechamp/contracts';
import { orderEntries } from '../../../data/org/entries';
import { useT } from '../../../i18n';
import { EmptyState } from '../../../ui/EmptyState';
import { SearchField } from '../../../ui/form';
import { GroupedList } from '../../../ui/list/GroupedList';
import { EntryListRow } from '../../entries/EntryListRow';
import { SectionHeader } from '../../../ui/SectionHeader';
import { SkeletonRow } from '../../../ui/Skeleton';

/** Wyszukiwarka od tylu pozycji (SCR-ORG-07). */
export const SEARCH_FROM = 15;

export interface EntriesTabProps {
  entries: EntryRow[] | undefined;
  /** Liczba pozycji bez filtra (`entryCount` kategorii) – decyduje o wyszukiwarce. */
  total: number;
  loading: boolean;
  error: boolean;
  query: string;
  onQuery: (q: string) => void;
  /** „Dodaj” – ukryte w kategorii lub turnieju Zakończona i offline. */
  canAdd: boolean;
  onAdd: () => void;
  onOpen: (entry: EntryRow) => void;
  onRetry: () => void;
}

/**
 * SCR-ORG-07 – lista startowa (IMP-265): numer, nazwisko (wielokropek – UI-15), klub, licznik ocen
 * na żywo, wycofane na końcu. Wyszukiwanie po stronie API (`?q=`, bez znaków diakrytycznych).
 */
export function EntriesTab({
  entries,
  total,
  loading,
  error,
  query,
  onQuery,
  canAdd,
  onAdd,
  onOpen,
  onRetry,
}: EntriesTabProps) {
  const t = useT();
  let body;
  if (!entries) {
    body =
      error && !loading ? (
        <EmptyState variant="error" onRetry={onRetry} />
      ) : (
        <View testID="entries-loading">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      );
  } else if (!entries.length) {
    body = <EmptyState variant="inline" text={t(query ? 'org:entries.noMatches' : 'org:entries.empty')} />;
  } else {
    body = (
      <GroupedList testID="entries-list">
        {orderEntries(entries).map((e) => (
          <EntryListRow key={e.id} entry={e} onPress={() => onOpen(e)} />
        ))}
      </GroupedList>
    );
  }

  return (
    <View testID="entries-tab" style={styles.root}>
      <SectionHeader
        title={t('org:entries.title')}
        onAdd={canAdd ? onAdd : undefined}
        addAccessibilityLabel={t('org:entries.addA11y')}
      />
      {total >= SEARCH_FROM ? (
        <SearchField
          testID="entries-search"
          value={query}
          onChangeText={onQuery}
          placeholder={t('org:entries.search')}
        />
      ) : null}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: layout[8] },
});
