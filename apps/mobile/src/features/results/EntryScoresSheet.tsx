import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { color, layout, radius } from '@polechamp/tokens';
import { formatDecimal } from '@polechamp/i18n';
import type { ResultsResponse } from '@polechamp/contracts';
import { useEntryScoreSheets, useRevisions } from '../../data/org/results';
import type { EntryScoreSheets } from '../../data/org/types';
import { useT } from '../../i18n';
import { Avatar } from '../../ui/Avatar';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Sheet, SheetHeader } from '../../ui/sheet';
import { SkeletonCard } from '../../ui/Skeleton';
import { Text } from '../../ui/Text';
import { formatClock } from '../org/time';

type Row = ResultsResponse['rows'][number];
type ScoreSheet = EntryScoreSheets['items'][number];

/** Liczba z przecinkiem bez zbędnych zer („8,5”, „2”). */
const num = (value: number) => (Number.isInteger(value) ? String(value) : formatDecimal(value, 1));
/** Noty i sumy zawsze z 1 miejscem po przecinku – jak na tablecie (UX-31). */
const score = (value: number) => formatDecimal(value, 1);

function Revisions({ sheet }: { sheet: ScoreSheet }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const revisions = useRevisions(sheet.id, open);
  if (sheet.revisionCount < 2) return null;
  return (
    <View style={styles.revisions}>
      <Button
        testID={`history-${sheet.id}`}
        variant="ghost"
        size={44}
        label={t('org:scores.history', { n: sheet.revisionCount })}
        onPress={() => setOpen((v) => !v)}
        style={styles.start}
      />
      {open
        ? (revisions.data ?? []).map((r) => (
            <Text key={r.revision} variant="caption" tabular color={color.neutral[400]}>
              {t('org:scores.revision', {
                k: r.revision,
                time: formatClock(r.createdAt),
                total: score(r.total),
              })}
            </Text>
          ))
        : null}
    </View>
  );
}

function JudgeCard({ sheet }: { sheet: ScoreSheet }) {
  const t = useT();
  return (
    <View style={styles.card} testID={`sheet-${sheet.id}`}>
      <View style={styles.cardHead}>
        <Avatar name={sheet.judge.fullName} size={28} />
        <Text variant="bodyS" style={styles.flex} numberOfLines={1}>
          {sheet.judge.fullName}
        </Text>
        {sheet.authMode === 'OFFLINE_PIN' ? (
          <View style={styles.tag}>
            <Text variant="micro" color={color.neutral[300]}>
              {t('org:scores.offline')}
            </Text>
          </View>
        ) : null}
        <Text variant="cardTitle" tabular style={styles.total}>
          {score(sheet.total)}
        </Text>
      </View>
      <View style={styles.criteria}>
        {sheet.criteria.map((c) => (
          <Text key={c.criterionId} variant="caption" tabular color={color.neutral[300]} style={styles.half}>
            {t('org:scores.criterion', { name: c.name, value: score(c.value), weight: num(c.weight) })}
          </Text>
        ))}
      </View>
      {sheet.penalties
        .filter((p) => p.count > 0)
        .map((p) => (
          <Text key={p.penaltyTypeId} variant="caption" color={color.neutral[300]}>
            {t('org:scores.penalty', { name: p.name, count: p.count, points: num(p.points * p.count) })}
          </Text>
        ))}
      {sheet.comment ? (
        <Text variant="meta" color={color.neutral[300]} style={styles.comment}>
          {t('org:scores.comment', { text: sheet.comment })}
        </Text>
      ) : null}
      <Revisions sheet={sheet} />
    </View>
  );
}

export interface EntryScoresSheetProps {
  row: Row | null;
  judgeCount: number;
  onClose: () => void;
}

/** SCR-ORG-19 – oceny zawodniczki (IMP-269): karta na sędziego, noty, kary, komentarz, historia zmian. */
export function EntryScoresSheet({ row, judgeCount, onClose }: EntryScoresSheetProps) {
  const t = useT();
  const query = useEntryScoreSheets(row?.entryId ?? null);
  const data = query.data;
  const summary = data?.summary;
  return (
    <Sheet
      scroll={false}
      visible={!!row}
      onClose={onClose}
      accessibilityLabel={row?.fullName}
      testID="scores-sheet"
    >
      {row ? (
        <>
          <SheetHeader title={row.fullName} />
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.body}>
              <View style={styles.head}>
                <Badge variant="number" value={row.startNumber} />
                <View style={styles.flex}>
                  {row.club ? (
                    <Text variant="caption" color={color.neutral[400]}>
                      {row.club}
                    </Text>
                  ) : null}
                  {summary ? (
                    <Text variant="bodyS" tabular testID="scores-summary">
                      {summary.rank
                        ? t('org:scores.summary', {
                            score: summary.display,
                            rank: summary.rank,
                            n: summary.sheetCount,
                            total: summary.expectedCount || judgeCount,
                          })
                        : t('org:scores.summaryNoRank', {
                            score: summary.display,
                            n: summary.sheetCount,
                            total: summary.expectedCount || judgeCount,
                          })}
                    </Text>
                  ) : null}
                </View>
              </View>
              {data ? (
                <>
                  {data.items.map((sheet) => (
                    <JudgeCard key={sheet.id} sheet={sheet} />
                  ))}
                  {data.missingJudges.map((judge) => (
                    <View key={judge.id} style={[styles.card, styles.cardHead]}>
                      <Avatar name={judge.fullName} size={28} state="inactive" />
                      <Text variant="bodyS" style={styles.flex}>
                        {judge.fullName}
                      </Text>
                      <Text variant="caption" color={color.neutral[400]}>
                        {t('org:scores.noSheet')}
                      </Text>
                    </View>
                  ))}
                </>
              ) : query.isError ? (
                <EmptyState variant="error" onRetry={() => void query.refetch()} />
              ) : (
                <SkeletonCard />
              )}
            </View>
          </ScrollView>
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: layout[10], paddingBottom: layout[16] },
  head: { flexDirection: 'row', alignItems: 'center', gap: layout[12] },
  flex: { flex: 1 },
  card: { padding: layout[14], gap: layout[8], borderRadius: radius.lg, backgroundColor: color.surface },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: layout[8] },
  tag: { paddingHorizontal: layout[6], borderRadius: radius.sm, backgroundColor: color.neutral[800] },
  total: { minWidth: layout[34] },
  criteria: { flexDirection: 'row', flexWrap: 'wrap', rowGap: layout[4] },
  half: { width: '50%' },
  comment: { fontStyle: 'italic' },
  revisions: { gap: layout[4] },
  start: { alignSelf: 'flex-start' },
});
