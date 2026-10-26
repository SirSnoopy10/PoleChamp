import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, layout, radius } from '@polechamp/tokens';
import { clearDeviceCredentials } from '../../data/auth/deviceAuth';
import { judgeRuntime, setJudgeRuntime } from '../../data/judge/runtime';
import { useLocalQuery } from '../../data/judge/useLocalQuery';
import { outbox } from '../../data/outbox/outbox';
import { syncStore } from '../../data/sync/syncStore';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { Icon } from '../../ui/Icon';
import { ScreenGlow } from '../../ui/layout/ScreenGlow';
import { Text } from '../../ui/Text';
import { toast } from '../../ui/Toast';
import { exportPendingScores } from './exportPending';
import { TabletDataLifecycle } from './TabletDataLifecycle';

/**
 * SCR-JDG-10 – urządzenie odłączone (IMP-318): liczba niewysłanych ocen, eksport JSON (Should),
 * „Sparuj ponownie” (poświadczenia usunięte, oceny zostają do eksportu) i „Wyczyść dane”.
 */
export function RevokedScreen() {
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pending = useLocalQuery((db) => outbox.countPending(db), []);
  const [confirm, setConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportFile = async () => {
    setExporting(true);
    try {
      await exportPendingScores(judgeRuntime().local.read);
    } catch {
      toast.error('toasts:saveFailed');
    } finally {
      setExporting(false);
    }
  };

  /** Nowe poświadczenia przy parowaniu; zatrzymany silnik zastępuje świeży (odłączenie jest trwałe). */
  const resetRuntime = () => {
    setJudgeRuntime(null);
    syncStore.setState({ revoked: false });
  };

  const pairAgain = async () => {
    await clearDeviceCredentials();
    resetRuntime();
    router.replace('/pair');
  };

  const wipe = async () => {
    setConfirm(false);
    await TabletDataLifecycle.wipeAll(judgeRuntime().local);
    resetRuntime();
  };

  return (
    <View testID="revoked-screen" style={styles.root}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + layout[48] }]}>
        <View style={styles.square}>
          <Icon name="link-break" size={24} color={color.accent} />
        </View>
        <Text variant="titleL" align="center" accessibilityRole="header">
          {t('judge:revoked.title')}
        </Text>
        {pending > 0 ? (
          <Text variant="bodyS" align="center" color={color.neutral[300]} testID="revoked-pending">
            {t('judge:revoked.unsent', { count: pending })}
          </Text>
        ) : null}
        <View style={styles.actions}>
          {pending > 0 ? (
            <Button
              variant="secondary"
              icon="download-simple"
              label={t('judge:exportUnsent')}
              loading={exporting}
              onPress={() => void exportFile()}
              testID="revoked-export"
            />
          ) : null}
          <Button
            label={t('judge:revoked.pairAgain')}
            onPress={() => void pairAgain()}
            testID="revoked-pair"
          />
          <Button
            variant="ghost"
            destructive
            label={t('judge:revoked.wipe')}
            onPress={() => setConfirm(true)}
            testID="revoked-wipe"
          />
        </View>
      </ScrollView>
      <Dialog
        visible={confirm}
        onClose={() => setConfirm(false)}
        title={t('judge:revoked.wipeTitle')}
        text={t('judge:revoked.wipeText')}
        testID="wipe-dialog"
        actions={
          <>
            <Button
              variant="secondary"
              size={44}
              label={t('common:cancel')}
              onPress={() => setConfirm(false)}
            />
            <Button
              size={44}
              label={t('judge:revoked.wipe')}
              onPress={() => void wipe()}
              testID="wipe-confirm"
            />
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  content: {
    alignItems: 'center',
    gap: layout[22],
    paddingHorizontal: layout[28],
    paddingBottom: layout[48],
  },
  square: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { width: 320, gap: layout[12] },
});
