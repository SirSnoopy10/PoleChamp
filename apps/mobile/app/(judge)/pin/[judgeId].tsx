import { useLocalSearchParams } from 'expo-router';
import { PinScreen } from '../../../src/features/judge/PinScreen';

/** SCR-JDG-02 PIN (IMP-304/305); ponowne uwierzytelnienie – nakładka w `JudgeShell`. */
export default function PinRoute() {
  const { judgeId } = useLocalSearchParams<{ judgeId: string }>();
  return <PinScreen key={judgeId} judgeId={judgeId} />;
}
