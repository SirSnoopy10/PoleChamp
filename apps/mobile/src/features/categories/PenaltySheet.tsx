import { useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { layout } from '@polechamp/tokens';
import { PenaltyTypeInput, type CategoryDetails } from '@polechamp/contracts';
import type { PenaltyBody } from '../../data/org/categories';
import { useOnline } from '../../data/network/online';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { NumberField, TextField, useZodForm } from '../../ui/form';
import { ConfirmContent, Sheet, SheetHeader, SheetStep, useDirtyGuard, useSheetStep } from '../../ui/sheet';
import { toast } from '../../ui/Toast';
import { handleConfigError } from './CriterionSheet';

type Penalty = CategoryDetails['penaltyTypes'][number];
const NEW = { name: '', points: 1, maxOccurrences: 3 };

export interface PenaltySheetProps {
  visible: boolean;
  onClose: () => void;
  penalty?: Penalty;
  onCreate: (body: PenaltyBody) => Promise<unknown>;
  onUpdate: (id: string, body: Partial<PenaltyBody>) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

/** SCR-ORG-10 – nowa / edycja / usunięcie kary (IMP-264). */
export function PenaltySheet({ visible, onClose, penalty, onCreate, onUpdate, onDelete }: PenaltySheetProps) {
  const t = useT();
  const offline = !useOnline();
  const form = useZodForm(PenaltyTypeInput, { defaultValues: NEW });
  const { step, setStep, reset } = useSheetStep<'form' | 'delete'>('form');

  useEffect(() => {
    if (!visible) return;
    reset();
    form.reset(
      penalty ? { name: penalty.name, points: penalty.points, maxOccurrences: penalty.maxOccurrences } : NEW,
    );
  }, [visible, penalty?.id]);

  const fail = (e: unknown) => handleConfigError(e, onClose, (err) => form.applyApiErrors(err.fieldErrors));

  const submit = form.handleSubmit(async (values) => {
    const body = PenaltyTypeInput.parse(values);
    try {
      if (penalty) {
        await onUpdate(penalty.id, body);
        toast.success('toasts:penaltySaved');
      } else {
        await onCreate(body);
        toast.success('toasts:penaltyAdded');
      }
      onClose();
    } catch (e) {
      fail(e);
    }
  });

  const remove = async () => {
    if (!penalty) return;
    try {
      await onDelete(penalty.id);
      onClose();
      toast.success('toasts:penaltyDeleted');
    } catch (e) {
      setStep('form');
      fail(e);
    }
  };

  const dirty = form.formState.isDirty;
  const guard = useDirtyGuard(visible, dirty, onClose);
  const title = t(penalty ? 'org:penaltyForm.editTitle' : 'org:penaltyForm.newTitle');
  const err = (name: 'name' | 'points' | 'maxOccurrences', key: string) =>
    form.fieldError(name) ? t(key as never) : undefined;

  return (
    <Sheet visible={visible} onClose={guard.close} accessibilityLabel={title} testID="penalty-sheet">
      {guard.prompt ?? (
        <SheetStep stepKey={step}>
          {step === 'form' ? (
            <View style={styles.body}>
              <SheetHeader title={title} />
              <Controller
                control={form.control}
                name="name"
                render={({ field }) => (
                  <TextField
                    testID="penalty-name"
                    label={t('org:penaltyForm.name')}
                    placeholder={t('org:penaltyForm.namePlaceholder')}
                    value={field.value as string}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={err('name', 'org:penaltyForm.nameError')}
                    maxLength={60}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="points"
                render={({ field }) => (
                  <NumberField
                    testID="penalty-points"
                    label={t('org:penaltyForm.points')}
                    value={field.value as number | null}
                    onChange={(v) => field.onChange(v)}
                    stepper={{ step: 0.5, min: 0.5, max: 50 }}
                    error={err('points', 'org:penaltyForm.pointsError')}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="maxOccurrences"
                render={({ field }) => (
                  <NumberField
                    testID="penalty-max"
                    label={t('org:penaltyForm.max')}
                    value={field.value as number | null}
                    onChange={(v) => field.onChange(v)}
                    stepper={{ step: 1, min: 1, max: 10 }}
                    error={err('maxOccurrences', 'org:penaltyForm.maxError')}
                  />
                )}
              />
              <Button
                testID="penalty-save"
                label={t('org:penaltyForm.save')}
                size={48}
                fullWidth
                loading={form.formState.isSubmitting}
                onPress={() => void submit()}
                disabled={offline || (!!penalty && !dirty)}
              />
              {penalty ? (
                <Button
                  testID="penalty-delete"
                  variant="secondary"
                  destructive
                  icon="trash"
                  label={t('org:penaltyForm.delete')}
                  size={48}
                  fullWidth
                  onPress={() => setStep('delete')}
                  disabled={offline}
                />
              ) : null}
            </View>
          ) : (
            <ConfirmContent
              icon="trash"
              title={t('org:penaltyForm.deleteTitle', { name: penalty?.name ?? '' })}
              actions={
                <>
                  <Button
                    testID="penalty-delete-confirm"
                    variant="secondary"
                    destructive
                    label={t('org:penaltyForm.deleteConfirm')}
                    size={48}
                    fullWidth
                    onPress={() => void remove()}
                    disabled={offline}
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
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: layout[14] },
});
