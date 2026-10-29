import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { judgeProgress } from '@polechamp/scoring';
import { color, layout, radius } from '@polechamp/tokens';
import type { JudgeCategory, QueueEntry } from '../../data/judge/queries';
import { selectEntrySyncState, useSyncStore, type EntrySyncState } from '../../data/sync/syncStore';
import { useT } from '../../i18n';
import { Badge } from '../../ui/Badge';
import { Banner } from '../../ui/Banner';
import { Icon, type IconName } from '../../ui/Icon';
import { useHasDraft } from '../scoring/draftMarks';
import { BackLink } from '../../ui/layout/ScreenHeader';
import { ProgressBar } from '../../ui/ProgressBar';
import { Text } from '../../ui/Text';
import { openSyncPopover } from '../sync/SyncPill';

/** Ikona stanu oceny w wierszu (06-offline §8.2). */
const STATE_ICON: Record<EntrySyncState, { icon: IconName; color: string; weight?: 'fill' }> = {
  none: { icon: 'circle', color: color.neutral[600] },
  synced: { icon: 'check-circle', color: color.accent, weight: 'fill' },
  pending: { icon: 'clock', color: color.accentRamp[300] },
  rejected: { icon: 'warning-circle', color: color.accentRamp[300] },
};

const QueueRow = memo(function QueueRow({
  judgeId,
  entry,
  active,
  onPress,
}: {
  judgeId: string;
  entry: QueueEntry;
  active: boolean;
  onPress: (id: string) => void;
}) {
  const t = useT();
  const state = useSyncStore(selectEntrySyncState(entry.id));
  // Szkic tylko dla nieocenionej – po zatwierdzeniu ikona stanu oceny wystarcza (UX-14).
  const draft = useHasDraft(judgeId, entry.id, !!entry.hasDraft) && state === 'none';
  const icon = STATE_ICON[state];
  const stateText = t(`judge:queue.state.${state}`);
  return (
    <Pressable
      testID={`queue-row-${entry.id}`}
      onPress={() => onPress(entry.id)}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={
        entry.club
          ? t('judge:queue.rowA11y', {
              number: entry.startNumber,
              name: entry.fullName,
              club: entry.club,
              state: stateText,
            })
          : t('judge:queue.rowA11yNoClub', {
              number: entry.startNumber,
              name: entry.fullName,
              state: stateText,
            })
      }
      style={({ pressed }) => [
        styles.row,
        active && styles.rowActive,
        pressed && !active && styles.rowPressed,
      ]}
    >
      <Badge
        variant="number"
        value={entry.startNumber}
        size={38}
        tone={state === 'none' ? 'neutral' : 'accent'}
      />
      <View style={styles.rowText}>
        <Text variant="body" numberOfLines={1}>
          {entry.fullName}
        </Text>
        {entry.club ? (
          <Text variant="caption" color={color.neutral[400]} numberOfLines={1}>
            {entry.club}
          </Text>
        ) : null}
      </View>
      {draft ? (
        <Text variant="micro" color={color.accentRamp[300]} testID={`queue-draft-${entry.id}`}>
          {t('judge:queue.draft')}
        </Text>
      ) : null}
      <Icon
        name={icon.icon}
        size={18}
        color={icon.color}
        weight={icon.weight}
        testID={`queue-state-${state}`}
      />
    </Pressable>
  );
});

export interface QueuePanelProps {
  judgeId: string;
  /** Turniej zakończony – baner informacyjny nad kolejką (UX-35). */
  tournamentFinished?: boolean;
  category: JudgeCategory;
  queue: QueueEntry[];
  selectedId: string | null;
  /** Odrzucone przez blokadę / zakończenie turnieju (TL-11). */
  rejectedCount: number;
  onSelect: (entryId: string) => void;
  onBack: () => void;
}

/**
 * Panel boczny SCR-JDG-04 (IMP-308): „‹ Kategorie”, nazwa, własny postęp, baner blokady i odrzuceń,
 * kolejka aktywnych startów (wycofane ukryte – FR-404) z ikoną stanu oceny.
 */
export function QueuePanel({
  judgeId,
  tournamentFinished = false,
  category,
  queue,
  selectedId,
  rejectedCount,
  onSelect,
  onBack,
}: QueuePanelProps) {
  const t = useT();
  const progress = judgeProgress(category.scored, category.total);
  const progressText = t('judge:categories.progress', { done: progress.done, total: progress.expected });
  return (
    <View testID="queue-panel" style={styles.root}>
      <View style={styles.top}>
        <BackLink label={t('judge:queue.back')} onPress={onBack} />
        <Text variant="cardTitle" numberOfLines={2} accessibilityRole="header">
          {category.name}
        </Text>
        <ProgressBar value={progress.percent / 100} label={progressText} />
        <Text variant="caption" tabular color={color.neutral[400]}>
          {progressText}
        </Text>
        {tournamentFinished ? (
          <Banner
            variant="locked"
            text={t('judge:queue.tournamentFinished')}
            testID="queue-finished-banner"
          />
        ) : category.status === 'LOCKED' ? (
          <Banner variant="locked" testID="queue-locked-banner" />
        ) : null}
        {rejectedCount > 0 ? (
          <Banner
            variant="rejected"
            text={t('judge:rejectedBanner', { count: rejectedCount })}
            onPress={openSyncPopover}
            testID="queue-rejected-banner"
          />
        ) : null}
      </View>
      <ScrollView
        testID="queue-list"
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {queue.map((e) => (
          <QueueRow key={e.id} judgeId={judgeId} entry={e} active={e.id === selectedId} onPress={onSelect} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { paddingVertical: layout[14], paddingHorizontal: layout[16], gap: layout[8] },
  list: { paddingHorizontal: layout[10], paddingBottom: layout[16], gap: layout[4] },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout[12],
    padding: layout[10],
    borderRadius: radius.r12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowActive: { backgroundColor: color.mix.accent14OnBg, borderColor: color.accentRamp[700] },
  rowPressed: { backgroundColor: color.mix.accent10OnBg },
  rowText: { flex: 1, minWidth: 0 },
});
