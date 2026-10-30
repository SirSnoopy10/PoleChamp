import { useRef, type ComponentRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import { formatTournamentDate } from '@polechamp/i18n';
import type { TournamentDetails } from '@polechamp/contracts';
import { STATUS_PILL } from '../../data/org/tournaments';
import { useT } from '../../i18n';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { CategoryCard } from '../../ui/cards/CategoryCard';
import { ProgressCard, StatTiles } from '../../ui/cards/StatTiles';
import { EmptyState } from '../../ui/EmptyState';
import { Icon } from '../../ui/Icon';
import { ScreenContainer } from '../../ui/layout/ScreenContainer';
import { ScreenHeader } from '../../ui/layout/ScreenHeader';
import { OfflineBanner } from '../../ui/OfflineBanner';
import { SectionHeader } from '../../ui/SectionHeader';
import { Skeleton, SkeletonCard } from '../../ui/Skeleton';
import { StatusPill } from '../../ui/StatusPill';
import { Text } from '../../ui/Text';
import { StartMissing } from '../org/StartMissing';

type Category = TournamentDetails['categories'][number];

/** Pigułka kategorii: w turnieju Zakończona kategoria `DRAFT` = „Nierozegrana” (TL-33). */
export function categoryPill(category: Category, tournamentStatus: TournamentDetails['status']) {
  if (category.status === 'DRAFT') return tournamentStatus === 'FINISHED' ? 'unplayed' : 'draft';
  return category.status === 'IN_PROGRESS' ? 'live' : 'done';
}

export interface TournamentDetailsScreenProps {
  tournament: TournamentDetails | undefined;
  loading: boolean;
  error: boolean;
  /** Zapisy dostępne (online i turniej niezakończony – `useCanWrite`). */
  canWrite: boolean;
  /** `me.emailVerified === false` – baner weryfikacji. */
  emailUnverified: boolean;
  starting: boolean;
  onBack: () => void;
  onRetry: () => void;
  onEdit: () => void;
  onPdf: () => void;
  onJudges: () => void;
  /** Kafelek „Zawodniczki” – lista według kategorii. */
  onAthletes?: () => void;
  onStart: () => void;
  onFinish: () => void;
  onAddCategory: () => void;
  onOpenCategory: (id: string) => void;
  onRejected: () => void;
  onResendCode: () => void;
  /** Arkusze ekranu (zakończenie, edycja, kategoria). */
  children?: ReactNode;
}

/** SCR-ORG-03 – szczegóły turnieju (IMP-257). Status tylko jako pigułka; brak akcji w Zakończona (UI-02). */
export function TournamentDetailsScreen({
  tournament: tour,
  loading,
  error,
  canWrite,
  emailUnverified,
  starting,
  onBack,
  onRetry,
  onEdit,
  onPdf,
  onJudges,
  onAthletes,
  onStart,
  onFinish,
  onAddCategory,
  onOpenCategory,
  onRejected,
  onResendCode,
  children,
}: TournamentDetailsScreenProps) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const categoriesY = useRef(0);
  const t = useT();
  const finished = tour?.status === 'FINISHED';

  const header = (
    <ScreenHeader
      back={{ label: t('nav.tournaments'), onPress: onBack }}
      actions={
        tour ? (
          <>
            {finished ? null : (
              <Button
                testID="tournament-edit"
                variant="iconRound"
                icon="pencil-simple"
                accessibilityLabel={t('org:tournament.edit')}
                disabled={!canWrite}
                onPress={onEdit}
              />
            )}
            <Button
              testID="tournament-pdf"
              variant="iconRound"
              icon="file-pdf"
              accessibilityLabel={t('org:tournament.pdf')}
              // PDF ma sens od pierwszej rozpoczętej kategorii (UX2-35).
              disabled={!tour.categories.some((c) => c.status !== 'DRAFT')}
              onPress={onPdf}
            />
          </>
        ) : null
      }
    />
  );

  if (!tour) {
    return (
      <ScreenContainer testID="tournament-screen">
        {header}
        {error && !loading ? (
          <EmptyState variant="error" onRetry={onRetry} />
        ) : (
          <View testID="tournament-loading" style={styles.loading}>
            <Skeleton width={96} height={20} />
            <Skeleton width="80%" height={28} />
            <Skeleton height={64} />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        )}
      </ScreenContainer>
    );
  }

  const { progress } = tour;
  // Daty to ISO `RRRR-MM-DD` – porównanie tekstowe (UX2-22).
  const lastDay = tour.endDate ?? tour.startDate;
  const overdue =
    tour.status === 'IN_PROGRESS' && !!lastDay && lastDay < new Date().toISOString().slice(0, 10);
  const summary = progress.startedCategories
    ? t('org:progressSummary', { done: progress.done, expected: progress.expected })
    : t('org:noStartedCategories');
  const statusAction =
    tour.status === 'DRAFT' ? (
      // Start tylko z ≥ 1 kategorią i ≥ 1 aktywnym sędzią, z potwierdzeniem (decyzja PO IMP-705c, UX-06).
      <View style={styles.startAction}>
        <Button
          testID="tournament-start"
          label={t('org:tournament.start')}
          icon="play"
          size={44}
          disabled={!canWrite || !tour.stats.categories || !tour.stats.judges}
          loading={starting}
          onPress={onStart}
        />
        <StartMissing
          testID="tournament-start-hint"
          items={[
            ...(tour.stats.categories
              ? []
              : [{ key: 'category', label: t('org:tournament.addCategory'), onPress: onAddCategory }]),
            ...(tour.stats.judges
              ? []
              : [{ key: 'judge', label: t('org:tournament.addJudge'), onPress: onJudges }]),
          ]}
        />
      </View>
    ) : tour.status === 'IN_PROGRESS' ? (
      <Button
        testID="tournament-finish"
        variant="secondary"
        label={t('org:tournament.finish')}
        icon="flag-checkered"
        size={44}
        disabled={!canWrite}
        onPress={onFinish}
      />
    ) : undefined;

  return (
    <ScreenContainer testID="tournament-screen" scrollRef={scrollRef}>
      {header}
      <OfflineBanner />
      <View style={styles.head}>
        <View style={styles.pill}>
          <StatusPill variant={STATUS_PILL[tour.status]} testID="tournament-status" />
        </View>
        <Text variant="titleM" accessibilityRole="header" style={styles.name}>
          {tour.name}
        </Text>
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Icon name="calendar-blank" size={14} color={color.neutral[400]} />
            <Text variant="meta" color={color.neutral[400]}>
              {formatTournamentDate(tour.startDate, tour.endDate)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="map-pin" size={14} color={color.neutral[400]} />
            <Text variant="meta" color={color.neutral[400]}>
              {tour.venue ?? t('org:tournaments.placeTbd')}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.tiles}>
        <StatTiles
          tiles={[
            {
              label: t('org:tournament.categories'),
              value: tour.stats.categories,
              // Wszystkie kafle klikalne (UX-27): „Kategorie” przewija do sekcji kategorii.
              onPress: () => scrollRef.current?.scrollTo({ y: categoriesY.current, animated: true }),
              accessibilityLabel: t('org:tournament.categoriesA11y', { n: tour.stats.categories }),
            },
            {
              label: t('org:tournament.athletes'),
              value: tour.stats.athletes,
              onPress: onAthletes,
              accessibilityLabel: t('org:tournament.athletesA11y', { n: tour.stats.athletes }),
            },
            {
              label: t('org:tournament.judges'),
              value: tour.stats.judges,
              onPress: onJudges,
              accessibilityLabel: t('org:tournament.judgesA11y', { n: tour.stats.judges }),
            },
          ]}
        />
        {tour.stats.categories || tour.stats.athletes || tour.stats.judges ? (
          <Text variant="caption" color={color.neutral[500]} testID="tiles-note">
            {t('org:tournament.tilesNote')}
          </Text>
        ) : null}
      </View>
      <View style={styles.banners}>
        {overdue ? (
          <Banner variant="emailVerify" text={t('org:tournament.overdue')} testID="tournament-overdue" />
        ) : null}
        {emailUnverified && !finished ? <Banner variant="emailVerify" onAction={onResendCode} /> : null}
        {tour.pendingRejectedSubmissions > 0 ? (
          <Banner
            variant="rejected"
            muted={finished}
            text={t(finished ? 'org:tournament.rejectedFinished' : 'org:tournament.rejected', {
              n: tour.pendingRejectedSubmissions,
            })}
            onPress={onRejected}
          />
        ) : null}
      </View>
      <View style={styles.progress}>
        <ProgressCard pct={progress.percent} summary={summary} action={statusAction} />
      </View>
      <View onLayout={(e) => (categoriesY.current = e.nativeEvent.layout.y)} />
      <SectionHeader
        title={t('org:tournament.categories')}
        onAdd={finished || !canWrite ? undefined : onAddCategory}
        addAccessibilityLabel={t('org:tournament.addCategoryA11y')}
      />
      <View style={styles.categories}>
        {tour.categories.length ? (
          tour.categories.map((c) => (
            <CategoryCard
              key={c.id}
              testID={`category-${c.id}`}
              name={c.name}
              style={t(`org:style.${c.style}`)}
              level={t(`org:level.${c.level}`)}
              athletes={c.entryCount}
              status={categoryPill(c, tour.status)}
              done={c.progress.done}
              expected={c.progress.expected}
              onPress={() => onOpenCategory(c.id)}
            />
          ))
        ) : (
          <EmptyState
            variant="framed"
            icon="squares-four"
            text={t('org:tournament.noCategories')}
            onPress={finished || !canWrite ? undefined : onAddCategory}
          />
        )}
      </View>
      {children}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  startAction: { gap: layout[6] },
  loading: { gap: layout[12] },
  head: { gap: layout[8] },
  pill: { flexDirection: 'row' },
  name: { marginTop: layout[4] },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: layout[14], rowGap: layout[4] },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: layout[4] },
  tiles: { marginTop: layout[22], marginBottom: layout[12], gap: layout[6] },
  banners: { gap: layout[8], marginBottom: layout[12] },
  progress: { marginBottom: layout[28] },
  categories: { gap: layout[10] },
});
