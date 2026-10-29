import { useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import { MeEmailChange } from '@polechamp/contracts';
import { ApiError } from '../../data/api/errors';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { PasswordField, TextField, useZodForm } from '../../ui/form';
import { Sheet, SheetHeader } from '../../ui/sheet';
import { Text } from '../../ui/Text';
import { toastSaveError } from '../categories/CategoryFormSheet';

export interface ChangeEmailSheetProps {
  visible: boolean;
  onClose: () => void;
  currentEmail: string;
  onSubmit: (body: { email: string; currentPassword: string }) => Promise<unknown>;
  /** Po zapisie – np. przejście do ekranu kodu. */
  onChanged: () => void;
}

/**
 * „Zmień adres e-mail” (UX-45, decyzja PO IMP-718): z ekranu kodu i z Konta. Bieżące hasło, nowy adres
 * wymaga ponownej weryfikacji kodem z e-maila.
 */
export function ChangeEmailSheet({
  visible,
  onClose,
  currentEmail,
  onSubmit,
  onChanged,
}: ChangeEmailSheetProps) {
  const t = useT();
  const form = useZodForm(MeEmailChange, { defaultValues: { email: '', currentPassword: '' } });
  useEffect(() => {
    if (visible) form.reset({ email: currentEmail, currentPassword: '' });
  }, [visible]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onClose();
      onChanged();
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors.length) form.applyApiErrors(e.fieldErrors);
      else toastSaveError(e);
    }
  });

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel={t('org:email.title')} testID="email-sheet">
      <View style={styles.body}>
        <SheetHeader title={t('org:email.title')} />
        <Text variant="bodyS" color={color.neutral[400]}>
          {t('org:email.text')}
        </Text>
        <Controller
          control={form.control}
          name="email"
          render={({ field }) => (
            <TextField
              testID="email-new"
              label={t('org:email.newEmail')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={form.fieldError('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              maxLength={254}
            />
          )}
        />
        <Controller
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <PasswordField
              testID="email-password"
              label={t('org:email.password')}
              showLabel={t('org:auth.showPassword')}
              hideLabel={t('org:auth.hidePassword')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={form.fieldError('currentPassword')}
              autoComplete="current-password"
              textContentType="password"
            />
          )}
        />
        <Button
          testID="email-save"
          label={t('org:email.save')}
          size={48}
          fullWidth
          loading={form.formState.isSubmitting}
          onPress={() => void submit()}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: layout[14] },
});
