import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { color } from '@polechamp/tokens';
import { formatTournamentDate } from '@polechamp/i18n';
import { useT } from '../../i18n';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { ChoiceChipGroup } from './ChoiceChipGroup';
import { FieldFrame } from './FieldFrame';

export interface DateRange {
  start: string | null;
  end: string | null;
}

/** Data kalendarzowa `YYYY-MM-DD` z daty lokalnej pickera (bez przesunięcia strefy). */
export const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromIsoDate = (iso: string | null) => {
  if (!iso) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

export interface DateRangeFieldProps {
  label: string;
  value: DateRange;
  onChange: (value: DateRange) => void;
  error?: string;
  placeholder?: string;
  testID?: string;
}

type Picking = 'start' | 'end' | null;

/** Pole daty turnieju: „Jeden dzień / Kilka dni”, natywny picker, czyszczenie (TC-UI-027, FR-202). */
export function DateRangeField({
  label,
  value,
  onChange,
  error,
  placeholder,
  testID = 'date-range',
}: DateRangeFieldProps) {
  const t = useT();
  const [multi, setMulti] = useState(!!value.end && value.end !== value.start);
  const [picking, setPicking] = useState<Picking>(null);
  const empty = !value.start;
  const text = empty
    ? (placeholder ?? t('form.pickDate'))
    : formatTournamentDate(value.start, multi ? value.end : null);

  const pick = (field: Exclude<Picking, null>, iso: string) => {
    if (field === 'start') {
      const end = multi && value.end && value.end < iso ? iso : multi ? value.end : null;
      onChange({ start: iso, end });
      if (multi && !value.end) setPicking('end');
      else setPicking(null);
    } else {
      onChange({ start: value.start ?? iso, end: iso });
      setPicking(null);
    }
  };

  const onPicked = (_event: DateTimePickerChangeEvent, date: Date) => {
    if (picking) pick(picking, toIsoDate(date));
  };

  return (
    <FieldFrame label={label} error={error}>
      <ChoiceChipGroup
        options={[
          { value: 'single', label: t('form.singleDay') },
          { value: 'multi', label: t('form.multipleDays') },
        ]}
        value={multi ? 'multi' : 'single'}
        onChange={(v) => {
          setMulti(v === 'multi');
          if (v === 'single' && value.end) onChange({ start: value.start, end: null });
        }}
      />
      <View style={[styles.field, { borderColor: error ? color.accentRamp[300] : color.neutral[600] }]}>
        <Pressable
          testID={`${testID}-open`}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${text}`}
          onPress={() => setPicking('start')}
          style={styles.value}
        >
          <Icon name="calendar-blank" size={18} color={color.neutral[400]} />
          <Text
            testID={`${testID}-value`}
            variant="body"
            color={empty ? color.neutral[500] : color.text}
            numberOfLines={1}
          >
            {text}
          </Text>
        </Pressable>
        {multi && value.start ? (
          <Button
            variant="ghost"
            size={44}
            label={t('form.endDate')}
            onPress={() => setPicking('end')}
            testID={`${testID}-end`}
          />
        ) : null}
        {!empty ? (
          <Pressable
            testID={`${testID}-clear`}
            accessibilityRole="button"
            accessibilityLabel={t('form.clearDate')}
            hitSlop={10}
            onPress={() => onChange({ start: null, end: null })}
          >
            <Icon name="x-circle" size={20} color={color.neutral[500]} />
          </Pressable>
        ) : null}
      </View>
      {picking && Platform.OS !== 'web' ? (
        <DateTimePicker
          testID={`${testID}-picker`}
          value={fromIsoDate(picking === 'end' ? (value.end ?? value.start) : value.start)}
          minimumDate={picking === 'end' && value.start ? fromIsoDate(value.start) : undefined}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          locale="pl-PL"
          themeVariant="dark"
          accentColor={color.accent}
          onValueChange={onPicked}
          onDismiss={() => setPicking(null)}
        />
      ) : null}
    </FieldFrame>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: color.bg,
  },
  value: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
});
