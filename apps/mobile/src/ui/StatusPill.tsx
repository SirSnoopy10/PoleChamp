import { StyleSheet, View } from 'react-native';
import { color, role } from '@polechamp/tokens';
import { useT } from '../i18n';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type StatusVariant = 'draft' | 'live' | 'done' | 'unplayed' | 'provisional';
export type SyncVariant = 'synced' | 'sending' | 'offlineQueue' | 'offline' | 'attention';
export type PillVariant = StatusVariant | SyncVariant;

interface PillStyle {
  dot?: string;
  icon?: IconName;
  background: string;
  text: string;
  border?: string;
}

/** Kolory wg ról `status*` (09-design-system §2.1) i stanów synchronizacji (06-offline §8.1). */
const STYLES: Record<PillVariant, PillStyle> = {
  draft: {
    dot: role.statusDraft.dot,
    background: 'transparent',
    text: role.statusDraft.text,
    border: color.divider,
  },
  live: { dot: role.statusLive.dot, background: role.statusLive.background, text: role.statusLive.text },
  done: { dot: role.statusDone.dot, background: role.statusDone.background, text: role.statusDone.text },
  unplayed: {
    dot: role.statusDraft.dot,
    background: 'transparent',
    text: role.statusDraft.text,
    border: color.divider,
  },
  provisional: { background: color.neutral[900], text: color.neutral[300] },
  synced: {
    icon: 'cloud-check',
    dot: color.accent,
    background: 'transparent',
    text: color.neutral[300],
    border: color.divider,
  },
  sending: {
    icon: 'arrows-clockwise',
    dot: color.accent,
    background: 'transparent',
    text: color.neutral[300],
    border: color.divider,
  },
  offlineQueue: {
    icon: 'cloud-slash',
    background: color.accentRamp[900],
    text: color.accentRamp[200],
    border: color.accentRamp[800],
  },
  offline: { icon: 'cloud-slash', background: color.neutral[900], text: color.neutral[300] },
  attention: {
    icon: 'warning-circle',
    background: color.accentRamp[900],
    text: color.accentRamp[300],
    border: color.accent,
  },
};

export interface StatusPillProps {
  variant: PillVariant;
  /** Liczba ocen w kolejce dla `sending` / `offlineQueue`. */
  count?: number;
  testID?: string;
}

/** Pigułka statusu (09-design-system §4.2): nie zawija tekstu (UI-11) i nie jest przyciskiem (UI-02). */
export function StatusPill({ variant, count = 0, testID }: StatusPillProps) {
  const t = useT();
  const s = STYLES[variant];
  const label = t(`status.${variant}`, { count });
  return (
    <View
      testID={testID ?? `pill-${variant}`}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.pill, { backgroundColor: s.background, borderColor: s.border ?? 'transparent' }]}
    >
      {s.icon ? <Icon name={s.icon} size={13} color={s.text} /> : null}
      {s.dot && !s.icon ? <View style={[styles.dot, { backgroundColor: s.dot }]} /> : null}
      <Text variant="kicker" numberOfLines={1} color={s.text} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexShrink: 0,
    gap: 6,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 8,
    paddingRight: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  // Kapsuła używa rozmiaru kickera (11,5 dp), ale bez wersalików.
  label: { textTransform: 'none', letterSpacing: 0 },
});
