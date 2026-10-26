import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import { RegisterRequest } from '@polechamp/contracts';
import { ApiError } from '../../data/api/errors';
import { useT } from '../../i18n';
import { Brand } from '../../ui/Brand';
import { Button } from '../../ui/Button';
import { Checkbox, PasswordField, TextField, useZodForm } from '../../ui/form';
import { Text } from '../../ui/Text';
import { FormError } from './FormError';

const RegisterFields = RegisterRequest.pick({ displayName: true, email: true, password: true });
type RegisterFields = typeof RegisterFields._zod.output;

export interface RegisterFormProps {
  onSubmit: (values: RegisterFields & { acceptTerms: true }) => Promise<unknown>;
  onOpenTerms: () => void;
  onOpenDpa: () => void;
  onLogin: () => void;
  /** `false`, dopóki nie ma `app-config` (wersja regulaminu) – przycisk nieaktywny. */
  ready?: boolean;
}

/** SCR-ORG-13 – rejestracja (IMP-251): błędy pól z `errors[]` API pod właściwymi polami. */
export function RegisterForm({ onSubmit, onOpenTerms, onOpenDpa, onLogin, ready = true }: RegisterFormProps) {
  const t = useT();
  const form = useZodForm(RegisterFields, {
    defaultValues: { displayName: '', email: '', password: '' },
    errorParams: { displayName: { min: 2, max: 60 }, password: { min: 10, max: 128 } },
  });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await onSubmit({ ...RegisterFields.parse(values), acceptTerms: true });
    } catch (e) {
      const apiError = e instanceof ApiError ? e : new ApiError({ code: 'INTERNAL', status: 0 });
      if (apiError.fieldErrors.length) form.applyApiErrors(apiError.fieldErrors);
      else setError(apiError);
    }
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Brand />
        <Text variant="meta" align="center" color={color.neutral[400]}>
          {t('org:auth.registerTitle')}
        </Text>
      </View>
      <Controller
        control={form.control}
        name="displayName"
        render={({ field }) => (
          <TextField
            testID="register-name"
            label={t('org:auth.displayName')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={form.fieldError('displayName')}
            autoComplete="name"
            textContentType="name"
            maxLength={60}
          />
        )}
      />
      <Controller
        control={form.control}
        name="email"
        render={({ field }) => (
          <TextField
            testID="register-email"
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
          />
        )}
      />
      <Controller
        control={form.control}
        name="password"
        render={({ field }) => (
          <PasswordField
            testID="register-password"
            label={t('org:auth.password')}
            hint={t('org:auth.passwordHint')}
            showLabel={t('org:auth.showPassword')}
            hideLabel={t('org:auth.hidePassword')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={form.fieldError('password')}
            autoComplete="new-password"
            textContentType="newPassword"
          />
        )}
      />
      <Checkbox
        testID="register-accept"
        checked={accepted}
        onChange={setAccepted}
        accessibilityLabel={t('org:auth.acceptA11y')}
      >
        <Text variant="bodyS" color={color.neutral[300]}>
          {t('org:auth.acceptPrefix')}
          <Text variant="bodyS" color={color.accent} accessibilityRole="link" onPress={onOpenTerms}>
            {t('org:auth.terms')}
          </Text>
          {t('org:auth.acceptAnd')}
          <Text variant="bodyS" color={color.accent} accessibilityRole="link" onPress={onOpenDpa}>
            {t('org:auth.dpa')}
          </Text>
        </Text>
      </Checkbox>
      <FormError testID="register-error" error={error} />
      <Button
        testID="register-submit"
        label={t('org:auth.register')}
        size={48}
        fullWidth
        disabled={!accepted || !ready}
        loading={form.formState.isSubmitting}
        onPress={() => void submit()}
      />
      <View style={styles.footer}>
        <Text variant="bodyS" color={color.neutral[400]}>
          {t('org:auth.haveAccount')}
        </Text>
        <Button variant="ghost" size={44} label={t('org:auth.login')} onPress={onLogin} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: layout[14] },
  header: { gap: layout[8], marginBottom: layout[14] },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: layout[4],
    marginTop: layout[16],
  },
});
