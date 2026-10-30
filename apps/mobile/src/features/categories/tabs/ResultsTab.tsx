import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import { tieBreakSentence } from '@polechamp/i18n';
import type { ResultsResponse } from '@polechamp/contracts';
import { useT } from '../../../i18n';
import { EmptyState } from '../../../ui/EmptyState';
import { Icon } from '../../../ui/Icon';
import { GroupedList } from '../../../ui/list/GroupedList';
import { RankingRow } from '../../../ui/list/RankingRow';
import { SectionHeader } from '../../../ui/SectionHeader';
import { SkeletonRow } from '../../../ui/Skeleton';
import { Text } from '../../../ui/Text';

type Row = ResultsResponse['rows'][number];

/** Kolejność wierszy: wycofane na końcu, reszta jak z API (miejsca, potem bez ocen). */
export function orderResults(rows: readonly Row[]): Row[] {
  return [...rows].sort(
    (a, b) => Number(a.entryStatus === 'WITHDRAWN') - Number(b.entryStatus === 'WITHDRAWN'),
  );
}

export interface ResultsTabProps {
  results: ResultsResponse | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  /** Wiersz z ocenami → SCR-ORG-19. */
  onOpen: (row: Row) => void;
}

/**
 * SCR-ORG-08 – ranking na żywo (IMP-268): miejsca (top 3 accent-300, „–” bez ocen – G-31), wynik
 * `display` z API, „wstępny” przy niepełnych, liczba pełnych wyników, objaśnienie remisu.
 */
export function ResultsTab({ results, loading, error, onRetry, onOpen }: ResultsTabProps) {
  const t = useT();
  if (!results) {
    return error && !loading ? (
      <EmptyState variant="error" onRetry={onRetry} />
    ) : (
      <View testID="results-loading">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </View>
    );
  }
  const draft = results.status === 'DRAFT';
  const tieBreak = results.tieBreak ? tieBreakSentence(results.tieBreak.criterionName) : '';
  const ranked = draft ? [] : results.rows.filter((row) => row.rank !== null);
  return (
    <View testID="results-tab" style={styles.root}>
      <SectionHeader title={t('org:results.live')} />
      {ranked.length ? (
        <Text variant="caption" color={color.neutral[400]} testID="results-complete-count">
          {t('org:results.completeCount', {
            n: ranked.filter((row) => row.isComplete).length,
            total: ranked.length,
          })}
        </Text>
      ) : null}
      {results.rows.length ? (
        <GroupedList testID="results-list">
          {orderResults(results.rows).map((row) => {
            const withdrawn = row.entryStatus === 'WITHDRAWN';
            const scored = !draft && row.sheetCount > 0 && row.official !== null;
            const judges = withdrawn
              ? t('common:entryStatus.WITHDRAWN')
              : scored
                ? t('common:judgesCount', { n: row.sheetCount, total: results.judgeCount })
                : t('common:noScores');
            const meta = row.club ? `#${row.startNumber} · ${row.club}` : `#${row.startNumber}`;
            return (
              <RankingRow
                key={row.entryId}
                testID={`result-${row.entryId}`}
                rank={scored && !withdrawn ? row.rank : null}
                name={row.fullName}
                // Wycofana: na końcu, bez miejsca i wyniku – jak w PDF i CSV (decyzja PO IMP-709, UX-12).
                score={scored && !withdrawn ? row.display : '—'}
                meta={meta}
                judges={judges}
                provisional={scored && row.isProvisional}
                muted={withdrawn}
                accessibilityLabel={`${row.fullName}, ${scored ? row.display : t('common:noScores')}, ${judges}${
                  row.isProvisional ? `, ${t('common:provisional')}` : ''
                }`}
                onPress={scored ? () => onOpen(row) : undefined}
              />
            );
          })}
        </GroupedList>
      ) : (
        <EmptyState variant="inline" text={t('org:entries.empty')} />
      )}
      <View style={styles.info}>
        <Icon name="info" size={14} color={color.neutral[400]} />
        <Text variant="caption" color={color.neutral[400]} style={styles.infoText}>
          {t('org:rankingFormula', { tieBreak }).trim()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: layout[4] },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: layout[6], marginTop: layout[10] },
  infoText: { flex: 1 },
});
