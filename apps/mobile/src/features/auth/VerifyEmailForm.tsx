import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import { ApiError } from '../../data/api/errors';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { CodeInput } from '../../ui/form';
import { Text } from '../../ui/Text';
import { FormError } from './FormError';
import { useCountdown } from './useCountdown';

export const RESEND_DELAY_S = 60;
const CODE_LENGTH = 6;

export interface VerifyEmailFormProps {
  email: string;
  onVerify: (code: string) => Promise<unknown>;
  onResend: () => Promise<unknown>;
  onSkip: () => void;
  /** „Zmień adres e-mail” – literówka w adresie bez zakładania drugiego konta (UX-45). */
  onChangeEmail?: () => void;
  /** Sekundy do odblokowania „Wyślij kod ponownie” na starcie (kod wysłano przy rejestracji). */
  initialResendDelay?: number;
}

const asApiError = (e: unknown) =>
  e instanceof ApiError ? e : new ApiError({ code: 'INTERNAL', status: 0 });

/** SCR-ORG-13 – weryfikacja e-maila 6-cyfrowym kodem (IMP-252). Pełny kod wysyła się sam. */
export function VerifyEmailForm({
  email,
  onVerify,
  onResend,
  onSkip,
  onChangeEmail,
  initialResendDelay = RESEND_DELAY_S,
}: VerifyEmailFormProps) {
  const t = useT();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [resendLeft, startResend] = useCountdown(initialResendDelay);

  const verify = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      await onVerify(value);
    } catch (e) {
      setError(asApiError(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const change = (value: string) => {
    setCode(value);
    if (value.length === CODE_LENGTH && !busy) void verify(value);
  };

  const resend = async () => {
    setError(null);
    try {
      await onResend();
      startResend(RESEND_DELAY_S);
    } catch (e) {
      const apiError = asApiError(e);
      setError(apiError);
      if (apiError.retryAfterSeconds) startResend(apiError.retryAfterSeconds);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="titleM" align="center">
          {t('org:auth.verifyTitle')}
        </Text>
        <Text variant="bodyS" align="center" color={color.neutral[400]}>
          {t('org:auth.verifyHint', { email })}
        </Text>
      </View>
      <CodeInput
        testID="verify-code"
        value={code}
        onChange={change}
        length={CODE_LENGTH}
        error={!!error}
        editable={!busy}
        accessibilityLabel={t('org:auth.verifyTitle')}
      />
      <FormError testID="verify-error" error={error} />
      <Button
        testID="verify-submit"
        label={t('org:auth.verify')}
        size={48}
        fullWidth
        disabled={code.length < CODE_LENGTH}
        loading={busy}
        onPress={() => void verify(code)}
      />
      <Button
        testID="verify-resend"
        variant="ghost"
        size={44}
        disabled={resendLeft > 0}
        label={resendLeft > 0 ? t('org:auth.resendIn', { s: resendLeft }) : t('org:auth.resend')}
        onPress={() => void resend()}
        style={styles.center}
      />
      {onChangeEmail ? (
        <Button
          testID="verify-change-email"
          variant="ghost"
          size={44}
          label={t('org:email.change')}
          onPress={onChangeEmail}
          style={styles.center}
        />
      ) : null}
      <Button
        testID="verify-skip"
        variant="ghost"
        size={44}
        label={t('org:auth.skip')}
        onPress={onSkip}
        style={styles.center}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: layout[16] },
  header: { gap: layout[8], marginBottom: layout[8] },
  center: { alignSelf: 'center' },
});
