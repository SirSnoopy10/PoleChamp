import { useRef, type ComponentRef } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, TextInput, View } from 'react-native';
import { layout } from '@polechamp/tokens';
import { TournamentCreate } from '@polechamp/contracts';
import { useT } from '../../i18n';
import { DateRangeField, TextField, type ZodForm } from '../../ui/form';

export const TournamentFormSchema = TournamentCreate;
export type TournamentFormValues = {
  name: string;
  startDate: string | null;
  endDate: string | null;
  venue?: string | null;
};

export const emptyTournament: TournamentFormValues = { name: '', startDate: null, endDate: null, venue: '' };

export interface TournamentFieldsProps {
  form: ZodForm<TournamentFormValues>;
  /** „Gotowe” na klawiaturze w ostatnim polu. */
  onSubmitEditing: () => void;
}

/** Pola SCR-ORG-02 / SCR-ORG-20: nazwa, siatka 2 kolumn – data i miejsce. */
export function TournamentFields({ form, onSubmitEditing }: TournamentFieldsProps) {
  const t = useT();
  const venueRef = useRef<ComponentRef<typeof TextInput>>(null);
  const nameError = form.fieldError('name') ? t('org:tournamentForm.nameError') : undefined;
  return (
    <View style={styles.root}>
      <Controller
        control={form.control}
        name="name"
        render={({ field }) => (
          <TextField
            testID="tournament-name"
            label={t('org:tournamentForm.name')}
            placeholder={t('org:tournamentForm.namePlaceholder')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={nameError}
            maxLength={120}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => venueRef.current?.focus()}
          />
        )}
      />
      <Controller
        control={form.control}
        name="startDate"
        render={({ field }) => (
          <DateRangeField
            testID="tournament-date"
            label={t('org:tournamentForm.date')}
            placeholder={t('org:tournamentForm.datePlaceholder')}
            value={{ start: field.value, end: form.watch('endDate') }}
            onChange={({ start, end }) => {
              field.onChange(start);
              form.setValue('endDate', end, { shouldValidate: form.formState.isSubmitted });
            }}
            error={form.fieldError('endDate')}
          />
        )}
      />
      <Controller
        control={form.control}
        name="venue"
        render={({ field }) => (
          <TextField
            ref={venueRef}
            testID="tournament-venue"
            label={t('org:tournamentForm.venue')}
            placeholder={t('org:tournamentForm.venuePlaceholder')}
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={form.fieldError('venue')}
            maxLength={120}
            returnKeyType="done"
            onSubmitEditing={onSubmitEditing}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: layout[14] },
});
