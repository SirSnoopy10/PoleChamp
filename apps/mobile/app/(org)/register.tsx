import { router } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useAppConfig, useRegister } from '../../src/data/auth/orgSession';
import { RegisterForm } from '../../src/features/auth/RegisterForm';
import { ScreenContainer } from '../../src/ui/layout/ScreenContainer';

/**
 * SCR-ORG-13 – rejestracja (IMP-251). Po założeniu konta aplikacja loguje organizatora i przechodzi
 * do weryfikacji e-maila (IMP-252).
 */
export default function RegisterRoute() {
  const register = useRegister();
  const config = useAppConfig();
  const legal = config.data?.legal;
  return (
    <ScreenContainer testID="register-screen">
      <RegisterForm
        ready={!!config.data}
        onSubmit={async (values) => {
          await register.mutateAsync({ ...values, termsVersion: config.data?.termsVersion ?? '' });
          router.replace('/verify-email');
        }}
        onOpenTerms={() => legal && void openBrowserAsync(legal.termsUrl)}
        onOpenDpa={() => legal && void openBrowserAsync(legal.dpaUrl)}
        onLogin={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
      />
    </ScreenContainer>
  );
}
