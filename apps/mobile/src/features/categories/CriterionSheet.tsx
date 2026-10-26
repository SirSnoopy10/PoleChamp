import { useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { layout } from '@polechamp/tokens';
import { CriterionInput, type CategoryDetails } from '@polechamp/contracts';
import { ApiError } from '../../data/api/errors';
import type { CriterionBody } from '../../data/org/categories';
import { useOnline } from '../../data/network/online';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { NumberField, TextField, useZodForm } from '../../ui/form';
import { ConfirmContent, Sheet, SheetHeader, SheetStep, useSheetStep } from '../../ui/sheet';
import { toast } from '../../ui/Toast';
import { toastSaveError } from './CategoryFormSheet';

type Criterion = CategoryDetails['criteria'][number];
type Values = { name: string; scaleMax: number | null; weight: number | null; description: string };

const NEW: Values = { name: '', scaleMax: 10, weight: 1, description: '' };

export interface CriterionSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Edycja; brak = nowe kryterium. */
  criterion?: Criterion;
  onCreate: (body: CriterionBody) => Promise<unknown>;
  onUpdate: (id: string, body: Partial<CriterionBody>) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

/** Błędy zapisu konfiguracji: `CRITERIA_LOCKED` zamyka arkusz, reszta – toast z katalogu (IMP-263/264). */
export function handleConfigError(e: unknown, close: () => void, applyFields: (e: ApiError) => void) {
  if (e instanceof ApiError && e.fieldErrors.length) return applyFields(e);
  if (e instanceof ApiError && e.code === 'CRITERIA_LOCKED') close();
  toastSaveError(e);
}

/** SCR-ORG-09 – nowe / edycja / usunięcie kryterium (IMP-263). Waga ze stepperem −/+ 0,5. */
export function CriterionSheet({
  visible,
  onClose,
  criterion,
  onCreate,
  onUpdate,
  onDelete,
}: CriterionSheetProps) {
  const t = useT();
  const offline = !useOnline();
  const form = useZodForm(CriterionInput, { defaultValues: NEW as never });
  const { step, setStep, reset } = useSheetStep<'form' | 'delete'>('form');

  useEffect(() => {
    if (!visible) return;
    reset();
    form.reset(
      criterion
        ? {
            name: criterion.name,
            scaleMax: criterion.scaleMax,
            weight: criterion.weight,
            description: criterion.description ?? '',
          }
        : (NEW as never),
    );
  }, [visible, criterion?.id]);

  const fail = (e: unknown) => handleConfigError(e, onClose, (err) => form.applyApiErrors(err.fieldErrors));

  const submit = form.handleSubmit(async (values) => {
    const body = CriterionInput.parse(values);
    try {
      if (criterion) {
        await onUpdate(criterion.id, body);
        toast.success('toasts:criterionSaved');
      } else {
        await onCreate(body);
        toast.success('toasts:criterionAdded');
      }
      onClose();
    } catch (e) {
      fail(e);
    }
  });

  const remove = async () => {
    if (!criterion) return;
    try {
      await onDelete(criterion.id);
      onClose();
      toast.success('toasts:criterionDeleted');
    } catch (e) {
      setStep('form');
      fail(e);
    }
  };

  const title = t(criterion ? 'org:criterionForm.editTitle' : 'org:criterionForm.newTitle');
  const err = (name: 'name' | 'scaleMax' | 'weight', key: string) =>
    form.fieldError(name) ? t(key as never) : undefined;

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel={title} testID="criterion-sheet">
      <SheetStep stepKey={step}>
        {step === 'form' ? (
          <View style={styles.body}>
            <SheetHeader title={title} />
            <Controller
              control={form.control}
              name="name"
              render={({ field }) => (
                <TextField
                  testID="criterion-name"
                  label={t('org:criterionForm.name')}
                  placeholder={t('org:criterionForm.namePlaceholder')}
                  value={field.value as string}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={err('name', 'org:criterionForm.nameError')}
                  maxLength={60}
                />
              )}
            />
            <View style={styles.grid}>
              <View style={styles.cell}>
                <Controller
                  control={form.control}
                  name="scaleMax"
                  render={({ field }) => (
                    <NumberField
                      testID="criterion-scale"
                      label={t('org:criterionForm.scale')}
                      value={field.value as number | null}
                      onChange={(v) => field.onChange(v)}
                      error={err('scaleMax', 'org:criterionForm.scaleError')}
                    />
                  )}
                />
              </View>
              <View style={styles.cell}>
                <Controller
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <NumberField
                      testID="criterion-weight"
                      label={t('org:criterionForm.weight')}
                      value={field.value as number | null}
                      onChange={(v) => field.onChange(v)}
                      stepper={{ step: 0.5, min: 0.5, max: 5 }}
                      error={err('weight', 'org:criterionForm.weightError')}
                    />
                  )}
                />
              </View>
            </View>
            <Controller
              control={form.control}
              name="description"
              render={({ field }) => (
                <TextField
                  testID="criterion-description"
                  label={t('org:criterionForm.description')}
                  placeholder={t('org:criterionForm.descriptionPlaceholder')}
                  value={(field.value as string | null) ?? ''}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={form.fieldError('description')}
                  maxLength={200}
                />
              )}
            />
            <Button
              testID="criterion-save"
              label={t('org:criterionForm.save')}
              size={48}
              fullWidth
              loading={form.formState.isSubmitting}
              onPress={() => void submit()}
              disabled={offline}
            />
            {criterion ? (
              <Button
                testID="criterion-delete"
                variant="secondary"
                destructive
                icon="trash"
                label={t('org:criterionForm.delete')}
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
            title={t('org:criterionForm.deleteTitle', { name: criterion?.name ?? '' })}
            actions={
              <>
                <Button
                  testID="criterion-delete-confirm"
                  label={t('org:criterionForm.deleteConfirm')}
                  size={48}
                  fullWidth
                  onPress={() => void remove()}
                  disabled={offline}
                />
                <Button
                  variant="secondary"
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
  grid: { flexDirection: 'row', gap: layout[10] },
  cell: { flex: 1 },
});
