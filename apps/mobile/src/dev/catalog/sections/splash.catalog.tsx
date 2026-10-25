import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { color, radius } from '@polechamp/tokens';
import type { AppMode } from '../../../mode/mode';
import { Button } from '../../../ui/Button';
import { PoleSpinner } from '../../../ui/splash/PoleSpinner';
import { SPLASH_STAGES, SplashScreen, type SplashStage } from '../../../ui/splash/SplashScreen';
import { registerSection } from '../registry';

function SplashDemo({ mode }: { mode: AppMode }) {
  const [run, setRun] = useState(0);
  const [stage, setStage] = useState<SplashStage>(SPLASH_STAGES[mode][0]);
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDone(false);
    const stages = SPLASH_STAGES[mode];
    setStage(stages[0]);
    const ids = stages.slice(1).map((s, i) => setTimeout(() => setStage(s), 900 * (i + 1)));
    return () => ids.forEach(clearTimeout);
  }, [mode, run]);
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          height: mode === 'judge' ? 700 : 640,
          borderRadius: radius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: color.divider,
          backgroundColor: color.bg,
        }}
      >
        {done ? null : <SplashScreen key={run} mode={mode} stage={stage} onFinish={() => setDone(true)} />}
      </View>
      <Button variant="secondary" label="Uruchom ponownie" onPress={() => setRun((r) => r + 1)} />
    </View>
  );
}

registerSection({
  id: 'splash',
  title: 'Splash (PoleSpinner)',
  cases: [
    { id: 'org', title: 'Splash organizatora (340×300)', render: () => <SplashDemo mode="org" /> },
    { id: 'judge', title: 'Splash sędziego (470×410)', render: () => <SplashDemo mode="judge" /> },
    {
      id: 'still',
      title: 'Statyczna klatka („Ogranicz ruch”)',
      render: () => <PoleSpinner size="org" still />,
    },
  ],
});
