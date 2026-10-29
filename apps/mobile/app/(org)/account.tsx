import { router } from 'expo-router';
import { useState } from 'react';
import { openBrowserAsync } from 'expo-web-browser';
import { appVersion } from '../../src/data/api/app-version';
import {
  useAppConfig,
  useChangeEmail,
  useDeleteAccount,
  useLogout,
  useMe,
} from '../../src/data/auth/orgSession';
import { ChangeEmailSheet } from '../../src/features/account/ChangeEmailSheet';
import { useOnline } from '../../src/data/network/online';
import { useTournaments } from '../../src/data/org/tournaments';
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
  const active = useTournaments('active');
  const change = useChangeEmail();
  const [changing, setChanging] = useState(false);
  return (
    <>
      <AccountScreen
        me={me.data}
        config={config.data}
        loading={me.isPending}
        error={me.isError}
        version={appVersion()}
        canWrite={online}
        onChangeEmail={() => setChanging(true)}
        hasActiveTournament={!!active.data?.some((x) => x.status === 'IN_PROGRESS')}
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
      <ChangeEmailSheet
        visible={changing}
        onClose={() => setChanging(false)}
        currentEmail={me.data?.email ?? ''}
        onSubmit={(body) => change.mutateAsync(body)}
        onChanged={() => {
          toast.info('toasts:emailChanged');
          router.push('/verify-email');
        }}
      />
    </>
  );
}
