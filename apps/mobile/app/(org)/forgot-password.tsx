import { router } from 'expo-router';
import { useForgotPassword } from '../../src/data/auth/orgSession';
import { ForgotPasswordForm } from '../../src/features/auth/ForgotPasswordForm';
import { ScreenContainer } from '../../src/ui/layout/ScreenContainer';

/** SCR-ORG-13 – „Nie pamiętasz hasła?” (IMP-253). */
export default function ForgotPasswordRoute() {
  const forgot = useForgotPassword();
  return (
    <ScreenContainer testID="forgot-screen">
      <ForgotPasswordForm
        onSubmit={(values) => forgot.mutateAsync(values)}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
      />
    </ScreenContainer>
  );
}
