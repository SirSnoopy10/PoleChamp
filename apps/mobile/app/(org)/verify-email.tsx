import { router } from 'expo-router';
import { useMe, useResendCode, useVerifyEmail } from '../../src/data/auth/orgSession';
import { VerifyEmailForm } from '../../src/features/auth/VerifyEmailForm';
import { ScreenContainer } from '../../src/ui/layout/ScreenContainer';
import { toast } from '../../src/ui/Toast';

/** SCR-ORG-13 – weryfikacja e-maila (IMP-252): po rejestracji, z banera SCR-ORG-03 lub po `EMAIL_NOT_VERIFIED`. */
export default function VerifyEmailRoute() {
  const me = useMe();
  const verify = useVerifyEmail();
  const resend = useResendCode();
  const email = me.data?.email ?? '';
  const done = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <ScreenContainer testID="verify-email-screen">
      <VerifyEmailForm
        email={email}
        onVerify={async (code) => {
          await verify.mutateAsync({ email, code });
          toast.success('toasts:emailVerified');
          done();
        }}
        onResend={async () => {
          await resend.mutateAsync();
          toast.info('toasts:codeResent');
        }}
        onSkip={done}
      />
    </ScreenContainer>
  );
}
