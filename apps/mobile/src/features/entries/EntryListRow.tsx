import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import type { EntryRow } from '@polechamp/contracts';
import { useT } from '../../i18n';
import { Badge } from '../../ui/Badge';
import { Icon } from '../../ui/Icon';
import { ListRow } from '../../ui/list/GroupedList';
import { Text } from '../../ui/Text';

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
 * Wiersz zawodniczki (SCR-ORG-07, ekran „Zawodniczki” turnieju – UX-28): odznaka numeru, nazwisko i klub,
 * licznik ocen albo „Wycofana” (wyszarzona, nadal otwiera arkusz – przywrócenie).
 */
export function EntryListRow({ entry, onPress }: { entry: EntryRow; onPress: () => void }) {
  const t = useT();
  const withdrawn = entry.status === 'WITHDRAWN';
  return (
    <ListRow
      testID={`entry-${entry.id}`}
      minHeight={60}
      title={entry.athlete.fullName}
      subtitle={entry.athlete.club ?? undefined}
      muted={withdrawn}
      leading={<Badge variant="number" value={entry.startNumber} tone={withdrawn ? 'neutral' : 'accent'} />}
      trailing={
        withdrawn ? (
          <Text variant="caption" color={color.neutral[500]}>
            {t('org:entries.withdrawn')}
          </Text>
        ) : (
          <Counter done={entry.judged.done} expected={entry.judged.expected} />
        )
      }
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  counter: { flexDirection: 'row', alignItems: 'center', gap: layout[4] },
});
