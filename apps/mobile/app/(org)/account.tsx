import { router } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { appVersion } from '../../src/data/api/app-version';
import { useAppConfig, useDeleteAccount, useLogout, useMe } from '../../src/data/auth/orgSession';
import { useOnline } from '../../src/data/network/online';
import { AccountScreen } from '../../src/features/account/AccountScreen';
import { toastSaveError } from '../../src/features/categories/CategoryFormSheet';
import { toast } from '../../src/ui/Toast';

/** SCR-ORG-21 – konto (IMP-277). Po wylogowaniu/usunięciu strażnik `(org)` przechodzi do SCR-ORG-13. */
export default function AccountRoute() {
  const me = useMe();
  const config = useAppConfig();
  const logout = useLogout();
  const remove = useDeleteAccount();
  const online = useOnline();
  return (
    <AccountScreen
      me={me.data}
      config={config.data}
      loading={me.isPending}
      error={me.isError}
      version={appVersion()}
      canWrite={online}
      loggingOut={logout.isPending}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onRetry={() => void me.refetch()}
      onVerify={() => router.push('/verify-email')}
      onOpenLink={(url) => void openBrowserAsync(url)}
      onLogout={() => logout.mutate()}
      onDelete={async () => {
        try {
          await remove.mutateAsync();
          toast.info('toasts:accountDeleted');
        } catch (e) {
          toastSaveError(e);
        }
      }}
    />
  );
}
