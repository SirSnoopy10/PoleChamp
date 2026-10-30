import { useEffect, useState } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { copySecret } from '../../data/secure/clipboard';
import { z } from 'zod';
import { color, layout, radius } from '@polechamp/tokens';
import { JudgePatch, type JudgeRow } from '@polechamp/contracts';
import { uuidv7 } from '../../data/api';
import { ApiError } from '../../data/api/errors';
import type { JudgeWithPin } from '../../data/org/judges';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { TextField, useZodForm } from '../../ui/form';
import { Icon } from '../../ui/Icon';
import { ConfirmContent, Sheet, SheetHeader, SheetStep, useSheetStep } from '../../ui/sheet';
import { Text } from '../../ui/Text';
import { toast } from '../../ui/Toast';
import { applyFormError, toastSaveError } from '../categories/CategoryFormSheet';

const JudgeFields = z.object({
  fullName: JudgePatch.shape.fullName.unwrap(),
  initials: JudgePatch.shape.initials,
});
type Step = 'form' | 'reset' | 'delete' | 'deactivate' | 'pin' | 'pinConfirm';

/** Krok PIN (IMP-274): 4 cyfry, „Kopiuj”, ostrzeżenie – PIN tylko w stanie arkusza. */
export function PinRevealStep({ judge, onDone }: { judge: JudgeWithPin; onDone: () => void }) {
  const t = useT();
  const digits = judge.pin.split('');
  return (
    <View style={styles.body} testID="pin-step">
      <SheetHeader title={t('org:judgeForm.pinTitle', { name: judge.fullName })} />
      <View
        style={styles.pinCard}
        accessible
        accessibilityLabel={t('org:judgeForm.pinA11y', { digits: digits.join(' ') })}
      >
        {digits.map((d, i) => (
          <Text key={i} variant="pin" tabular color={color.accentRamp[200]}>
            {d}
          </Text>
        ))}
      </View>
      <Button
        testID="pin-copy"
        variant="ghost"
        icon="copy"
        size={44}
        label={t('org:judgeForm.copy')}
        onPress={() => void copySecret(judge.pin).then(() => toast.success('toasts:pinCopied'))}
        style={styles.center}
      />
      <View style={styles.warning}>
        <Icon name="warning-circle" size={14} color={color.accentRamp[300]} />
        <Text variant="caption" color={color.accentRamp[300]} style={styles.flex}>
          {t('org:judgeForm.pinWarning')}
        </Text>
      </View>
      <Button testID="pin-done" label={t('org:judgeForm.done')} size={48} fullWidth onPress={onDone} />
    </View>
  );
}

export interface JudgeSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Edycja; brak = nowy sędzia. */
  judge?: JudgeRow;
  canWrite: boolean;
  onCreate: (fullName: string, idempotencyKey: string) => Promise<JudgeWithPin>;
  onUpdate: (
    judge: JudgeRow,
    body: { fullName?: string; initials?: string; isActive?: boolean },
  ) => Promise<unknown>;
  onResetPin: (judge: JudgeRow) => Promise<JudgeWithPin>;
  onDelete: (judge: JudgeRow) => Promise<unknown>;
}

/**
 * SCR-ORG-15 – nowy / edycja sędziego (IMP-274): po dodaniu i po resecie PIN pokazywany jednorazowo;
 * „Dezaktywuj/Aktywuj”, „Usuń sędziego” tylko bez ocen.
 */
export function JudgeSheet({
  visible,
  onClose,
  judge,
  canWrite,
  onCreate,
  onUpdate,
  onResetPin,
  onDelete,
}: JudgeSheetProps) {
  const t = useT();
  const form = useZodForm(JudgeFields, { defaultValues: { fullName: '', initials: undefined } });
  const { step, setStep, reset } = useSheetStep<Step>('form');
  const [pin, setPin] = useState<JudgeWithPin | null>(null);
  const [key, setKey] = useState(uuidv7);

  useEffect(() => {
    if (!visible) {
      setPin(null);
      return;
    }
    reset();
    setKey(uuidv7());
    form.reset({ fullName: judge?.fullName ?? '', initials: judge?.initials });
  }, [visible, judge?.id]);

  const fail = (e: unknown) => {
    if (e instanceof ApiError && e.fieldErrors.length) applyFormError(form as never, e, t as never);
    else toastSaveError(e);
  };

  const submit = form.handleSubmit(async (values) => {
    try {
      if (!judge) {
        setPin(await onCreate(values.fullName, key));
        toast.success('toasts:judgeAdded');
        setStep('pin');
        return;
      }
      const body: { fullName?: string; initials?: string } = {};
      if (values.fullName !== judge.fullName) body.fullName = values.fullName;
      if (values.initials && values.initials !== judge.initials) body.initials = values.initials;
      if (Object.keys(body).length) await onUpdate(judge, body);
      onClose();
      toast.success('toasts:changesSaved');
    } catch (e) {
      fail(e);
    }
  });

  const act = async (fn: () => Promise<unknown>, after: () => void) => {
    try {
      await fn();
      after();
    } catch (e) {
      setStep('form');
      toastSaveError(e);
    }
  };

  const close = () => {
    setPin(null);
    onClose();
  };
  // PIN widoczny tylko raz – tło, „×” i wstecz pytają „Zapisałeś PIN?”; „Gotowe” zamyka od razu (UX-07).
  const requestClose = () => (step === 'pin' && pin ? setStep('pinConfirm') : close());
  const toggleActive = (target: JudgeRow) =>
    void act(
      () => onUpdate(target, { isActive: !target.isActive }),
      () => {
        close();
        toast.success(target.isActive ? 'toasts:judgeDeactivated' : 'toasts:judgeActivated');
      },
    );
  const title = t(judge ? 'org:judgeForm.editTitle' : 'org:judgeForm.newTitle');
  const nameError = form.fieldError('fullName');

  let content;
  if (step === 'pin' && pin) {
    content = <PinRevealStep judge={pin} onDone={close} />;
  } else if (step === 'pinConfirm' && pin) {
    content = (
      <ConfirmContent
        icon="key"
        title={t('org:judgeForm.pinSavedTitle')}
        text={t('org:judgeForm.pinSavedText')}
        actions={
          <>
            <Button
              testID="judge-pin-close-confirm"
              variant="secondary"
              label={t('org:judgeForm.pinSavedConfirm')}
              size={48}
              fullWidth
              onPress={close}
            />
            <Button
              testID="judge-pin-show"
              variant="ghost"
              label={t('org:judgeForm.pinShowAgain')}
              size={48}
              fullWidth
              onPress={() => setStep('pin')}
            />
          </>
        }
      />
    );
  } else if (step === 'deactivate' && judge) {
    content = (
      <ConfirmContent
        icon="user-minus"
        title={t('org:judgeForm.deactivateTitle', { name: judge.fullName })}
        text={t('org:judgeForm.deactivateText')}
        actions={
          <>
            <Button
              testID="judge-deactivate-confirm"
              variant="secondary"
              destructive
              label={t('org:judgeForm.deactivate')}
              size={48}
              fullWidth
              onPress={() => toggleActive(judge)}
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
    );
  } else if (step === 'reset' && judge) {
    content = (
      <ConfirmContent
        icon="key"
        title={t('org:judgeForm.resetTitle')}
        text={t('org:judgeForm.resetText')}
        actions={
          <>
            <Button
              testID="judge-reset-confirm"
              variant="secondary"
              destructive
              label={t('org:judgeForm.resetConfirm')}
              size={48}
              fullWidth
              onPress={() =>
                void act(
                  async () => setPin(await onResetPin(judge)),
                  () => setStep('pin'),
                )
              }
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
    );
  } else if (step === 'delete' && judge) {
    content = (
      <ConfirmContent
        icon="trash"
        title={t('org:judgeForm.deleteTitle', { name: judge.fullName })}
        actions={
          <>
            <Button
              testID="judge-delete-confirm"
              variant="secondary"
              destructive
              label={t('org:judgeForm.deleteConfirm')}
              size={48}
              fullWidth
              onPress={() =>
                void act(
                  () => onDelete(judge),
                  () => {
                    close();
                    toast.success('toasts:judgeDeleted');
                  },
                )
              }
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
    );
  } else {
    content = (
      <View style={styles.body}>
        <SheetHeader title={title} />
        <Controller
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <TextField
              testID="judge-name"
              label={t('org:judgeForm.fullName')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={
                nameError && form.formState.errors.fullName?.type !== 'api'
                  ? t('org:judgeForm.fullNameError')
                  : nameError
              }
              autoCapitalize="words"
              maxLength={80}
            />
          )}
        />
        {judge ? (
          <Controller
            control={form.control}
            name="initials"
            render={({ field }) => (
              <TextField
                testID="judge-initials"
                label={t('org:judgeForm.initials')}
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={form.fieldError('initials')}
                autoCapitalize="characters"
                maxLength={3}
              />
            )}
          />
        ) : null}
        <Button
          testID="judge-save"
          label={t(judge ? 'org:judgeForm.save' : 'org:judgeForm.add')}
          size={48}
          fullWidth
          disabled={!canWrite || (!!judge && !form.formState.isDirty)}
          loading={form.formState.isSubmitting}
          onPress={() => void submit()}
        />
        {judge ? (
          <>
            <Button
              testID="judge-reset"
              variant="secondary"
              icon="key"
              label={t('org:judgeForm.resetPin')}
              size={48}
              fullWidth
              disabled={!canWrite}
              onPress={() => setStep('reset')}
            />
            <Button
              testID="judge-toggle"
              variant="secondary"
              label={t(judge.isActive ? 'org:judgeForm.deactivate' : 'org:judgeForm.activate')}
              size={48}
              fullWidth
              disabled={!canWrite}
              icon={judge.isActive ? 'user-minus' : undefined}
              onPress={() => (judge.isActive ? setStep('deactivate') : toggleActive(judge))}
            />
            {judge.sheetCount === 0 ? (
              <Button
                testID="judge-delete"
                variant="ghost"
                destructive
                size={44}
                label={t('org:judgeForm.delete')}
                disabled={!canWrite}
                onPress={() => setStep('delete')}
                style={styles.center}
              />
            ) : null}
          </>
        ) : null}
      </View>
    );
  }

  return (
    <Sheet visible={visible} onClose={requestClose} accessibilityLabel={title} testID="judge-sheet">
      <SheetStep stepKey={step}>{content}</SheetStep>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: layout[14] },
  pinCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: layout[16],
    paddingVertical: layout[22],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  warning: { flexDirection: 'row', gap: layout[6], alignItems: 'flex-start' },
  flex: { flex: 1 },
  center: { alignSelf: 'center' },
});
