import { router, useLocalSearchParams } from 'expo-router';
import { resetToken, useResetPassword } from '../../src/data/auth/orgSession';
import { NewPasswordForm } from '../../src/features/auth/NewPasswordForm';
import { ScreenContainer } from '../../src/ui/layout/ScreenContainer';
import { toast } from '../../src/ui/Toast';

/**
 * SCR-ORG-13 – nowe hasło z linku `https://polechamp.app/reset?token=…` / `polechamp://reset?token=…`
 * (IMP-253). Po zmianie hasła sesja lokalna jest czyszczona i organizator loguje się ponownie.
 */
export default function ResetRoute() {
  const params = useLocalSearchParams<{ token?: string }>();
  // Token z linku: tylko znaki base64url i rozsądna długość (TC-SEC-021); inaczej API odrzuci pusty.
  const token = resetToken(params.token);
  const reset = useResetPassword();
  return (
    <ScreenContainer testID="reset-screen">
      <NewPasswordForm
        onSubmit={async (newPassword) => {
          await reset.mutateAsync({ token: token ?? '', newPassword });
          toast.success('toasts:passwordChanged');
          router.replace('/login');
        }}
        onRequestNewLink={() => router.replace('/forgot-password')}
        onBackToLogin={() => router.replace('/login')}
      />
    </ScreenContainer>
  );
}
