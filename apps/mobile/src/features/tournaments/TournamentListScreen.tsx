import { RefreshControl, StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import { formatTournamentDate } from '@polechamp/i18n';
import type { TournamentListItem } from '@polechamp/contracts';
import { useOnline } from '../../data/network/online';
import { groupTournaments, STATUS_PILL } from '../../data/org/tournaments';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { TournamentCard } from '../../ui/cards/TournamentCard';
import { EmptyState } from '../../ui/EmptyState';
import { Icon } from '../../ui/Icon';
import { ScreenContainer } from '../../ui/layout/ScreenContainer';
import { GroupedList, ListRow, RowTile } from '../../ui/list/GroupedList';
import { OfflineBanner } from '../../ui/OfflineBanner';
import { SectionHeader } from '../../ui/SectionHeader';
import { SkeletonCard, SkeletonRow } from '../../ui/Skeleton';
import { Text } from '../../ui/Text';

export interface TournamentListData {
  active: TournamentListItem[] | undefined;
  finished: TournamentListItem[] | undefined;
  loading: boolean;
  /** Błąd bez danych w cache. */
  error: boolean;
  refreshing: boolean;
}

export interface TournamentListScreenProps extends TournamentListData {
  onRefresh: () => void;
  onRetry: () => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onAccount: () => void;
}

/** SCR-ORG-01 – lista turniejów (IMP-255): sekcje Aktywne/Zakończone, stany, pull-to-refresh. */
export function TournamentListScreen({
  active,
  finished,
  loading,
  error,
  refreshing,
  onRefresh,
  onRetry,
  onOpen,
  onCreate,
  onAccount,
}: TournamentListScreenProps) {
  const t = useT();
  const online = useOnline();
  const placeOf = (venue: string | null) => venue ?? t('org:tournaments.placeTbd');
  const groups = active && finished ? groupTournaments(active, finished) : null;
  const empty = groups && groups.active.length === 0 && !groups.finished;

  let body;
  if (loading && !groups) {
    body = (
      <View testID="tournaments-loading" style={styles.list}>
        <SkeletonCard />
        <SkeletonCard />
        <View style={styles.finished}>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      </View>
    );
  } else if (error && !groups) {
    body = <EmptyState variant="error" onRetry={onRetry} />;
  } else if (empty) {
    body = (
      <View testID="tournaments-empty" style={styles.empty}>
        <Icon name="trophy" size={26} color={color.accent} />
        <Text variant="meta" color={color.neutral[400]} align="center">
          {t('org:tournaments.empty')}
        </Text>
        <Button
          testID="tournaments-create"
          label={t('org:tournaments.create')}
          icon="plus"
          disabled={!online}
          onPress={onCreate}
        />
      </View>
    );
  } else if (groups) {
    body = (
      <>
        <SectionHeader title={t('org:tournaments.active')} />
        <View style={styles.list}>
          {groups.active.length ? (
            groups.active.map((item) => (
              <TournamentCard
                key={item.id}
                testID={`tournament-${item.id}`}
                name={item.name}
                status={STATUS_PILL[item.status] as 'draft' | 'live'}
                date={formatTournamentDate(item.startDate, item.endDate)}
                place={placeOf(item.venue)}
                categories={item.categoryCount}
                pct={item.progress.percent}
                onPress={() => onOpen(item.id)}
              />
            ))
          ) : (
            <EmptyState variant="inline" text={t('org:tournaments.noActive')} />
          )}
        </View>
        {groups.finished ? (
          <View style={styles.finished}>
            <SectionHeader title={t('org:tournaments.finished')} />
            <GroupedList testID="tournaments-finished">
              {groups.finished.map((item) => (
                <ListRow
                  key={item.id}
                  testID={`tournament-${item.id}`}
                  title={item.name}
                  subtitle={t('org:tournaments.finishedRow', {
                    date: formatTournamentDate(item.startDate, item.endDate),
                    place: placeOf(item.venue),
                  })}
                  leading={
                    <RowTile>
                      <Icon name="archive" size={18} color={color.neutral[400]} />
                    </RowTile>
                  }
                  onPress={() => onOpen(item.id)}
                />
              ))}
            </GroupedList>
          </View>
        ) : null}
      </>
    );
  }

  return (
    <ScreenContainer
      testID="tournaments-screen"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={color.accent}
          colors={[color.accent]}
          progressBackgroundColor={color.surface}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text variant="meta" color={color.neutral[400]}>
            {t('org:tournaments.kicker')}
          </Text>
          <Text variant="display" accessibilityRole="header">
            {t('org:tournaments.title')}
          </Text>
        </View>
        <View style={styles.actions}>
          <Button
            testID="tournaments-account"
            variant="iconRound"
            roundSize={40}
            icon="user-circle"
            accessibilityLabel={t('org:tournaments.account')}
            onPress={onAccount}
          />
          <Button
            testID="tournaments-new"
            variant="iconRound"
            roundSize={40}
            icon="plus"
            accessibilityLabel={t('org:tournaments.newA11y')}
            disabled={!online}
            onPress={onCreate}
            outlined
          />
        </View>
      </View>
      <OfflineBanner />
      {body}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: layout[22],
  },
  titles: { gap: layout[4] },
  actions: { flexDirection: 'row', gap: layout[8] },
  list: { gap: layout[10], marginBottom: layout[26] },
  finished: { gap: layout[4] },
  empty: { alignItems: 'center', gap: layout[14], paddingVertical: layout[48] },
});
