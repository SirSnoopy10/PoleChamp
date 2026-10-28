import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import type { CategoryDetails, TournamentDetails } from '@polechamp/contracts';
import { useT } from '../../i18n';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { ScreenContainer } from '../../ui/layout/ScreenContainer';
import { ScreenHeader } from '../../ui/layout/ScreenHeader';
import { useStickyBarHeight } from '../../ui/layout/StickyActionBar';
import { OfflineBanner } from '../../ui/OfflineBanner';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { Skeleton } from '../../ui/Skeleton';
import { StatusPill } from '../../ui/StatusPill';
import { Text } from '../../ui/Text';
import { CategoryActionBar, type CategoryAction } from '../org/CategoryActionBar';

export type CategoryTab = 'criteria' | 'entries' | 'results';

const PILL = { DRAFT: 'draft', IN_PROGRESS: 'live', LOCKED: 'done' } as const;

export interface CategoryScreenProps {
  category: CategoryDetails | undefined;
  tournamentStatus: TournamentDetails['status'] | undefined;
  loading: boolean;
  error: boolean;
  canWrite: boolean;
  tab: CategoryTab;
  onTab: (tab: CategoryTab) => void;
  busy: CategoryAction | null;
  onBack: () => void;
  /** Etykieta wstecz wg poprzedniego ekranu (domyślnie „Turniej” – UX-11). */
  backLabel?: string;
  onRetry: () => void;
  onEdit: () => void;
  onAction: (action: CategoryAction) => void;
  onRejected: () => void;
  /** Treść aktywnej zakładki. */
  children: ReactNode;
  /** Arkusze ekranu. */
  sheets?: ReactNode;
}

/**
 * SCR-ORG-06/07/08 – rama szczegółów kategorii (IMP-261): meta w jednej linii (UI-11), nazwa,
 * pigułka, zakładki z licznikami i pasek akcji wg stanu kategorii i turnieju (TC-UI-024).
 */
export function CategoryScreen({
  category,
  tournamentStatus,
  loading,
  error,
  canWrite,
  tab,
  onTab,
  busy,
  onBack,
  backLabel,
  onRetry,
  onEdit,
  onAction,
  onRejected,
  children,
  sheets,
}: CategoryScreenProps) {
  const t = useT();
  const barHeight = useStickyBarHeight();
  const ready = category && tournamentStatus;
  const header = (
    <ScreenHeader
      back={{ label: backLabel ?? t('nav.tournament'), onPress: onBack }}
      actions={
        ready && tournamentStatus !== 'FINISHED' ? (
          <Button
            testID="category-edit"
            variant="iconRound"
            icon="pencil-simple"
            accessibilityLabel={t('org:category.edit')}
            disabled={!canWrite}
            onPress={onEdit}
          />
        ) : null
      }
    />
  );

  if (!ready) {
    return (
      <ScreenContainer testID="category-screen">
        {header}
        {error && !loading ? (
          <EmptyState variant="error" onRetry={onRetry} />
        ) : (
          <View testID="category-loading" style={styles.loading}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="80%" height={28} />
            <Skeleton width={96} height={20} />
            <Skeleton height={40} />
          </View>
        )}
      </ScreenContainer>
    );
  }

  const rejected = category.pendingRejectedSubmissions ?? 0;
  return (
    <>
      <ScreenContainer
        testID="category-screen"
        footerHeight={barHeight}
        footer={
          <CategoryActionBar
            category={category.status}
            tournament={tournamentStatus}
            onAction={onAction}
            canWrite={canWrite}
            busy={busy}
          />
        }
      >
        {header}
        <OfflineBanner />
        <Text variant="meta" color={color.neutral[400]} numberOfLines={1}>
          {t('org:category.meta', {
            style: t(`org:style.${category.style}`),
            level: t(`org:level.${category.level}`),
            ageGroup: category.ageGroup,
          })}
        </Text>
        <Text variant="titleM" accessibilityRole="header" style={styles.name}>
          {category.name}
        </Text>
        <View style={styles.pill}>
          <StatusPill variant={PILL[category.status]} testID="category-status" />
        </View>
        {rejected > 0 ? (
          <View style={styles.banner}>
            <Banner
              variant="rejected"
              text={t('org:category.rejected', { n: rejected })}
              onPress={onRejected}
            />
          </View>
        ) : null}
        <View style={styles.segments}>
          <SegmentedControl<CategoryTab>
            testID="category-tabs"
            value={tab}
            onChange={onTab}
            segments={[
              { key: 'criteria', label: t('org:category.tabCriteria'), count: category.criteria.length },
              { key: 'entries', label: t('org:category.tabEntries'), count: category.entryCount },
              { key: 'results', label: t('org:category.tabResults') },
            ]}
          />
        </View>
        {children}
      </ScreenContainer>
      {sheets}
    </>
  );
}

const styles = StyleSheet.create({
  loading: { gap: layout[12] },
  name: { marginTop: layout[4], marginBottom: layout[10] },
  pill: { flexDirection: 'row' },
  banner: { marginTop: layout[12] },
  segments: { marginVertical: layout[18] },
});
