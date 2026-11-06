import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { color, layout, radius, shadow } from '@polechamp/tokens';
import { listRejected, listStuck } from '../../data/judge/queries';
import { ATTENTION_ATTEMPTS } from '../../data/outbox/outbox';
import { judgeRuntime } from '../../data/judge/runtime';
import { activeJudgeId } from '../../data/judge/session';
import { useLocalQuery } from '../../data/judge/useLocalQuery';
import { useSyncStore } from '../../data/sync/syncStore';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { Portal } from '../../ui/portal';
import { Text } from '../../ui/Text';
import { relativeTime } from './relativeTime';

/** Odświeżanie „Ostatnia synchronizacja: …” (IMP-317 krok 5). */
const TICK_MS = 30_000;

/**
 * Popover SCR-JDG-07: ostatnia synchronizacja (czas względny), kolejka, połączenie, odrzucone oceny
 * z powodem i „Synchronizuj teraz” (zablokowany do końca przebiegu).
 */
export function SyncPopover({ onClose }: { onClose: () => void }) {
  const t = useT();
  const online = useSyncStore((s) => s.online);
  const pending = useSyncStore((s) => s.pending);
  const lastPushAt = useSyncStore((s) => s.lastPushAt);
  const lastPullAt = useSyncStore((s) => s.lastPullAt);
  const router = useRouter();
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const judgeId = activeJudgeId();
  const rejected = useLocalQuery((db) => (judgeId ? listRejected(db, judgeId) : []), [judgeId]);
  const stuck = useLocalQuery((db) => (judgeId ? listStuck(db, judgeId, ATTENTION_ATTEMPTS) : []), [judgeId]);
  const attention = [
    ...rejected.map((r) => ({ ...r, reason: t(`errors:${r.code}` as never) })),
    ...stuck.map((r) => ({ ...r, reason: t('judge:sync.stuckReason', { count: r.attempts }) })),
  ];
  const [now, setNow] = useState(() => judgeRuntime().clock.now());
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(judgeRuntime().clock.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // UX-15: systemowe „Wstecz” zamyka popover, zamiast opuszczać ekran.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const openSheet = (categoryId: string, entryId: string) => {
    onClose();
    router.push(`/category/${categoryId}?entry=${entryId}`);
  };

  const syncNow = async () => {
    setRunning(true);
    try {
      await judgeRuntime().engine.syncNow();
    } finally {
      setRunning(false);
      setNow(judgeRuntime().clock.now());
    }
  };

  return (
    <Portal>
      <Pressable
        testID="sync-popover-backdrop"
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View testID="sync-popover" accessibilityViewIsModal style={[styles.card, shadow.md]}>
        <Text variant="subhead" accessibilityRole="header">
          {t('judge:sync.title')}
        </Text>
        <View style={styles.rows}>
          <Text variant="meta" testID="sync-last-push">
            {t('judge:sync.lastPush', { time: relativeTime(t, lastPushAt, now) })}
          </Text>
          <Text variant="meta" testID="sync-last-pull">
            {t('judge:sync.lastPull', { time: relativeTime(t, lastPullAt, now) })}
          </Text>
          <Text variant="meta" tabular>
            {t('judge:queueCount', { count: pending })}
          </Text>
          <Text variant="meta">
            {t('judge:sync.connection', { state: t(online ? 'judge:sync.online' : 'judge:sync.offline') })}
          </Text>
        </View>
        {attention.length ? (
          <View testID="sync-rejected" style={styles.rows}>
            <Text variant="meta" color={color.accentRamp[300]} accessibilityRole="header">
              {t('judge:sync.attention')}
            </Text>
            {attention.map((r) => (
              <Pressable
                key={r.entryId}
                testID={`sync-rejected-${r.entryId}`}
                accessibilityRole="button"
                onPress={() => openSheet(r.categoryId, r.entryId)}
                hitSlop={8}
              >
                <Text variant="meta" color={color.accentRamp[300]} numberOfLines={2}>
                  {t('judge:sync.rejectedRow', {
                    number: r.startNumber,
                    name: r.fullName,
                    reason: r.reason,
                  })}
                </Text>
              </Pressable>
            ))}
            {rejected.some((r) => r.code === 'CATEGORY_LOCKED') ? (
              <Text variant="caption" color={color.neutral[400]}>
                {t('judge:sync.organizerDecides')}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Button
          variant="secondary"
          size={44}
          icon="arrows-clockwise"
          label={t('judge:sync.syncNow')}
          loading={running || isSyncing}
          disabled={!online}
          onPress={() => void syncNow()}
          testID="sync-now"
        />
        {online ? null : (
          <Text variant="caption" color={color.accentRamp[300]} testID="sync-no-network">
            {t('judge:sync.noNetwork')}
          </Text>
        )}
        {/* Offline – oceny czekają na sieć; online z kolejką – wysyłka trwa; online bez kolejki – nic do
            dodania (wcześniej „po odzyskaniu połączenia” także online, U6). */}
        {!online || pending > 0 ? (
          <Text variant="caption" color={color.neutral[400]} testID="sync-safe">
            {t(online ? 'judge:sync.safeOnline' : 'judge:sync.safe')}
          </Text>
        ) : null}
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 56,
    right: layout[20],
    width: 360,
    padding: layout[16],
    gap: layout[12],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  rows: { gap: layout[6] },
});
