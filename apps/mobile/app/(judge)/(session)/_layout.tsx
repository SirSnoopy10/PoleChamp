import { Slot } from 'expo-router';
import { JudgeShell } from '../../../src/features/judge/JudgeShell';

/** Ekrany zalogowanego sędziego (SCR-JDG-03…05): bez stosu, wspólny nagłówek (IMP-300). */
export default function JudgeSessionLayout() {
  return (
    <JudgeShell>
      <Slot />
    </JudgeShell>
  );
}
