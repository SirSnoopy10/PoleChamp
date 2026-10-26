import { Redirect, useRouter } from 'expo-router';
import { entryRoute } from '../../src/features/system/guards';
import { ModeScreen } from '../../src/features/system/ModeScreen';
import { useMode } from '../../src/mode/mode';

/** SCR-SYS-01 – po wyborze: organizator → SCR-ORG-13, tablet → SCR-JDG-06 (strażniki grup). */
export default function ModeRoute() {
  const { mode, setMode } = useMode();
  const router = useRouter();
  if (mode) return <Redirect href={entryRoute(mode) as never} />;
  return (
    <ModeScreen
      onSelect={(next) => {
        setMode(next);
        router.replace(entryRoute(next) as never);
      }}
    />
  );
}
