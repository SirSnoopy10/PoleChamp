import { router, useLocalSearchParams } from 'expo-router';
import { useMe, useResendCode } from '../../../src/data/auth/orgSession';
import { ApiError } from '../../../src/data/api/errors';
import { useCanWrite } from '../../../src/data/network/useCanWrite';
import { useCreateCategory } from '../../../src/data/org/categories';
import {
  useDeleteTournament,
  useDevices,
  useFinishTournament,
  useStartTournament,
  useTournament,
  useUpdateTournament,
} from '../../../src/data/org/tournament';
import { useOrgRealtime } from '../../../src/data/realtime/useOrgRealtime';
import { CategoryFormSheet, toastSaveError } from '../../../src/features/categories/CategoryFormSheet';
import { EditTournamentSheet } from '../../../src/features/tournaments/EditTournamentSheet';
import { FinishTournamentSheet } from '../../../src/features/tournaments/FinishTournamentSheet';
import { TournamentDetailsScreen } from '../../../src/features/tournaments/TournamentDetailsScreen';
import { useSheet } from '../../../src/ui/sheet';
import { toast } from '../../../src/ui/Toast';

/**
 * SCR-ORG-03 – szczegóły turnieju (IMP-257) z arkuszami SCR-ORG-04 (IMP-258), SCR-ORG-20 (IMP-259)
 * i SCR-ORG-05 nowej kategorii (IMP-260). Dane na żywo przez `useOrgRealtime`.
 */
export default function TournamentRoute() {
  const { tournamentId: id } = useLocalSearchParams<{ tournamentId: string }>();
  const query = useTournament(id);
  const tournament = query.data;
  const me = useMe();
  const canWrite = useCanWrite(tournament?.status);
  const finishSheet = useSheet();
  const editSheet = useSheet();
  const categorySheet = useSheet();
  const devices = useDevices(id, finishSheet.visible);
  const start = useStartTournament(id);
  const finish = useFinishTournament(id);
  const update = useUpdateTournament(id);
  const remove = useDeleteTournament(id);
  const createCategory = useCreateCategory(id);
  const resend = useResendCode();
  useOrgRealtime(id);

  const onStart = () =>
    start.mutate(undefined, {
      onSuccess: () => toast.success('toasts:tournamentStarted'),
      onError: (e) => {
        // Podwójny tap: turniej już trwa – bez komunikatu (TC-EDGE-031).
        if (e.code === 'INVALID_STATE_TRANSITION') return void query.refetch();
        toastSaveError(e);
        if (e.code === 'EMAIL_NOT_VERIFIED') router.push('/verify-email');
      },
    });

  const onFinish = () => {
    if (!tournament) return;
    finish.mutate(
      { version: tournament.version },
      {
        onSuccess: () => {
          finishSheet.close();
          toast.success('toasts:tournamentFinished');
        },
        onError: (e) => {
          finishSheet.close();
          toastSaveError(e);
        },
      },
    );
  };

  return (
    <TournamentDetailsScreen
      tournament={tournament}
      loading={query.isPending}
      error={query.isError}
      canWrite={canWrite}
      emailUnverified={me.data?.emailVerified === false}
      starting={start.isPending}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onRetry={() => void query.refetch()}
      onEdit={editSheet.open}
      onPdf={() => router.push(`/pdf/${id}`)}
      onJudges={() => router.push(`/judges/${id}`)}
      onStart={onStart}
      onFinish={finishSheet.open}
      onAddCategory={categorySheet.open}
      onOpenCategory={(categoryId) => router.push(`/c/${categoryId}`)}
      onRejected={() => router.push(`/rejected/${id}`)}
      onResendCode={() =>
        resend.mutate(undefined, {
          onSuccess: () => {
            toast.info('toasts:codeResent');
            router.push('/verify-email');
          },
          onError: (e: ApiError) => toastSaveError(e),
        })
      }
    >
      {tournament ? (
        <>
          <FinishTournamentSheet
            {...finishSheet.props}
            tournament={tournament}
            devices={devices.data ?? []}
            busy={finish.isPending}
            onConfirm={onFinish}
          />
          <EditTournamentSheet
            {...editSheet.props}
            tournament={tournament}
            onSave={(body, version) => update.mutateAsync({ body, version })}
            onDelete={(version) => remove.mutateAsync({ version })}
            onDeleted={() => router.replace('/')}
          />
          <CategoryFormSheet
            {...categorySheet.props}
            canWrite={canWrite}
            onCreate={(body, idempotencyKey) => createCategory.mutateAsync({ body, idempotencyKey })}
          />
        </>
      ) : null}
    </TournamentDetailsScreen>
  );
}
