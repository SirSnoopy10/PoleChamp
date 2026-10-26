import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, layout, radius, shadow } from '@polechamp/tokens';
import { listActiveJudges, readTournament, type LocalJudge } from '../../data/judge/queries';
import { judgeRuntime } from '../../data/judge/runtime';
import { useLocalQuery } from '../../data/judge/useLocalQuery';
import { useSyncStore } from '../../data/sync/syncStore';
import { useT } from '../../i18n';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { Icon } from '../../ui/Icon';
import { ScreenGlow } from '../../ui/layout/ScreenGlow';
import { Text } from '../../ui/Text';
import { MEDIUM } from './styles';
import { TabletDataLifecycle } from './TabletDataLifecycle';

const COLUMNS = 3;
const CONTENT_MAX = 640;

/** Nagłówek ekranów przed zalogowaniem (SCR-JDG-01/02): `gavel`, „Panel sędziego”, nazwa turnieju. */
export function JudgeTitleBlock({ tournamentName }: { tournamentName: string }) {
  const t = useT();
  return (
    <View style={styles.title}>
      <View style={styles.square}>
        <Icon name="gavel" size={24} color={color.accent} />
      </View>
      <Text variant="titleL" align="center" accessibilityRole="header">
        {t('judge:profiles.title')}
      </Text>
      <Text variant="bodyS" align="center" color={color.neutral[400]} testID="tournament-name">
        {tournamentName}
      </Text>
    </View>
  );
}

function ProfileCard({ judge, onPress }: { judge: LocalJudge; onPress: () => void }) {
  const t = useT();
  return (
    <Pressable
      testID={`profile-${judge.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        judge.pinLocked
          ? `${t('judge:profiles.cardA11y', { name: judge.fullName })}, ${t('judge:profiles.pinLocked')}`
          : t('judge:profiles.cardA11y', { name: judge.fullName })
      }
      style={({ pressed }) => [styles.card, shadow.sm, pressed && styles.cardPressed]}
    >
      <Avatar
        name={judge.fullName}
        initials={judge.initials}
        size={64}
        state={judge.pinLocked ? 'locked' : 'active'}
      />
      <Text variant="body" align="center" numberOfLines={2} style={MEDIUM}>
        {judge.fullName}
      </Text>
      <Text variant="caption" color={judge.pinLocked ? color.accentRamp[300] : color.neutral[400]}>
        {t(judge.pinLocked ? 'judge:profiles.pinLocked' : 'judge:profiles.role')}
      </Text>
    </Pressable>
  );
}

/**
 * SCR-JDG-01 – wybór profilu (IMP-303): siatka 3 kolumn aktywnych sędziów (`position`), stany
 * „PIN zablokowany” i pusty; po zakończeniu turnieju „Sparuj z nowym turniejem” (TL-47) – nieaktywne,
 * dopóki kolejka wysyłki nie jest pusta.
 */
export function ProfilePicker() {
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tournament = useLocalQuery(readTournament, []);
  const judges = useLocalQuery(listActiveJudges, [], (e) => e.type !== 'sheetsChanged');
  const pending = useSyncStore((s) => s.pending);
  const [confirm, setConfirm] = useState(false);
  const finished = tournament?.status === 'FINISHED';

  const wipe = async () => {
    setConfirm(false);
    await TabletDataLifecycle.wipeAll(judgeRuntime().local);
  };

  const rows: LocalJudge[][] = [];
  for (let i = 0; i < judges.length; i += COLUMNS) rows.push(judges.slice(i, i + COLUMNS));

  return (
    <View testID="profiles-screen" style={styles.root}>
      <ScreenGlow />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + layout[48] }]}>
        <View style={styles.column}>
          <JudgeTitleBlock tournamentName={tournament?.name ?? ''} />
          {finished ? (
            <View testID="profiles-finished" style={styles.finished}>
              <Text variant="body" align="center">
                {t('judge:profiles.finished', { name: tournament.name })}
              </Text>
              <Button
                label={t('judge:profiles.pairNew')}
                disabled={pending > 0}
                onPress={() => setConfirm(true)}
                testID="pair-new"
              />
              {pending > 0 ? (
                <Text variant="caption" align="center" color={color.neutral[400]} testID="send-first">
                  {t('judge:profiles.sendFirst', { count: pending })}
                </Text>
              ) : null}
            </View>
          ) : (
            <>
              <Text variant="kicker" align="center" color={color.neutral[400]}>
                {t('judge:profiles.kicker')}
              </Text>
              {judges.length === 0 ? (
                <Text variant="bodyS" align="center" color={color.neutral[400]} testID="profiles-empty">
                  {t('judge:profiles.empty')}
                </Text>
              ) : (
                <View style={styles.grid}>
                  {rows.map((row, i) => (
                    <View key={i} style={styles.row}>
                      {row.map((j) => (
                        <ProfileCard key={j.id} judge={j} onPress={() => router.push(`/pin/${j.id}`)} />
                      ))}
                      {Array.from({ length: COLUMNS - row.length }, (_, k) => (
                        <View key={`gap-${k}`} style={styles.cardSlot} />
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
      <Dialog
        visible={confirm}
        onClose={() => setConfirm(false)}
        title={t('judge:profiles.pairNew')}
        text={t('judge:profiles.wipeText')}
        testID="pair-new-dialog"
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
              label={t('judge:profiles.pairNew')}
              onPress={() => void wipe()}
              testID="pair-new-confirm"
            />
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  content: { alignItems: 'center', paddingHorizontal: layout[28], paddingBottom: layout[48] },
  column: { width: '100%', maxWidth: CONTENT_MAX, gap: layout[28] },
  title: { alignItems: 'center', gap: layout[12] },
  square: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { gap: layout[12] },
  row: { flexDirection: 'row', gap: layout[12] },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: layout[10],
    paddingVertical: layout[22],
    paddingHorizontal: layout[14],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  cardPressed: { borderColor: color.accent },
  cardSlot: { flex: 1 },
  finished: { alignItems: 'center', gap: layout[16] },
});
