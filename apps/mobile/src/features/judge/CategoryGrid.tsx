import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { judgeProgress } from '@polechamp/scoring';
import { color, layout } from '@polechamp/tokens';
import { visibleCategories, type CategoryStatus, type JudgeCategory } from '../../data/judge/queries';
import { useJudgeSession } from '../../data/judge/session';
import { useLocalQuery } from '../../data/judge/useLocalQuery';
import { useT } from '../../i18n';
import { Card } from '../../ui/cards/Card';
import { Icon } from '../../ui/Icon';
import { ProgressBar } from '../../ui/ProgressBar';
import { StatusPill } from '../../ui/StatusPill';
import { Text } from '../../ui/Text';
import { toast } from '../../ui/Toast';

const COLUMNS = 3;
const PILL: Record<CategoryStatus, 'draft' | 'live' | 'done'> = {
  DRAFT: 'draft',
  IN_PROGRESS: 'live',
  LOCKED: 'done',
};

function JudgeCategoryCard({ category, onPress }: { category: JudgeCategory; onPress: () => void }) {
  const t = useT();
  const draft = category.status === 'DRAFT';
  const progress = judgeProgress(category.scored, category.total);
  const progressText =
    draft || category.total === 0
      ? t('judge:categories.notStarted')
      : t('judge:categories.progress', { done: progress.done, total: progress.expected });
  return (
    <Card
      testID={`category-${category.id}`}
      padding={18}
      onPress={onPress}
      style={[styles.card, draft && styles.draft]}
      accessibilityLabel={t('judge:categories.cardA11y', {
        name: category.name,
        status: t(`common:categoryStatus.${category.status}`),
        progress: progressText,
      })}
    >
      <View style={styles.cardTop}>
        <StatusPill variant={PILL[category.status]} />
        {category.status === 'LOCKED' ? (
          <Icon name="lock-simple" size={16} color={color.neutral[400]} testID="category-locked-icon" />
        ) : null}
      </View>
      <View style={styles.names}>
        <Text variant="cardTitle" numberOfLines={2}>
          {category.name}
        </Text>
        <Text variant="caption" color={color.neutral[400]}>
          {t('judge:categories.styleLevel', {
            style: t(`org:style.${category.style}` as never),
            level: t(`org:level.${category.level}` as never),
          })}
        </Text>
      </View>
      <View style={styles.progress}>
        <ProgressBar value={draft ? 0 : progress.percent / 100} label={progressText} />
        <Text variant="caption" tabular color={color.neutral[400]}>
          {progressText}
        </Text>
      </View>
    </Card>
  );
}

/**
 * SCR-JDG-03 – kategorie sędziego (IMP-307): siatka 3 kolumn wg `position`, widoczność wg panelu
 * (TC-STATE-009), własny postęp; `W przygotowaniu` przygaszona i bez wejścia (toast). Dane z SQLite
 * odświeżane zdarzeniami synchronizacji (bez przeładowania ekranu).
 */
export function CategoryGrid() {
  const t = useT();
  const router = useRouter();
  const judge = useJudgeSession((s) => s.active);
  const judgeId = judge?.judgeId ?? '';
  const categories = useLocalQuery((db) => visibleCategories(db, judgeId), [judgeId]);
  const firstName = judge?.fullName.split(' ')[0] ?? '';

  const open = (c: JudgeCategory) => {
    if (c.status === 'DRAFT') toast.info('toasts:categoryNotStarted');
    else router.push(`/category/${c.id}`);
  };

  const rows: JudgeCategory[][] = [];
  for (let i = 0; i < categories.length; i += COLUMNS) rows.push(categories.slice(i, i + COLUMNS));

  return (
    <ScrollView testID="categories-screen" contentContainerStyle={styles.content}>
      <Text variant="titleL" accessibilityRole="header">
        {t('judge:categories.greeting', { name: firstName })}
      </Text>
      <Text variant="bodyS" color={color.neutral[400]} style={styles.subtitle}>
        {t('judge:categories.subtitle')}
      </Text>
      {categories.length === 0 ? (
        <Text
          variant="bodyS"
          align="center"
          color={color.neutral[400]}
          style={styles.empty}
          testID="categories-empty"
        >
          {t('judge:categories.empty')}
        </Text>
      ) : (
        <View style={styles.grid}>
          {rows.map((row, i) => (
            <View key={i} style={styles.row}>
              {/* Jeden niepełny wiersz – karty wyśrodkowane (UX-35). */}
              {rows.length === 1 && row.length < COLUMNS ? (
                <View style={{ flex: (COLUMNS - row.length) / 2 }} />
              ) : null}
              {row.map((c) => (
                <View key={c.id} style={styles.cell}>
                  <JudgeCategoryCard category={c} onPress={() => open(c)} />
                </View>
              ))}
              {rows.length === 1 && row.length < COLUMNS ? (
                <View style={{ flex: (COLUMNS - row.length) / 2 }} />
              ) : (
                Array.from({ length: COLUMNS - row.length }, (_, k) => (
                  <View key={`gap-${k}`} style={styles.cell} />
                ))
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: layout[28], paddingHorizontal: layout[28], paddingBottom: layout[48] },
  subtitle: { marginTop: layout[4], marginBottom: layout[24] },
  empty: { padding: layout[48] },
  grid: { gap: layout[14] },
  row: { flexDirection: 'row', gap: layout[14] },
  cell: { flex: 1 },
  card: { flex: 1, gap: layout[14] },
  draft: { opacity: 0.55 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  names: { gap: layout[4] },
  progress: { gap: layout[6] },
});
