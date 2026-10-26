import { Redirect, Stack, usePathname } from 'expo-router';
import { color } from '@polechamp/tokens';
import { useSession } from '../../src/data/api/useSession';
import { orgRedirect } from '../../src/features/system/guards';
import { useMode } from '../../src/mode/mode';

/**
 * Tryb organizatora (IMP-220): stos lista → turniej → kategoria; arkusze są komponentami ekranów
 * (przycisk wstecz Androida najpierw zamyka arkusz – `Sheet`, potem cofa w stosie).
 */
export default function OrgLayout() {
  const { mode } = useMode();
  const session = useSession();
  const pathname = usePathname();
  if (!session.loaded) return null;
  const target = orgRedirect({ mode, session, pathname });
  if (target) return <Redirect href={target as never} />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />;
}
