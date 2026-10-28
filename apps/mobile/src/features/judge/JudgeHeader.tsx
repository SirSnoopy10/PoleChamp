import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { color, layout, radius, shadow } from '@polechamp/tokens';
import { readTournament } from '../../data/judge/queries';
import { useJudgeSession } from '../../data/judge/session';
import { useLocalQuery } from '../../data/judge/useLocalQuery';
import { useT } from '../../i18n';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { FadedDivider } from '../../ui/layout/FadedDivider';
import { Text } from '../../ui/Text';
import { SyncPill } from '../sync/SyncPill';
import { MEDIUM } from './styles';

/** Nagłówek zalogowanego sędziego: turniej z lokalnej bazy, sesja i pigułka synchronizacji. */
export function JudgeHeader({ onLogout }: { onLogout: () => void }) {
  const judge = useJudgeSession((s) => s.active);
  const tournament = useLocalQuery(
    readTournament,
    [],
    (e) => e.type === 'snapshotApplied' || e.type === 'tournamentChanged',
  );
  return (
    <JudgeHeaderView
      tournamentName={tournament?.name ?? ''}
      judge={judge}
      pill={<SyncPill />}
      onLogout={onLogout}
    />
  );
}

export interface JudgeHeaderViewProps {
  tournamentName: string;
  judge: { fullName: string; initials: string } | null;
  /** Slot pigułki synchronizacji (`SyncPill`; w DevCatalog – `StatusPill` w danym stanie). */
  pill: ReactNode;
  onLogout: () => void;
}

/**
 * Nagłówek trybu sędziego (06-ekrany-sedziego §0, IMP-300): 60 dp, `gavel` w kwadracie 30 dp,
 * „Panel sędziego” + nazwa turnieju (wielokropek), pigułka synchronizacji, chip sędziego, wylogowanie.
 */
export function JudgeHeaderView({ tournamentName, judge, pill, onLogout }: JudgeHeaderViewProps) {
  const t = useT();
  return (
    <View testID="judge-header" style={styles.header}>
      <View style={styles.gavel}>
        <Icon name="gavel" size={16} color={color.accent} testID="judge-header-gavel" />
      </View>
      <View style={styles.titles}>
        <Text variant="kicker" color={color.neutral[400]} style={styles.panel}>
          {t('judge:header.panel')}
        </Text>
        <Text variant="bodyS" numberOfLines={1} style={MEDIUM} testID="judge-header-tournament">
          {tournamentName}
        </Text>
      </View>
      {pill}
      {judge ? (
        <View testID="judge-chip" style={[styles.chip, shadow.sm]}>
          <Avatar name={judge.fullName} initials={judge.initials} size={28} />
          <Text variant="meta" numberOfLines={1}>
            {judge.fullName}
          </Text>
        </View>
      ) : null}
      <Button
        variant="iconRound"
        roundSize={36}
        icon="sign-out"
        accessibilityLabel={t('judge:header.logout')}
        onPress={onLogout}
        testID="judge-logout"
      />
      <FadedDivider position="bottom" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout[12],
    paddingHorizontal: layout[20],
    backgroundColor: color.bg,
  },
  gavel: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, minWidth: 160 },
  panel: { textTransform: 'none', letterSpacing: 0 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout[8],
    maxWidth: 260,
    flexShrink: 1,
    minWidth: 0,
    paddingTop: layout[4],
    paddingBottom: layout[4],
    paddingLeft: layout[4],
    paddingRight: layout[12],
    borderRadius: radius.pill,
    backgroundColor: color.surface,
  },
});
