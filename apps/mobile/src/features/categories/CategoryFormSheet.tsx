import { useEffect, useState } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { layout } from '@polechamp/tokens';
import { CategoryCreate, Level, Style, type CategoryDetails } from '@polechamp/contracts';
import { uuidv7 } from '../../data/api';
import { ApiError } from '../../data/api/errors';
import type { CategoryPatchBody } from '../../data/org/categories';
import { useOnline } from '../../data/network/online';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { ChoiceChipGroup, TextField, useZodForm } from '../../ui/form';
import { ConfirmContent, Sheet, SheetHeader, SheetStep, useDirtyGuard, useSheetStep } from '../../ui/sheet';
import { toast } from '../../ui/Toast';

type CategoryValues = {
  name: string;
  style: (typeof Style.options)[number];
  level: (typeof Level.options)[number];
  ageGroup: string;
};

const NEW: CategoryValues = { name: '', style: 'POLE_SPORT', level: 'BEGINNER', ageGroup: 'Open' };

export interface CategoryFormSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Edycja – kategoria z wersją; brak = nowa. */
  category?: CategoryDetails;
  /** Zapisy dostępne (`useCanWrite`). */
  canWrite: boolean;
  onCreate?: (body: CategoryCreate, idempotencyKey: string) => Promise<unknown>;
  onUpdate?: (body: CategoryPatchBody, version: number) => Promise<unknown>;
  onDelete?: (version: number) => Promise<unknown>;
  /** Po usunięciu – powrót do SCR-ORG-03. */
  onDeleted?: () => void;
}

/**
 * Błędy pól z odpowiedzi API pod polami formularza. Kody domenowe przypisane do pola
 * (`START_NUMBER_TAKEN`, `JUDGE_NAME_TAKEN`) dostają tekst z katalogu błędów („Numer 47 jest już zajęty.”).
 */
export function applyFormError(
  form: {
    applyApiErrors: (issues: ApiError['fieldErrors']) => void;
    setError: (name: never, error: { type: string; message: string }) => void;
  },
  e: ApiError,
  t: (key: never, params?: Record<string, string | number>) => string,
  /** Parametry tekstu spoza odpowiedzi API, np. `{ nr }` dla `START_NUMBER_TAKEN` (UX-08). */
  extra: Record<string, string | number> = {},
) {
  if (e.code === 'VALIDATION_FAILED') return form.applyApiErrors(e.fieldErrors);
  for (const issue of e.fieldErrors) {
    form.setError(issue.field as never, {
      type: 'api',
      message: t(e.messageKey as never, { ...extra, ...e.messageParams }),
    });
  }
}

/** Komunikat błędu zapisu: katalog błędów API albo „Nie udało się zapisać…” (sieć). */
export function toastSaveError(e: unknown) {
  if (e instanceof ApiError && e.status > 0) toast.error(e.messageKey, e.messageParams);
  else toast.error('toasts:saveFailed');
}

/**
 * SCR-ORG-05 – nowa / edycja kategorii (IMP-260). Po starcie kategorii styl i poziom są nieaktywne;
 * edycja wysyła tylko zmienione pola, „Usuń kategorię” tylko w W przygotowaniu (drugi krok).
 */
export function CategoryFormSheet({
  visible,
  onClose,
  category,
  canWrite,
  onCreate,
  onUpdate,
  onDelete,
  onDeleted,
}: CategoryFormSheetProps) {
  const t = useT();
  const offline = !useOnline();
  const initial: CategoryValues = category
    ? { name: category.name, style: category.style, level: category.level, ageGroup: category.ageGroup }
    : NEW;
  const form = useZodForm<typeof CategoryCreate>(CategoryCreate, {
    defaultValues: initial,
    errorParams: { ageGroup: { max: 40 } },
  });
  const [key, setKey] = useState(uuidv7);
  const { step, setStep, reset } = useSheetStep<'form' | 'delete'>('form');
  const started = !!category && category.status !== 'DRAFT';

  useEffect(() => {
    if (!visible) return;
    form.reset(initial);
    setKey(uuidv7());
    reset();
  }, [visible, category?.version]);

  const submit = form.handleSubmit(async (values) => {
    const parsed = CategoryCreate.parse(values);
    try {
      if (!category) {
        await onCreate?.(parsed, key);
        onClose();
        toast.success('toasts:categoryAdded');
        return;
      }
      const body: CategoryPatchBody = {};
      if (parsed.name !== category.name) body.name = parsed.name;
      if (!started && parsed.style !== category.style) body.style = parsed.style;
      if (!started && parsed.level !== category.level) body.level = parsed.level;
      if (parsed.ageGroup !== category.ageGroup) body.ageGroup = parsed.ageGroup;
      if (Object.keys(body).length) await onUpdate?.(body, category.version);
      onClose();
      toast.success('toasts:changesSaved');
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors.length) form.applyApiErrors(e.fieldErrors);
      else toastSaveError(e);
    }
  });

  const remove = async () => {
    if (!category) return;
    try {
      await onDelete?.(category.version);
      onClose();
      onDeleted?.();
    } catch (e) {
      setStep('form');
      toastSaveError(e);
    }
  };

  const title = t(category ? 'org:categoryForm.editTitle' : 'org:categoryForm.newTitle');
  const styleOptions = Style.options.map((value) => ({ value, label: t(`org:style.${value}`) }));
  const levels = Level.options.map((value) => ({ value, label: t(`org:level.${value}`) }));
  const nameError = form.fieldError('name') ? t('org:categoryForm.nameError') : undefined;

  const dirty = form.formState.isDirty;
  const guard = useDirtyGuard(visible, dirty, onClose);

  return (
    <Sheet visible={visible} onClose={guard.close} accessibilityLabel={title} testID="category-sheet">
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
                    testID="category-name"
                    label={t('org:categoryForm.name')}
                    placeholder={t('org:categoryForm.namePlaceholder')}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={nameError}
                    maxLength={80}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="style"
                render={({ field }) => (
                  <ChoiceChipGroup
                    testID="category-style"
                    label={t('org:categoryForm.style')}
                    options={styleOptions}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={started}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="level"
                render={({ field }) => (
                  <ChoiceChipGroup
                    testID="category-level"
                    label={t('org:categoryForm.level')}
                    options={levels}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={started}
                    disabledHint={started ? t('org:categoryForm.lockedHint') : undefined}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="ageGroup"
                render={({ field }) => (
                  <TextField
                    testID="category-age"
                    label={t('org:categoryForm.ageGroup')}
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={form.fieldError('ageGroup')}
                    maxLength={40}
                  />
                )}
              />
              <Button
                testID="category-submit"
                label={t(category ? 'org:categoryForm.save' : 'org:categoryForm.create')}
                size={48}
                fullWidth
                disabled={!canWrite || (!!category && !dirty)}
                loading={form.formState.isSubmitting}
                onPress={() => void submit()}
              />
              {category?.status === 'DRAFT' ? (
                <Button
                  testID="category-delete"
                  variant="secondary"
                  destructive
                  icon="trash"
                  label={t('org:categoryForm.delete')}
                  size={48}
                  fullWidth
                  disabled={!canWrite}
                  onPress={() => setStep('delete')}
                />
              ) : null}
            </View>
          ) : (
            <ConfirmContent
              icon="trash"
              title={t('org:categoryForm.deleteTitle', { name: category?.name ?? '' })}
              text={t('org:categoryForm.deleteText')}
              actions={
                <>
                  <Button
                    testID="category-delete-confirm"
                    variant="secondary"
                    destructive
                    label={t('org:categoryForm.deleteConfirm')}
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
