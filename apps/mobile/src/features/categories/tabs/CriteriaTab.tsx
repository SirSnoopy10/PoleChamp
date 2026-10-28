import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import type { CategoryDetails } from '@polechamp/contracts';
import { useT } from '../../../i18n';
import { Badge } from '../../../ui/Badge';
import { EmptyState } from '../../../ui/EmptyState';
import { Icon } from '../../../ui/Icon';
import { GroupedList, ListRow } from '../../../ui/list/GroupedList';
import { SectionHeader } from '../../../ui/SectionHeader';
import { Text } from '../../../ui/Text';
import { formatNumber } from '../../../ui/form';

/** Liczba z API (np. 1.5) → dziesiąte dla formaterów `@polechamp/scoring`. */
export const toTenths = (value: number) => Math.round(value * 10);

type Criterion = CategoryDetails['criteria'][number];
type Penalty = CategoryDetails['penaltyTypes'][number];

export interface CriteriaTabProps {
  category: Pick<CategoryDetails, 'criteria' | 'penaltyTypes' | 'maxJudgeScore'>;
  /** Kategoria W przygotowaniu i zapisy dostępne – „Dodaj” i edycja wierszy. */
  editable: boolean;
  /** Kategoria rozpoczęta – informacja z kłódką. */
  locked: boolean;
  onAddCriterion: () => void;
  onEditCriterion: (criterion: Criterion) => void;
  onAddPenalty: () => void;
  onEditPenalty: (penalty: Penalty) => void;
}

/** SCR-ORG-06 – zakładka Kryteria (IMP-262): dane z `['category', id]`, bez osobnego zapytania. */
export function CriteriaTab({
  category,
  editable,
  locked,
  onAddCriterion,
  onEditCriterion,
  onAddPenalty,
  onEditPenalty,
}: CriteriaTabProps) {
  const t = useT();
  const criteria = [...category.criteria].sort((a, b) => a.position - b.position);
  const penalties = [...category.penaltyTypes].sort((a, b) => a.position - b.position);
  return (
    <View testID="criteria-tab" style={styles.root}>
      {locked ? (
        <View testID="criteria-locked" style={styles.info}>
          <Icon name="lock-simple" size={14} color={color.neutral[400]} />
          <Text variant="caption" color={color.neutral[400]} style={styles.infoText}>
            {t('errors:CRITERIA_LOCKED')}
          </Text>
        </View>
      ) : null}
      <View style={styles.section}>
        <SectionHeader
          title={t('org:criteria.title')}
          onAdd={editable ? onAddCriterion : undefined}
          addAccessibilityLabel={t('org:criteria.addCriterionA11y')}
        />
        <GroupedList testID="criteria-list">
          {criteria.map((c) => (
            <ListRow
              key={c.id}
              testID={`criterion-${c.id}`}
              title={c.name}
              subtitle={
                c.step === 0.5
                  ? t('org:criteria.scale', { max: c.scaleMax })
                  : t('org:criteria.scaleStep', { max: c.scaleMax, step: formatNumber(c.step) })
              }
              trailing={<Badge variant="weight" value={toTenths(c.weight)} />}
              inactive={!editable}
              onPress={editable ? () => onEditCriterion(c) : undefined}
            />
          ))}
        </GroupedList>
        <View style={styles.info}>
          <Icon name="info" size={14} color={color.neutral[400]} />
          <Text variant="caption" color={color.neutral[400]} style={styles.infoText}>
            {t('org:maxJudgeScore', { max: String(category.maxJudgeScore).replace('.', ',') })}
          </Text>
        </View>
      </View>
      <View style={styles.section}>
        <SectionHeader
          title={t('org:criteria.penalties')}
          onAdd={editable ? onAddPenalty : undefined}
          addAccessibilityLabel={t('org:criteria.addPenaltyA11y')}
        />
        {penalties.length ? (
          <GroupedList testID="penalties-list">
            {penalties.map((p) => (
              <ListRow
                key={p.id}
                testID={`penalty-${p.id}`}
                title={p.name}
                subtitle={t('org:criteria.maxPerRun', { n: p.maxOccurrences })}
                trailing={<Badge variant="penalty" value={toTenths(p.points)} />}
                inactive={!editable}
                onPress={editable ? () => onEditPenalty(p) : undefined}
              />
            ))}
          </GroupedList>
        ) : (
          <EmptyState variant="inline" text={t('org:criteria.noPenalties')} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: layout[22] },
  section: { gap: layout[4] },
  info: { flexDirection: 'row', alignItems: 'center', gap: layout[6], marginTop: layout[8] },
  infoText: { flex: 1 },
});
