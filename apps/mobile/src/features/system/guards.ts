import type { TokenState } from '../../data/api/tokens';
import type { AppMode } from '../../mode/mode';

interface GuardInput {
  mode: AppMode | null;
  session: Pick<TokenState, 'org' | 'device' | 'judge'>;
  pathname: string;
}

/** Trasy organizatora dostępne bez sesji (logowanie, rejestracja, reset hasła, nowe hasło z linku). */
const ORG_PUBLIC = new Set(['/login', '/register', '/forgot-password', '/reset']);
/** Trasy wyłącznie dla niezalogowanych (rejestracja sama przechodzi do weryfikacji e-maila). */
const ORG_GUEST_ONLY = new Set(['/login', '/forgot-password']);

/** Strażnik grupy `(org)` (IMP-220): tryb → sesja `org` → SCR-ORG-13. `null` = zostań. */
export function orgRedirect({ mode, session, pathname }: GuardInput): string | null {
  if (mode === null) return '/mode';
  if (mode === 'judge') return '/categories';
  if (!session.org && !ORG_PUBLIC.has(pathname)) return '/login';
  if (session.org && ORG_GUEST_ONLY.has(pathname)) return '/';
  return null;
}

/** Ekrany tabletu bez zalogowanego sędziego. */
const DEVICE_ONLY = new Set(['/splash', '/profiles', '/revoked']);

interface JudgeGuardInput extends GuardInput {
  /** Urządzenie odłączone przez organizatora (SCR-JDG-10). */
  revoked?: boolean;
}

/**
 * Strażnik grupy `(judge)`: bez tokenu urządzenia → parowanie (SCR-JDG-06); urządzenie odłączone →
 * SCR-JDG-10; bez sesji sędziego → wybór profilu (SCR-JDG-01) lub PIN; zalogowany – kategorie.
 * `session.judge` = zalogowany sędzia (online lub offline). Link parowania ustawia tryb.
 */
export function judgeRedirect({ mode, session, pathname, revoked = false }: JudgeGuardInput): string | null {
  if (mode === 'org') return '/';
  if (mode === null) return pathname === '/pair' ? null : '/mode';
  if (!session.device) return pathname === '/pair' ? null : '/pair';
  if (revoked) return pathname === '/revoked' ? null : '/revoked';
  if (pathname === '/revoked') return '/profiles';
  if (pathname === '/pair') return session.judge ? '/categories' : '/profiles';
  if (session.judge && (pathname === '/profiles' || pathname.startsWith('/pin/'))) return '/categories';
  if (!session.judge && !DEVICE_ONLY.has(pathname) && !pathname.startsWith('/pin/')) return '/profiles';
  return null;
}

/** Start aplikacji (`/`): wybór trybu albo pierwszy ekran trybu. */
export function entryRoute(mode: AppMode | null): string {
  if (mode === 'judge') return '/categories';
  return mode === 'org' ? '/' : '/mode';
}
