import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import type { EntryRow } from '@polechamp/contracts';
import { orderEntries } from '../../../data/org/entries';
import { useT } from '../../../i18n';
import { Badge } from '../../../ui/Badge';
import { EmptyState } from '../../../ui/EmptyState';
import { SearchField } from '../../../ui/form';
import { Icon } from '../../../ui/Icon';
import { GroupedList, ListRow } from '../../../ui/list/GroupedList';
import { SectionHeader } from '../../../ui/SectionHeader';
import { SkeletonRow } from '../../../ui/Skeleton';
import { Text } from '../../../ui/Text';

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

function Counter({ done, expected }: { done: number; expected: number }) {
  const t = useT();
  const complete = expected > 0 && done >= expected;
  return (
    <View
      style={styles.counter}
      accessible
      accessibilityLabel={t('org:entries.judgedA11y', { done, expected })}
    >
      <Icon
        name={complete ? 'check-circle' : 'circle-dashed'}
        weight={complete ? 'fill' : 'regular'}
        size={16}
        color={complete ? color.accentRamp[300] : color.neutral[500]}
      />
      <Text variant="caption" tabular color={complete ? color.accentRamp[300] : color.neutral[400]}>
        {t('org:entries.judged', { done, expected })}
      </Text>
    </View>
  );
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
        {orderEntries(entries).map((e) => {
          const withdrawn = e.status === 'WITHDRAWN';
          return (
            <ListRow
              key={e.id}
              testID={`entry-${e.id}`}
              minHeight={60}
              title={e.athlete.fullName}
              subtitle={e.athlete.club ?? undefined}
              leading={
                <Badge variant="number" value={e.startNumber} tone={withdrawn ? 'neutral' : 'accent'} />
              }
              trailing={
                withdrawn ? (
                  <Text variant="caption" color={color.neutral[500]}>
                    {t('org:entries.withdrawn')}
                  </Text>
                ) : (
                  <Counter done={e.judged.done} expected={e.judged.expected} />
                )
              }
              onPress={() => onOpen(e)}
            />
          );
        })}
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
  counter: { flexDirection: 'row', alignItems: 'center', gap: layout[4] },
});
