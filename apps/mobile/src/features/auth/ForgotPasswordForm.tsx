import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import { ForgotPasswordRequest } from '@polechamp/contracts';
import { ApiError } from '../../data/api/errors';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { TextField, useZodForm } from '../../ui/form';
import { Icon } from '../../ui/Icon';
import { Text } from '../../ui/Text';
import { FormError } from './FormError';

export interface ForgotPasswordFormProps {
  onSubmit: (values: { email: string }) => Promise<unknown>;
  /** Adres z ekranu logowania (UX-45). */
  initialEmail?: string;
  onBack: () => void;
  /** Stan po wysłaniu (DevCatalog). */
  initialSent?: boolean;
}

/** SCR-ORG-13 – „Nie pamiętasz hasła?” (IMP-253): po wysłaniu zawsze ten sam neutralny komunikat. */
export function ForgotPasswordForm({
  onSubmit,
  onBack,
  initialEmail = '',
  initialSent = false,
}: ForgotPasswordFormProps) {
  const t = useT();
  const form = useZodForm(ForgotPasswordRequest, { defaultValues: { email: initialEmail } });
  const [sent, setSent] = useState(initialSent);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await onSubmit(ForgotPasswordRequest.parse(values));
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError({ code: 'INTERNAL', status: 0 }));
    }
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="titleM">{t('org:auth.forgotTitle')}</Text>
        <Text variant="bodyS" color={color.neutral[400]}>
          {t('org:auth.forgotHint')}
        </Text>
      </View>
      {sent ? (
        <View testID="forgot-sent" style={styles.sent} accessibilityLiveRegion="polite">
          <Icon name="check-circle" size={18} color={color.accent} />
          <Text variant="body" style={styles.sentText}>
            {t('org:auth.linkSent')}
          </Text>
        </View>
      ) : (
        <>
          <Controller
            control={form.control}
            name="email"
            render={({ field }) => (
              <TextField
                testID="forgot-email"
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
          <FormError testID="forgot-error" error={error} />
          <Button
            testID="forgot-submit"
            label={t('org:auth.sendLink')}
            size={48}
            fullWidth
            loading={form.formState.isSubmitting}
            onPress={() => void submit()}
          />
        </>
      )}
      <Button
        testID="forgot-back"
        variant="ghost"
        size={44}
        label={t('org:auth.backToLogin')}
        onPress={onBack}
        style={styles.center}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: layout[16] },
  header: { gap: layout[8], marginBottom: layout[8] },
  sent: { flexDirection: 'row', gap: layout[10], alignItems: 'flex-start' },
  sentText: { flex: 1 },
  center: { alignSelf: 'center' },
});
