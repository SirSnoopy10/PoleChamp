import { useEffect, useState } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import { EntryCreate, type EntryRow } from '@polechamp/contracts';
import { uuidv7 } from '../../data/api';
import { ApiError } from '../../data/api/errors';
import type { EntryPatchBody } from '../../data/org/entries';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { Checkbox, NumberField, TextField, useZodForm } from '../../ui/form';
import { ConfirmContent, Sheet, SheetHeader, SheetStep, useSheetStep } from '../../ui/sheet';
import { Text } from '../../ui/Text';
import { toast } from '../../ui/Toast';
import { applyFormError, toastSaveError } from '../categories/CategoryFormSheet';

type Values = {
  startNumber: number | null;
  fullName: string;
  club: string;
  birthYear: number | null;
  guardianConsentConfirmed: boolean;
};
type Step = 'form' | 'withdraw' | 'remove' | 'anonymize';

const ADULT_AGE = 18;
const isMinorByYear = (year: number | null) => year != null && new Date().getFullYear() - year < ADULT_AGE;

export interface EntrySheetProps {
  visible: boolean;
  onClose: () => void;
  /** Edycja (SCR-ORG-17); brak = nowa zawodniczka (SCR-ORG-11). */
  entry?: EntryRow;
  /** Podpowiedź numeru dla nowej (TC-STATE-015). */
  suggestedNumber: number;
  /** Kategoria lub turniej Zakończona – numer zablokowany, dane osobowe edytowalne (TL-17). */
  numberLocked: boolean;
  /** Zmiana listy (wycofanie, dodanie) – niedostępna w kategorii/turnieju Zakończona i offline. */
  canChangeList: boolean;
  onCreate: (body: EntryCreate, idempotencyKey: string) => Promise<unknown>;
  onUpdate: (entry: EntryRow, body: EntryPatchBody) => Promise<unknown>;
  onWithdraw: (entry: EntryRow) => Promise<unknown>;
  onRestore: (entry: EntryRow) => Promise<unknown>;
  onRemove: (entry: EntryRow) => Promise<unknown>;
  onAnonymize: (entry: EntryRow) => Promise<unknown>;
}

/**
 * SCR-ORG-11 / SCR-ORG-17 – zawodniczka (IMP-266, IMP-267): numer z podpowiedzią, zgoda opiekuna
 * dla niepełnoletniej, „Dodaj kolejną”; w edycji wycofanie/przywrócenie, „Usuń z listy” (bez ocen)
 * albo „Usuń dane osobowe” (po ocenach) – każda akcja z drugim krokiem.
 */
export function EntrySheet({
  visible,
  onClose,
  entry,
  suggestedNumber,
  numberLocked,
  canChangeList,
  onCreate,
  onUpdate,
  onWithdraw,
  onRestore,
  onRemove,
  onAnonymize,
}: EntrySheetProps) {
  const t = useT();
  const form = useZodForm(EntryCreate, {
    errorParams: {
      startNumber: { min: 1, max: 9999 },
      birthYear: { min: 1920, max: new Date().getFullYear() },
    },
  });
  const [key, setKey] = useState(uuidv7);
  const { step, setStep, reset } = useSheetStep<Step>('form');
  const birthYear = form.watch('birthYear') as number | null | undefined;
  const minor = isMinorByYear(birthYear ?? null) || (!!entry?.athlete.isMinor && birthYear == null);

  const blank = (number: number): Values => ({
    startNumber: number,
    fullName: '',
    club: '',
    birthYear: null,
    guardianConsentConfirmed: false,
  });

  useEffect(() => {
    if (!visible) return;
    reset();
    setKey(uuidv7());
    form.reset(
      (entry
        ? {
            startNumber: entry.startNumber,
            fullName: entry.athlete.fullName,
            club: entry.athlete.club ?? '',
            birthYear: null,
            guardianConsentConfirmed: entry.athlete.isMinor,
          }
        : blank(suggestedNumber)) as never,
    );
  }, [visible, entry?.id]);

  const fail = (e: unknown) => {
    if (e instanceof ApiError && e.fieldErrors.length) applyFormError(form as never, e, t as never);
    else toastSaveError(e);
  };

  const save = (another: boolean) =>
    form.handleSubmit(async (values) => {
      const parsed = EntryCreate.parse({
        ...values,
        isMinor: minor || undefined,
        guardianConsentConfirmed: minor ? values.guardianConsentConfirmed : undefined,
      });
      try {
        if (!entry) {
          await onCreate(parsed, key);
          toast.success('toasts:athleteAdded');
          if (another) {
            setKey(uuidv7());
            form.reset(blank(Math.min(9999, parsed.startNumber + 1)) as never);
          } else onClose();
          return;
        }
        const body: EntryPatchBody = {};
        if (!numberLocked && parsed.startNumber !== entry.startNumber) body.startNumber = parsed.startNumber;
        if (parsed.fullName !== entry.athlete.fullName) body.fullName = parsed.fullName;
        if ((parsed.club ?? null) !== (entry.athlete.club ?? null)) body.club = parsed.club ?? null;
        if (parsed.birthYear != null) body.birthYear = parsed.birthYear;
        if (parsed.isMinor) {
          body.isMinor = true;
          body.guardianConsentConfirmed = parsed.guardianConsentConfirmed;
        }
        if (Object.keys(body).length) await onUpdate(entry, body);
        onClose();
        toast.success('toasts:changesSaved');
      } catch (e) {
        fail(e);
      }
    });

  const run = async (action: (entry: EntryRow) => Promise<unknown>, success: string) => {
    if (!entry) return;
    try {
      await action(entry);
      onClose();
      toast.success(success);
    } catch (e) {
      setStep('form');
      toastSaveError(e);
    }
  };

  const title = t(entry ? 'org:entryForm.editTitle' : 'org:entryForm.newTitle');
  const scored = (entry?.judged.done ?? 0) > 0;
  const name = entry?.athlete.fullName ?? '';
  const fullNameError = form.fieldError('fullName') ? t('org:entryForm.fullNameError') : undefined;
  const consentError = form.fieldError('guardianConsentConfirmed')
    ? t('org:entryForm.consentError')
    : undefined;

  const confirm = {
    withdraw: {
      icon: 'user-minus' as const,
      title: t('org:entryForm.withdrawTitle', { name }),
      text: t('org:entryForm.withdrawText'),
      label: t('org:entryForm.withdrawConfirm'),
      onPress: () => void run(onWithdraw, 'toasts:athleteWithdrawn'),
    },
    remove: {
      icon: 'trash' as const,
      title: t('org:entryForm.removeTitle', { name }),
      text: undefined,
      label: t('org:entryForm.removeConfirm'),
      onPress: () => void run(onRemove, 'toasts:athleteRemoved'),
    },
    anonymize: {
      icon: 'trash' as const,
      title: t('org:entryForm.anonymizeTitle'),
      text: t('org:entryForm.anonymizeText', { nr: entry?.startNumber ?? '' }),
      label: t('org:entryForm.anonymizeConfirm'),
      onPress: () => void run(onAnonymize, 'toasts:athleteAnonymized'),
    },
  };

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel={title} testID="entry-sheet">
      <SheetStep stepKey={step}>
        {step === 'form' ? (
          <View style={styles.body}>
            <SheetHeader title={title} />
            <View style={styles.grid}>
              <View style={styles.number}>
                <Controller
                  control={form.control}
                  name="startNumber"
                  render={({ field }) => (
                    <NumberField
                      testID="entry-number"
                      label={t('org:entryForm.number')}
                      value={field.value as number | null}
                      onChange={(v) => field.onChange(v)}
                      editable={!numberLocked}
                      error={form.fieldError('startNumber')}
                    />
                  )}
                />
              </View>
              <View style={styles.cell}>
                <Controller
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <TextField
                      testID="entry-name"
                      label={t('org:entryForm.fullName')}
                      value={(field.value as string) ?? ''}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={fullNameError}
                      autoCapitalize="words"
                      autoComplete="off"
                      maxLength={100}
                    />
                  )}
                />
              </View>
            </View>
            <Controller
              control={form.control}
              name="club"
              render={({ field }) => (
                <TextField
                  testID="entry-club"
                  label={t('org:entryForm.club')}
                  value={(field.value as string | null) ?? ''}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={form.fieldError('club')}
                  maxLength={100}
                />
              )}
            />
            <Controller
              control={form.control}
              name="birthYear"
              render={({ field }) => (
                <NumberField
                  testID="entry-birth-year"
                  label={t('org:entryForm.birthYear')}
                  value={(field.value as number | null | undefined) ?? null}
                  onChange={(v) => field.onChange(v)}
                  error={form.fieldError('birthYear')}
                />
              )}
            />
            {minor ? (
              <Controller
                control={form.control}
                name="guardianConsentConfirmed"
                render={({ field }) => (
                  <View style={styles.consent}>
                    <Checkbox
                      testID="entry-consent"
                      checked={!!field.value}
                      onChange={field.onChange}
                      accessibilityLabel={t('org:entryForm.consent')}
                    >
                      <Text variant="bodyS">{t('org:entryForm.consent')}</Text>
                    </Checkbox>
                    {consentError ? (
                      <Text variant="caption" color={color.accentRamp[300]}>
                        {consentError}
                      </Text>
                    ) : null}
                  </View>
                )}
              />
            ) : null}
            <Button
              testID="entry-save"
              label={t(entry ? 'org:entryForm.save' : 'org:entryForm.add')}
              size={48}
              fullWidth
              disabled={!entry && !canChangeList}
              loading={form.formState.isSubmitting}
              onPress={() => void save(false)()}
            />
            {!entry ? (
              <Button
                testID="entry-add-another"
                variant="ghost"
                size={44}
                label={t('org:entryForm.addAnother')}
                disabled={!canChangeList}
                onPress={() => void save(true)()}
                style={styles.center}
              />
            ) : (
              <>
                {canChangeList ? (
                  entry.status === 'ACTIVE' ? (
                    <Button
                      testID="entry-withdraw"
                      variant="secondary"
                      destructive
                      icon="user-minus"
                      label={t('org:entryForm.withdraw')}
                      size={48}
                      fullWidth
                      onPress={() => setStep('withdraw')}
                    />
                  ) : (
                    <Button
                      testID="entry-restore"
                      variant="secondary"
                      label={t('org:entryForm.restore')}
                      size={48}
                      fullWidth
                      onPress={() => void run(onRestore, 'toasts:athleteRestored')}
                    />
                  )
                ) : null}
                {scored ? (
                  <Button
                    testID="entry-anonymize"
                    variant="ghost"
                    size={44}
                    label={t('org:entryForm.anonymize')}
                    onPress={() => setStep('anonymize')}
                    style={styles.center}
                  />
                ) : canChangeList ? (
                  <Button
                    testID="entry-remove"
                    variant="ghost"
                    size={44}
                    label={t('org:entryForm.remove')}
                    onPress={() => setStep('remove')}
                    style={styles.center}
                  />
                ) : null}
              </>
            )}
          </View>
        ) : (
          <ConfirmContent
            icon={confirm[step].icon}
            title={confirm[step].title}
            text={confirm[step].text}
            actions={
              <>
                <Button
                  testID="entry-confirm"
                  variant="secondary"
                  label={confirm[step].label}
                  size={48}
                  fullWidth
                  onPress={confirm[step].onPress}
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
  grid: { flexDirection: 'row', gap: layout[10] },
  number: { width: 96 },
  cell: { flex: 1 },
  consent: { gap: layout[4] },
  center: { alignSelf: 'center' },
});
