import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import { LoginRequest } from '@polechamp/contracts';
import { ApiError } from '../../data/api/errors';
import { useT } from '../../i18n';
import { Brand } from '../../ui/Brand';
import { Button } from '../../ui/Button';
import { PasswordField, TextField, useZodForm } from '../../ui/form';
import { Text } from '../../ui/Text';
import { FormError } from './FormError';
import { useCountdown } from './useCountdown';

const LOCK_CODES = new Set(['ACCOUNT_LOCKED', 'RATE_LIMITED']);

export interface LoginFormProps {
  /** Wywołanie API; odrzucenie `ApiError` pokazuje komunikat pod formularzem. */
  onSubmit: (values: LoginRequest) => Promise<unknown>;
  /** Z wpisanym adresem – „Nie pamiętasz hasła?” go przejmuje (UX-45). */
  onForgotPassword: (email: string) => void;
  onRegister: () => void;
  /** Stan początkowy błędu (DevCatalog). */
  initialError?: ApiError | null;
}

/** SCR-ORG-13 – formularz logowania organizatora (IMP-250). */
export function LoginForm({ onSubmit, onForgotPassword, onRegister, initialError = null }: LoginFormProps) {
  const t = useT();
  const form = useZodForm(LoginRequest, { defaultValues: { email: '', password: '' } });
  const [error, setError] = useState<ApiError | null>(initialError);
  const [lockLeft, startLock] = useCountdown(
    initialError && LOCK_CODES.has(initialError.code) ? (initialError.retryAfterSeconds ?? 0) : 0,
  );

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await onSubmit(LoginRequest.parse(values));
    } catch (e) {
      const apiError = e instanceof ApiError ? e : new ApiError({ code: 'INTERNAL', status: 0 });
      setError(apiError);
      if (LOCK_CODES.has(apiError.code)) startLock(apiError.retryAfterSeconds ?? 0);
    }
  });

  const locked = lockLeft > 0;
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Brand />
        <Text variant="meta" align="center" color={color.neutral[400]}>
          {t('org:auth.subtitle')}
        </Text>
      </View>
      <View style={styles.fields}>
        <Controller
          control={form.control}
          name="email"
          render={({ field }) => (
            <TextField
              testID="login-email"
              label={t('org:auth.email')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={form.fieldError('email')}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="username"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field }) => (
            <PasswordField
              testID="login-password"
              label={t('org:auth.password')}
              showLabel={t('org:auth.showPassword')}
              hideLabel={t('org:auth.hidePassword')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={form.fieldError('password')}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
            />
          )}
        />
      </View>
      <FormError
        testID="login-error"
        error={error}
        detail={
          locked ? (
            <Text variant="caption" tabular color={color.neutral[400]}>
              {t('org:auth.retryIn', { s: lockLeft })}
            </Text>
          ) : null
        }
      />
      <Button
        testID="login-submit"
        label={t('org:auth.login')}
        size={48}
        fullWidth
        loading={form.formState.isSubmitting}
        disabled={locked}
        onPress={() => void submit()}
      />
      <Button
        testID="login-forgot"
        variant="ghost"
        size={44}
        label={t('org:auth.forgotPassword')}
        onPress={() => onForgotPassword(form.getValues('email')?.trim() ?? '')}
        style={styles.center}
      />
      <View style={styles.register}>
        <Text variant="bodyS" color={color.neutral[400]}>
          {t('org:auth.noAccount')}
        </Text>
        <Button
          testID="login-register"
          variant="ghost"
          size={44}
          label={t('org:auth.register')}
          onPress={onRegister}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: layout[16] },
  header: { gap: layout[8], marginBottom: layout[14] },
  fields: { gap: layout[14] },
  center: { alignSelf: 'center' },
  register: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: layout[4],
    marginTop: layout[22],
  },
});
