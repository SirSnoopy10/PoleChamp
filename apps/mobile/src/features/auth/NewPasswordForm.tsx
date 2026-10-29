import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { layout } from '@polechamp/tokens';
import { ResetPasswordRequest } from '@polechamp/contracts';
import { ApiError } from '../../data/api/errors';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { PasswordField, useZodForm } from '../../ui/form';
import { Text } from '../../ui/Text';
import { FormError } from './FormError';

const NewPasswordFields = ResetPasswordRequest.pick({ newPassword: true });

export interface NewPasswordFormProps {
  onSubmit: (newPassword: string) => Promise<unknown>;
  /** `RESET_TOKEN_INVALID` – przejście do „Nie pamiętasz hasła?”. */
  onRequestNewLink: () => void;
  /** „Wróć do logowania” (UX-45). */
  onBackToLogin?: () => void;
  initialError?: ApiError | null;
}

/** SCR-ORG-13 – nowe hasło z linku `/reset?token=` (IMP-253). */
export function NewPasswordForm({
  onSubmit,
  onRequestNewLink,
  onBackToLogin,
  initialError = null,
}: NewPasswordFormProps) {
  const t = useT();
  const form = useZodForm(NewPasswordFields, {
    defaultValues: { newPassword: '' },
    errorParams: { newPassword: { min: 10, max: 128, kind: 'password' } },
  });
  const [error, setError] = useState<ApiError | null>(initialError);

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await onSubmit(NewPasswordFields.parse(values).newPassword);
    } catch (e) {
      const apiError = e instanceof ApiError ? e : new ApiError({ code: 'INTERNAL', status: 0 });
      if (apiError.fieldErrors.length) {
        form.applyApiErrors(
          apiError.fieldErrors.map((f) => (f.field === 'password' ? { ...f, field: 'newPassword' } : f)),
        );
      } else setError(apiError);
    }
  });

  const expired = error?.code === 'RESET_TOKEN_INVALID';
  return (
    <View style={styles.root}>
      <Text variant="titleM">{t('org:auth.newPasswordTitle')}</Text>
      {expired ? null : (
        <Controller
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <PasswordField
              testID="reset-password"
              label={t('org:auth.newPassword')}
              hint={t('org:auth.passwordHint')}
              showLabel={t('org:auth.showPassword')}
              hideLabel={t('org:auth.hidePassword')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={form.fieldError('newPassword')}
              autoComplete="new-password"
              textContentType="newPassword"
            />
          )}
        />
      )}
      <FormError testID="reset-error" error={error} />
      {expired ? (
        <Button
          testID="reset-new-link"
          variant="secondary"
          label={t('org:auth.requestNewLink')}
          size={48}
          fullWidth
          onPress={onRequestNewLink}
        />
      ) : (
        <Button
          testID="reset-submit"
          label={t('org:auth.savePassword')}
          size={48}
          fullWidth
          loading={form.formState.isSubmitting}
          onPress={() => void submit()}
        />
      )}
      {onBackToLogin ? (
        <Button
          testID="reset-back-login"
          variant="ghost"
          size={44}
          label={t('org:auth.backToLogin')}
          onPress={onBackToLogin}
          style={styles.center}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: layout[16] },
  center: { alignSelf: 'center' },
});
