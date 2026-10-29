import { router } from 'expo-router';
import { useState } from 'react';
import { useForgotPassword } from '../../src/data/auth/orgSession';
import { authDraft } from '../../src/features/auth/authDraft';
import { ForgotPasswordForm } from '../../src/features/auth/ForgotPasswordForm';
import { ScreenContainer } from '../../src/ui/layout/ScreenContainer';

/** SCR-ORG-13 – „Nie pamiętasz hasła?” (IMP-253). */
export default function ForgotPasswordRoute() {
  const forgot = useForgotPassword();
  const [initialEmail] = useState(() => authDraft.takeEmail());
  return (
    <ScreenContainer testID="forgot-screen">
      <ForgotPasswordForm
        initialEmail={initialEmail}
        onSubmit={(values) => forgot.mutateAsync(values)}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
      />
    </ScreenContainer>
  );
}
