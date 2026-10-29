import { z } from 'zod';
import { Id, TrimmedString } from './common.js';

/** Konto i sesja organizatora (03-api §3.1, IMP-060). Żądania są `strict` – nieznane pole → UNKNOWN_FIELD. */
export const Email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'INVALID_FORMAT' }));

export const Password = z
  .string({ error: 'REQUIRED' })
  .min(10, { error: 'TOO_SHORT' })
  .max(128, { error: 'TOO_LONG' });

export const RegisterRequest = z.strictObject({
  email: Email,
  password: Password,
  displayName: TrimmedString(2, 60),
  acceptTerms: z.literal(true, { error: 'REQUIRED' }),
  termsVersion: z.string().min(1, { error: 'REQUIRED' }),
});

export const VerifyEmailRequest = z.strictObject({
  email: Email,
  code: z.string().regex(/^\d{6}$/, { error: 'INVALID_FORMAT' }),
});

export const LoginRequest = z.strictObject({
  email: Email,
  // Limit jak przy rejestracji – Argon2 nie liczy się na dowolnie długim wejściu (ASVS V6, IMP-404).
  password: z.string().min(1, { error: 'REQUIRED' }).max(128, { error: 'TOO_LONG' }),
});

export const RefreshRequest = z.strictObject({ refreshToken: z.string().min(1, { error: 'REQUIRED' }) });
export const ForgotPasswordRequest = z.strictObject({ email: Email });
export const ResetPasswordRequest = z.strictObject({
  token: z.string().min(1, { error: 'REQUIRED' }),
  newPassword: Password,
});

export const User = z.object({
  id: Id,
  email: z.string(),
  displayName: z.string(),
  emailVerified: z.boolean(),
});

export const TokenPair = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
  user: User.optional(),
});

export const Me = User.extend({ locale: z.enum(['pl', 'en']) });
export const MePatch = z.strictObject({
  displayName: TrimmedString(2, 60).optional(),
  locale: z.enum(['pl', 'en']).optional(),
});

/** Zmiana adresu e-mail (przed weryfikacją i na Koncie) – ponowna weryfikacja nowego adresu (UX-45). */
export const MeEmailChange = z.strictObject({
  email: Email,
  currentPassword: z.string().min(1, { error: 'REQUIRED' }).max(128, { error: 'TOO_LONG' }),
});

export const AppConfig = z.object({
  minAppVersion: z.string(),
  minSyncAppVersion: z.string(),
  termsVersion: z.string(),
  legal: z.object({
    termsUrl: z.url(),
    privacyUrl: z.url(),
    dpaUrl: z.url(),
    accountDeletionUrl: z.url(),
    supportUrl: z.url(),
  }),
});

export type RegisterRequest = z.infer<typeof RegisterRequest>;
export type LoginRequest = z.infer<typeof LoginRequest>;
export type TokenPair = z.infer<typeof TokenPair>;
export type Me = z.infer<typeof Me>;
export type AppConfig = z.infer<typeof AppConfig>;
