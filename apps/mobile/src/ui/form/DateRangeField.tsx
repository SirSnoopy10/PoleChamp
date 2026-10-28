import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { color } from '@polechamp/tokens';
import { formatTournamentDate } from '@polechamp/i18n';
import { useT } from '../../i18n';
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

/** Jedno okienko daty: ikona, tekst albo podpowiedź, opcjonalne czyszczenie. */
function DateBox({
  testID,
  label,
  text,
  empty,
  error,
  onPress,
  onClear,
  clearLabel,
}: {
  testID: string;
  label: string;
  text: string;
  empty: boolean;
  error: boolean;
  onPress: () => void;
  onClear?: () => void;
  clearLabel: string;
}) {
  return (
    <View style={[styles.field, { borderColor: error ? color.accentRamp[300] : color.neutral[600] }]}>
      <Pressable
        testID={`${testID}-open`}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}`}
        onPress={onPress}
        style={styles.value}
      >
        <Icon name="calendar-blank" size={18} color={color.neutral[400]} />
        <Text
          testID={`${testID}-value`}
          variant="body"
          color={empty ? color.neutral[500] : color.text}
          numberOfLines={1}
          style={styles.text}
        >
          {text}
        </Text>
      </Pressable>
      {onClear ? (
        <Pressable
          testID={`${testID}-clear`}
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          hitSlop={10}
          onPress={onClear}
        >
          <Icon name="x-circle" size={20} color={color.neutral[500]} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Pole daty turnieju: „Jeden dzień / Kilka dni”, natywny picker, czyszczenie (TC-UI-027, FR-202).
 * „Kilka dni” pokazuje drugie okienko z datą zakończenia; po wyborze początku picker końca otwiera się sam.
 */
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
  const startText = value.start
    ? formatTournamentDate(value.start, null)
    : (placeholder ?? t('form.pickDate'));
  const endText = value.end ? formatTournamentDate(value.end, null) : t('form.endDate');

  const pick = (field: Exclude<Picking, null>, iso: string) => {
    if (field === 'start') {
      // Koniec wcześniejszy niż nowy początek – wyczyszczony, do ponownego wyboru.
      const end = multi && value.end && value.end >= iso ? value.end : null;
      onChange({ start: iso, end });
      setPicking(null);
      // Android: dialog zamyka się po wyborze – drugi otwieramy po zamknięciu pierwszego.
      if (multi && !end) setTimeout(() => setPicking('end'), 0);
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
      <View style={styles.boxes}>
        <View style={styles.box}>
          <DateBox
            testID={testID}
            label={label}
            text={startText}
            empty={!value.start}
            error={!!error}
            onPress={() => setPicking('start')}
            onClear={value.start ? () => onChange({ start: null, end: null }) : undefined}
            clearLabel={t('form.clearDate')}
          />
        </View>
        {multi ? (
          <View style={styles.box}>
            <DateBox
              testID={`${testID}-end`}
              label={t('form.endDate')}
              text={endText}
              empty={!value.end}
              error={!!error}
              onPress={() => setPicking(value.start ? 'end' : 'start')}
              onClear={value.end ? () => onChange({ start: value.start, end: null }) : undefined}
              clearLabel={t('form.clearDate')}
            />
          </View>
        ) : null}
      </View>
      {picking && Platform.OS !== 'web' ? (
        <DateTimePicker
          key={picking}
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
  text: { flexShrink: 1 },
  boxes: { gap: 8 },
  box: {},
});
