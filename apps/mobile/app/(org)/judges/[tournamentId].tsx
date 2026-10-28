import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import type { DeviceRow, JudgeRow } from '@polechamp/contracts';
import { useCanWrite } from '../../../src/data/network/useCanWrite';
import { useOnline } from '../../../src/data/network/online';
import { useDeviceMutations, useJudgeMutations, useJudges } from '../../../src/data/org/judges';
import { useDevices, useTournament } from '../../../src/data/org/tournament';
import { useOrgRealtime } from '../../../src/data/realtime/useOrgRealtime';
import { DeviceActionsSheet } from '../../../src/features/devices/DeviceActionsSheet';
import { PairTabletSheet } from '../../../src/features/devices/PairTabletSheet';
import { JudgeSheet } from '../../../src/features/judges/JudgeSheet';
import { JudgesDevicesScreen, type JudgesTab } from '../../../src/features/judges/JudgesDevicesScreen';
import { useSheet } from '../../../src/ui/sheet';

/** Odświeżanie „Offline od …” (IMP-273 krok 5). */
const CLOCK_MS = 30_000;

/** SCR-ORG-14 – sędziowie i urządzenia z arkuszami SCR-ORG-15, SCR-ORG-16 i akcjami urządzenia. */
export default function JudgesRoute() {
  const params = useLocalSearchParams<{ tournamentId: string; tab?: string }>();
  const id = params.tournamentId;
  const tab: JudgesTab = params.tab === 'devices' ? 'devices' : 'judges';
  const tournament = useTournament(id);
  const judges = useJudges(id);
  const devices = useDevices(id);
  const canWrite = useCanWrite(tournament.data?.status);
  const online = useOnline();
  const judgeMutations = useJudgeMutations(id);
  const deviceMutations = useDeviceMutations(id);
  const judgeSheet = useSheet();
  const pairSheet = useSheet();
  const [judge, setJudge] = useState<JudgeRow | undefined>();
  const [device, setDevice] = useState<DeviceRow | null>(null);
  const [now, setNow] = useState(Date.now);
  useOrgRealtime(id);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <JudgesDevicesScreen
      judges={judges.data}
      devices={devices.data}
      loading={judges.isPending || devices.isPending}
      error={judges.isError || devices.isError}
      tab={tab}
      onTab={(next) => router.setParams({ tab: next })}
      canWrite={canWrite}
      canManageDevices={online}
      finished={tournament.data?.status === 'FINISHED'}
      now={now}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/t/${id}`))}
      onRetry={() => void Promise.all([judges.refetch(), devices.refetch()])}
      onAddJudge={() => {
        setJudge(undefined);
        judgeSheet.open();
      }}
      onOpenJudge={(j) => {
        setJudge(j);
        judgeSheet.open();
      }}
      onOpenDevice={setDevice}
      onPair={pairSheet.open}
      sheets={
        <>
          <JudgeSheet
            {...judgeSheet.props}
            judge={judge}
            canWrite={canWrite}
            onCreate={judgeMutations.create}
            onUpdate={(j, body) => judgeMutations.update.mutateAsync({ judge: j, body })}
            onResetPin={judgeMutations.resetPin}
            onDelete={(j) => judgeMutations.remove.mutateAsync(j)}
          />
          <PairTabletSheet
            {...pairSheet.props}
            devices={devices.data ?? []}
            onCreateCode={() => deviceMutations.pairingCode.mutateAsync()}
          />
          <DeviceActionsSheet
            device={device}
            onClose={() => setDevice(null)}
            onRename={(d, name) => deviceMutations.rename.mutateAsync({ deviceId: d.id, name })}
            onRevoke={(d) => deviceMutations.revoke.mutateAsync(d.id)}
          />
        </>
      }
    />
  );
}
