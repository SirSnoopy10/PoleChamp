import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { AppConfig, LoginRequest, Me, RegisterRequest } from '@polechamp/contracts';
import { api, tokenStore, unwrap, type ApiError } from '../api';
import { queryKeys } from '../query/keys';
import { clearQueryCache, queryPersister } from '../query/queryClient';

/** Zapis sesji po logowaniu: użytkownik do cache `['me']`, tokeny do magazynu (strażnik `(org)` reaguje). */
async function login(queryClient: QueryClient, body: LoginRequest): Promise<void> {
  const pair = await unwrap(api.POST('/v1/auth/login', { body }));
  if (pair.user) queryClient.setQueryData(queryKeys.me(), pair.user);
  await tokenStore.setOrg({ accessToken: pair.accessToken, refreshToken: pair.refreshToken });
}

/**
 * Sesja organizatora (IMP-250…253, IMP-277): `refreshToken` w SecureStore, `accessToken` w pamięci
 * i SecureStore (restart bez logowania); wylogowanie czyści też cache zapytań (TC-E2E-ORG-004).
 */
export const orgSession = {
  login,
  async clear(queryClient: QueryClient): Promise<void> {
    await tokenStore.setOrg(null);
    await clearQueryCache(queryClient, queryPersister);
  },
};

/** `POST /v1/auth/login` (IMP-250). */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, LoginRequest>({ mutationFn: (body) => login(queryClient, body) });
}

/**
 * `POST /v1/auth/register` (IMP-251) i od razu logowanie – ponowne wysłanie kodu weryfikacji
 * wymaga sesji (`ORG`), a niezweryfikowane konto może konfigurować turnieje (FR-102).
 */
export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, RegisterRequest>({
    mutationFn: async (body) => {
      await unwrap(api.POST('/v1/auth/register', { body }));
      await login(queryClient, { email: body.email, password: body.password });
    },
  });
}

/** `POST /v1/auth/verify-email` (IMP-252). */
export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, { email: string; code: string }>({
    mutationFn: async (body) => {
      await unwrap(api.POST('/v1/auth/verify-email', { body }));
      queryClient.setQueryData<Me>(queryKeys.me(), (me) => (me ? { ...me, emailVerified: true } : me));
      await queryClient.invalidateQueries({ queryKey: queryKeys.me() });
    },
  });
}

/** `POST /v1/auth/verify-email/resend` (IMP-252). */
export function useResendCode() {
  return useMutation<unknown, ApiError>({
    mutationFn: async () => {
      await unwrap(api.POST('/v1/auth/verify-email/resend'));
    },
  });
}

/** `POST /v1/auth/password/forgot` (IMP-253) – odpowiedź zawsze neutralna. */
export function useForgotPassword() {
  return useMutation<unknown, ApiError, { email: string }>({
    mutationFn: async (body) => {
      await unwrap(api.POST('/v1/auth/password/forgot', { body }));
    },
  });
}

/** `POST /v1/auth/password/reset` (IMP-253): po zmianie hasła sesja lokalna jest czyszczona. */
export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, { token: string; newPassword: string }>({
    mutationFn: async (body) => {
      await unwrap(api.POST('/v1/auth/password/reset', { body }));
      await orgSession.clear(queryClient);
    },
  });
}

/** Profil organizatora `GET /v1/me`. */
export function useMe(enabled = true) {
  return useQuery<Me, ApiError>({
    queryKey: queryKeys.me(),
    queryFn: () => unwrap(api.GET('/v1/me')),
    enabled,
  });
}

/** `GET /v1/app-config` – linki prawne i wersja regulaminu (IMP-251). */
export function useAppConfig() {
  return useQuery<AppConfig, ApiError>({
    queryKey: queryKeys.appConfig(),
    queryFn: () => unwrap(api.GET('/v1/app-config')),
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Wylogowanie (IMP-277): `POST /v1/auth/logout` (błąd sieci nie blokuje – sesja lokalna i tak znika),
 * potem tokeny z SecureStore i cache zapytań (pamięć + MMKV). Strażnik przechodzi do SCR-ORG-13.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError>({
    mutationFn: async () => {
      try {
        await unwrap(api.POST('/v1/auth/logout'));
      } finally {
        await orgSession.clear(queryClient);
      }
    },
  });
}

/** `DELETE /v1/me` (IMP-277, TL-22): po sukcesie wylogowanie jak wyżej. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError>({
    mutationFn: async () => {
      await unwrap(api.DELETE('/v1/me'));
      await orgSession.clear(queryClient);
    },
  });
}
