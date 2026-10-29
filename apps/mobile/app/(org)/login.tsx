import { router } from 'expo-router';
import { useLogin } from '../../src/data/auth/orgSession';
import { LoginForm } from '../../src/features/auth/LoginForm';
import { ChangeModeLink } from '../../src/features/system/ChangeModeLink';
import { ScreenContainer } from '../../src/ui/layout/ScreenContainer';

/** SCR-ORG-13 – logowanie organizatora (IMP-250). Po zapisie sesji strażnik `(org)` przechodzi do SCR-ORG-01. */
export default function LoginRoute() {
  const login = useLogin();
  return (
    <ScreenContainer testID="login-screen">
      <LoginForm
        onSubmit={(values) => login.mutateAsync(values)}
        onForgotPassword={() => router.push('/forgot-password')}
        onRegister={() => router.push('/register')}
      />
      <ChangeModeLink from="org" />
    </ScreenContainer>
  );
}
