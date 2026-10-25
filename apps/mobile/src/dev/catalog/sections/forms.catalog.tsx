import { useState } from 'react';
import { View } from 'react-native';
import {
  ChoiceChipGroup,
  DateRangeField,
  NumberField,
  TextArea,
  TextField,
  type DateRange,
} from '../../../ui/form';
import { registerSection } from '../registry';

const STYLES = [
  { value: 'sport', label: 'Pole Sport' },
  { value: 'exotic', label: 'Exotic' },
  { value: 'art', label: 'Pole Art' },
] as const;

function Fields() {
  const [name, setName] = useState('Mi');
  const [weight, setWeight] = useState<number | null>(1.5);
  const [comment, setComment] = useState('');
  const [style, setStyle] = useState<(typeof STYLES)[number]['value']>('sport');
  const [dates, setDates] = useState<DateRange>({ start: '2026-10-03', end: '2026-10-04' });
  return (
    <View style={{ gap: 14 }}>
      <TextField label="Nazwa turnieju" value="Mistrzostwa Polski" onChangeText={() => undefined} />
      <TextField
        label="Nazwa turnieju"
        value={name}
        onChangeText={setName}
        error="Za krótki tekst (min. 3 znaki)."
      />
      <NumberField label="Waga" value={weight} onChange={setWeight} stepper={{ min: 0.5, max: 5 }} />
      <TextArea label="Komentarz (opcjonalnie)" value={comment} onChangeText={setComment} counterFrom={0} />
      <ChoiceChipGroup label="Styl" options={STYLES} value={style} onChange={setStyle} />
      <ChoiceChipGroup
        label="Styl"
        options={STYLES}
        value="exotic"
        onChange={() => undefined}
        disabled
        disabledHint="Kategoria trwa – zmiana niedostępna."
      />
      <DateRangeField label="Data" value={dates} onChange={setDates} placeholder="Data do ustalenia" />
    </View>
  );
}

registerSection({
  id: 'forms',
  title: 'Formularze',
  cases: [{ id: 'fields', title: 'Pola, błędy, stepper, chipy, data', render: () => <Fields /> }],
});
