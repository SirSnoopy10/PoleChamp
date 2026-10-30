import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { judgeRuntime } from '../../data/judge/runtime';
import { outbox } from '../../data/outbox/outbox';
import { useT } from '../../i18n';
import { useMode } from '../../mode/mode';
import { Button } from '../../ui/Button';
import { ConfirmContent, Sheet } from '../../ui/sheet';
import { toast } from '../../ui/Toast';
import { exportPendingScores } from '../judge/exportPending';
import { TabletDataLifecycle } from '../judge/TabletDataLifecycle';

type Prompt = { kind: 'confirm' } | { kind: 'blocked'; count: number } | null;

/**
 * „Zmień tryb urządzenia” (UX-05, decyzja PO IMP-705a): na logowaniu organizatora i parowaniu tabletu.
 * Zawsze z potwierdzeniem; tablet z niewysłanymi ocenami – blokada z ich liczbą i eksportem,
 * bez nich – zmiana czyści dane tabletu.
 */
export function ChangeModeLink({ from }: { from: 'org' | 'judge' }) {
  const t = useT();
  const router = useRouter();
  const { setMode } = useMode();
  const [prompt, setPrompt] = useState<Prompt>(null);

  const open = () => {
    const count = from === 'judge' ? outbox.countPending(judgeRuntime().local.read) : 0;
    setPrompt(count > 0 ? { kind: 'blocked', count } : { kind: 'confirm' });
  };

  const change = async () => {
    setPrompt(null);
    if (from === 'judge') {
      const local = judgeRuntime().local;
      // Ocena mogła trafić do kolejki w trakcie dialogu – ponowne sprawdzenie przed czyszczeniem.
      if (outbox.countPending(local.read) > 0) return open();
      await TabletDataLifecycle.wipeAll(local);
    }
    setMode(null);
    router.replace('/mode');
  };

  const exportScores = async () => {
    try {
      await exportPendingScores(judgeRuntime().local.read);
    } catch {
      toast.error('toasts:saveFailed');
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size={44}
        label={t('mode.change')}
        onPress={open}
        style={styles.link}
        testID="change-mode"
      />
      {/* Arkusz jak pozostałe potwierdzenia (UX2-24). */}
      <Sheet
        visible={prompt?.kind === 'confirm'}
        onClose={() => setPrompt(null)}
        accessibilityLabel={t('mode.changeTitle')}
        testID="change-mode-dialog"
      >
        <ConfirmContent
          icon="warning-circle"
          title={t('mode.changeTitle')}
          text={t(from === 'judge' ? 'mode.changeTextJudge' : 'mode.changeText')}
          actions={
            <>
              <Button
                variant="secondary"
                destructive={from === 'judge'}
                size={48}
                fullWidth
                label={t('mode.changeConfirm')}
                onPress={() => void change()}
                testID="change-mode-confirm"
              />
              <Button
                variant="ghost"
                size={48}
                fullWidth
                label={t('common:cancel')}
                onPress={() => setPrompt(null)}
              />
            </>
          }
        />
      </Sheet>
      <Sheet
        visible={prompt?.kind === 'blocked'}
        onClose={() => setPrompt(null)}
        accessibilityLabel={t('mode.changeBlockedTitle')}
        testID="change-mode-blocked"
      >
        <ConfirmContent
          icon="warning-circle"
          title={t('mode.changeBlockedTitle')}
          text={t('mode.changeBlocked', { count: prompt?.kind === 'blocked' ? prompt.count : 0 })}
          actions={
            <>
              <Button
                variant="secondary"
                size={48}
                fullWidth
                icon="download-simple"
                label={t('mode.exportScores')}
                onPress={() => void exportScores()}
                testID="change-mode-export"
              />
              <Button
                variant="ghost"
                size={48}
                fullWidth
                label={t('sheet.close')}
                onPress={() => setPrompt(null)}
              />
            </>
          }
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'center' },
});
