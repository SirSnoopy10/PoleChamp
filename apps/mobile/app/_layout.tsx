import { useCallback, useEffect, useState } from 'react';
import { Inter_400Regular, Inter_500Medium, useFonts } from '@expo-google-fonts/inter';
import { Stack, useNavigationContainerRef, useRouter } from 'expo-router';
import * as NativeSplash from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { color } from '@polechamp/tokens';
import { AppProviders } from '../src/AppProviders';
import { onSessionExpired } from '../src/data/api';
import { tokenStore } from '../src/data/api/tokens';
import { useSession } from '../src/data/api/useSession';
import { useOrgSplashStage } from '../src/features/org/bootstrap';
import { useOrientationLock } from '../src/features/system/orientation';
import { OrientationGuard } from '../src/features/system/OrientationGuard';
import { UpdateRequired, useUpdateState } from '../src/features/system/UpdateRequired';
import { useMode } from '../src/mode/mode';
import { initSentry, navigationIntegration, Sentry } from '../src/observability/sentry';
import { SPLASH_STAGES, SplashScreen } from '../src/ui/splash/SplashScreen';
import { toast } from '../src/ui/Toast';

initSentry();
// Natywny splash do pierwszej klatki animowanego (IMP-211 krok 6); fonty ładowane pod nim.
void NativeSplash.preventAutoHideAsync();

function Root() {
  const { mode } = useMode();
  const session = useSession();
  const router = useRouter();
  const update = useUpdateState();
  const navigation = useNavigationContainerRef();
  const [splashDone, setSplashDone] = useState(false);

  useOrientationLock(mode);
  useEffect(() => navigationIntegration.registerNavigationContainer(navigation), [navigation]);
  useEffect(() => void tokenStore.load(), []);
  useEffect(
    () =>
      onSessionExpired(() => {
        toast.error('errors:TOKEN_REUSED');
        router.replace('/login');
      }),
    [router],
  );

  const hideNative = useCallback(() => void NativeSplash.hideAsync(), []);
  const stages = SPLASH_STAGES[mode ?? 'org'];
  // Organizator: prefetch turniejów pod splashem (IMP-254); tablet – etapy w IMP-302.
  const orgStage = useOrgSplashStage(session.loaded && mode === 'org', !!session.org);
  const stage = !session.loaded ? stages[0] : mode === 'org' ? orgStage : 'ready';

  return (
    <OrientationGuard>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />
      {update.updateRequired ? <UpdateRequired /> : null}
      {splashDone ? null : (
        <SplashScreen
          mode={mode ?? 'org'}
          stage={stage}
          onReady={hideNative}
          onFinish={() => setSplashDone(true)}
        />
      )}
    </OrientationGuard>
  );
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium });
  if (!fontsLoaded && !fontError) return null;
  return (
    <AppProviders>
      <Root />
    </AppProviders>
  );
}

export default Sentry.wrap(RootLayout);
