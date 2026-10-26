import { ApiError } from '../../../data/api/errors';
import { ForgotPasswordForm } from '../../../features/auth/ForgotPasswordForm';
import { LoginForm } from '../../../features/auth/LoginForm';
import { NewPasswordForm } from '../../../features/auth/NewPasswordForm';
import { RegisterForm } from '../../../features/auth/RegisterForm';
import { VerifyEmailForm } from '../../../features/auth/VerifyEmailForm';
import { registerSection } from '../registry';

const noop = () => undefined;
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 600));
const failWith = (init: ConstructorParameters<typeof ApiError>[0]) => async () => {
  await wait();
  throw new ApiError(init);
};

/** SCR-ORG-13 (IMP-250…253) – stany logowania, rejestracji, weryfikacji i resetu hasła. */
registerSection({
  id: 'auth',
  title: 'SCR-ORG-13 Logowanie i konto',
  cases: [
    {
      id: 'login-default',
      title: 'Logowanie: domyślny (wysłanie → błąd danych)',
      render: () => (
        <LoginForm
          onSubmit={failWith({ code: 'INVALID_CREDENTIALS', status: 401 })}
          onForgotPassword={noop}
          onRegister={noop}
        />
      ),
    },
    {
      id: 'login-error',
      title: 'Logowanie: błąd',
      render: () => (
        <LoginForm
          initialError={new ApiError({ code: 'INVALID_CREDENTIALS', status: 401 })}
          onSubmit={wait}
          onForgotPassword={noop}
          onRegister={noop}
        />
      ),
    },
    {
      id: 'login-locked',
      title: 'Logowanie: blokada',
      render: () => (
        <LoginForm
          initialError={new ApiError({ code: 'ACCOUNT_LOCKED', status: 423, retryAfterSeconds: 45 })}
          onSubmit={wait}
          onForgotPassword={noop}
          onRegister={noop}
        />
      ),
    },
    {
      id: 'login-offline',
      title: 'Logowanie: offline',
      render: () => (
        <LoginForm
          initialError={new ApiError({ code: 'NETWORK', status: 0 })}
          onSubmit={failWith({ code: 'NETWORK', status: 0 })}
          onForgotPassword={noop}
          onRegister={noop}
        />
      ),
    },
    {
      id: 'register',
      title: 'Rejestracja: pusta / zgoda niezaznaczona',
      render: () => <RegisterForm onSubmit={wait} onOpenTerms={noop} onOpenDpa={noop} onLogin={noop} />,
    },
    {
      id: 'register-errors',
      title: 'Rejestracja: błędy pól (hasło z wycieku)',
      render: () => (
        <RegisterForm
          onSubmit={failWith({
            code: 'VALIDATION_FAILED',
            status: 422,
            fieldErrors: [{ field: 'password', code: 'PASSWORD_BREACHED' }],
          })}
          onOpenTerms={noop}
          onOpenDpa={noop}
          onLogin={noop}
        />
      ),
    },
    {
      id: 'verify',
      title: 'Kod: pusty / odliczanie (wpisz 6 cyfr → błędny)',
      render: () => (
        <VerifyEmailForm
          email="anna@example.com"
          onVerify={failWith({ code: 'CODE_INVALID', status: 400 })}
          onResend={wait}
          onSkip={noop}
        />
      ),
    },
    {
      id: 'verify-resend',
      title: 'Kod: ponowne wysłanie dostępne',
      render: () => (
        <VerifyEmailForm
          email="anna@example.com"
          initialResendDelay={0}
          onVerify={wait}
          onResend={wait}
          onSkip={noop}
        />
      ),
    },
    {
      id: 'forgot',
      title: 'Reset: formularz',
      render: () => <ForgotPasswordForm onSubmit={wait} onBack={noop} />,
    },
    {
      id: 'forgot-sent',
      title: 'Reset: wysłano link',
      render: () => <ForgotPasswordForm initialSent onSubmit={wait} onBack={noop} />,
    },
    {
      id: 'new-password',
      title: 'Nowe hasło',
      render: () => <NewPasswordForm onSubmit={wait} onRequestNewLink={noop} />,
    },
    {
      id: 'new-password-expired',
      title: 'Nowe hasło: link wygasł',
      render: () => (
        <NewPasswordForm
          initialError={new ApiError({ code: 'RESET_TOKEN_INVALID', status: 400 })}
          onSubmit={wait}
          onRequestNewLink={noop}
        />
      ),
    },
  ],
});
