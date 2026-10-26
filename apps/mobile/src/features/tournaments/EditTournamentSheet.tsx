import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { layout } from '@polechamp/tokens';
import { TournamentCreate, type TournamentDetails } from '@polechamp/contracts';
import { ApiError } from '../../data/api/errors';
import type { TournamentPatchBody } from '../../data/org/tournament';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { useZodForm } from '../../ui/form';
import { ConfirmContent, Sheet, SheetHeader, SheetStep, useSheetStep } from '../../ui/sheet';
import { toast } from '../../ui/Toast';
import { TournamentFields, type TournamentFormValues } from './TournamentFields';

export interface EditTournamentSheetProps {
  visible: boolean;
  onClose: () => void;
  tournament: TournamentDetails;
  onSave: (body: TournamentPatchBody, version: number) => Promise<unknown>;
  onDelete: (version: number) => Promise<unknown>;
  /** Po usunięciu – powrót do SCR-ORG-01. */
  onDeleted: () => void;
}

const valuesOf = (t: TournamentDetails): TournamentFormValues => ({
  name: t.name,
  startDate: t.startDate,
  endDate: t.endDate,
  venue: t.venue ?? '',
});

/** Pola zmienione względem turnieju – `PATCH` wysyła tylko je. */
function changes(t: TournamentDetails, next: ReturnType<typeof TournamentCreate.parse>): TournamentPatchBody {
  const body: TournamentPatchBody = {};
  if (next.name !== t.name) body.name = next.name;
  if (next.startDate !== t.startDate) body.startDate = next.startDate;
  if (next.endDate !== t.endDate) body.endDate = next.endDate;
  if ((next.venue ?? null) !== t.venue) body.venue = next.venue ?? null;
  return body;
}

/**
 * SCR-ORG-20 – edycja turnieju (IMP-259): pola jak SCR-ORG-02, „Usuń turniej” tylko w W przygotowaniu
 * z drugim krokiem. `CONFLICT_VERSION` → toast z katalogu i formularz z odświeżonych danych.
 */
export function EditTournamentSheet({
  visible,
  onClose,
  tournament,
  onSave,
  onDelete,
  onDeleted,
}: EditTournamentSheetProps) {
  const t = useT();
  const form = useZodForm<typeof TournamentCreate>(TournamentCreate, {
    defaultValues: valuesOf(tournament),
    errorParams: { venue: { max: 120 } },
  });
  const { step, setStep, reset } = useSheetStep<'form' | 'delete'>('form');

  useEffect(() => {
    if (visible) {
      form.reset(valuesOf(tournament));
      reset();
    }
    // Formularz z aktualnej wersji (także po `CONFLICT_VERSION`).
  }, [visible, tournament.version]);

  const fail = (e: unknown) => {
    if (e instanceof ApiError && e.fieldErrors.length) form.applyApiErrors(e.fieldErrors);
    else if (e instanceof ApiError && e.status > 0) toast.error(e.messageKey, e.messageParams);
    else toast.error('toasts:saveFailed');
  };

  const save = form.handleSubmit(async (values: TournamentFormValues) => {
    const body = changes(tournament, TournamentCreate.parse(values));
    try {
      if (Object.keys(body).length) await onSave(body, tournament.version);
      onClose();
      toast.success('toasts:changesSaved');
    } catch (e) {
      fail(e);
    }
  });

  const remove = async () => {
    try {
      await onDelete(tournament.version);
      onClose();
      onDeleted();
    } catch (e) {
      setStep('form');
      fail(e);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel={t('org:tournamentForm.editTitle')}>
      <SheetStep stepKey={step}>
        {step === 'form' ? (
          <View style={styles.body}>
            <SheetHeader title={t('org:tournamentForm.editTitle')} />
            <TournamentFields form={form} onSubmitEditing={() => void save()} />
            <Button
              testID="tournament-save"
              label={t('org:tournamentForm.save')}
              size={48}
              fullWidth
              loading={form.formState.isSubmitting}
              onPress={() => void save()}
            />
            {tournament.status === 'DRAFT' ? (
              <Button
                testID="tournament-delete"
                variant="secondary"
                destructive
                icon="trash"
                label={t('org:tournamentForm.delete')}
                size={48}
                fullWidth
                onPress={() => setStep('delete')}
              />
            ) : null}
          </View>
        ) : (
          <ConfirmContent
            icon="trash"
            title={t('org:tournamentForm.deleteTitle', { name: tournament.name })}
            text={t('org:tournamentForm.deleteText')}
            actions={
              <>
                <Button
                  testID="tournament-delete-confirm"
                  variant="secondary"
                  label={t('org:tournamentForm.deleteConfirm')}
                  size={48}
                  fullWidth
                  onPress={() => void remove()}
                />
                <Button
                  variant="ghost"
                  label={t('common:cancel')}
                  size={48}
                  fullWidth
                  onPress={() => setStep('form')}
                />
              </>
            }
          />
        )}
      </SheetStep>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: layout[14] },
});
