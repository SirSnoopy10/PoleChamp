import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import type { DeviceRow, JudgeRow } from '@polechamp/contracts';
import { useT } from '../../i18n';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Icon, type IconName } from '../../ui/Icon';
import { ScreenContainer } from '../../ui/layout/ScreenContainer';
import { ScreenHeader } from '../../ui/layout/ScreenHeader';
import { StickyActionBar, useStickyBarHeight } from '../../ui/layout/StickyActionBar';
import { GroupedList, ListRow, RowTile } from '../../ui/list/GroupedList';
import { OfflineBanner } from '../../ui/OfflineBanner';
import { SectionHeader } from '../../ui/SectionHeader';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { SkeletonRow } from '../../ui/Skeleton';
import { Text } from '../../ui/Text';
import { sinceText } from '../org/time';

export type JudgesTab = 'judges' | 'devices';

/** Ikona baterii wg poziomu 0–1 (`battery-*`). */
export function batteryIcon(level: number): IconName {
  if (level >= 0.9) return 'battery-full';
  if (level >= 0.6) return 'battery-high';
  if (level >= 0.35) return 'battery-medium';
  if (level >= 0.15) return 'battery-low';
  return 'battery-warning';
}

export interface JudgesDevicesScreenProps {
  judges: JudgeRow[] | undefined;
  devices: DeviceRow[] | undefined;
  loading: boolean;
  error: boolean;
  tab: JudgesTab;
  onTab: (tab: JudgesTab) => void;
  canWrite: boolean;
  /** Akcje urządzeń (nazwa, odłączenie) – także w turnieju zakończonym, tylko online (UX-41). */
  canManageDevices: boolean;
  /** Turniej Zakończona – bez „Dodaj” i „Sparuj tablet”. */
  finished: boolean;
  /** Bieżący czas (odświeżany co 30 s – „Offline od …”). */
  now: number;
  onBack: () => void;
  onRetry: () => void;
  onAddJudge: () => void;
  onOpenJudge: (judge: JudgeRow) => void;
  onOpenDevice: (device: DeviceRow) => void;
  onPair: () => void;
  sheets?: ReactNode;
}

/** SCR-ORG-14 – sędziowie i urządzenia (IMP-273). */
export function JudgesDevicesScreen({
  judges,
  devices,
  loading,
  error,
  tab,
  onTab,
  canWrite,
  canManageDevices,
  finished,
  now,
  onBack,
  onRetry,
  onAddJudge,
  onOpenJudge,
  onOpenDevice,
  onPair,
  sheets,
}: JudgesDevicesScreenProps) {
  const t = useT();
  const barHeight = useStickyBarHeight();

  const judgeState = (j: JudgeRow) =>
    !j.isActive
      ? t('org:judges.inactive')
      : j.pinLocked
        ? t('org:judges.pinLocked')
        : t('org:judges.active', { count: j.sheetCount });

  const deviceLine = (d: DeviceRow) => {
    const base = d.online
      ? d.activeJudge
        ? t('org:judges.onlineJudge', { judge: d.activeJudge.fullName })
        : t('org:judges.onlineNobody')
      : t('org:judges.offlineSince', { time: sinceText(t, d.lastSeenAt, now) });
    return d.pendingMutations > 0 ? base + t('org:judges.pending', { count: d.pendingMutations }) : base;
  };

  const loadingRows = (
    <View testID="judges-loading">
      <SkeletonRow />
      <SkeletonRow />
    </View>
  );

  const judgesTab = !judges ? (
    error && !loading ? (
      <EmptyState variant="error" onRetry={onRetry} />
    ) : (
      loadingRows
    )
  ) : (
    <View style={styles.section}>
      {/* Bez nagłówka powtarzającego nazwę zakładki (UX2-27) – tylko akcja dodania. */}
      {finished || !canWrite ? null : (
        <SectionHeader
          title={t('org:judges.addA11y')}
          onAdd={onAddJudge}
          addAccessibilityLabel={t('org:judges.addA11y')}
        />
      )}
      {judges.length ? (
        <GroupedList testID="judges-list">
          {judges.map((j) => (
            <ListRow
              key={j.id}
              testID={`judge-${j.id}`}
              minHeight={60}
              title={j.fullName}
              leading={
                <Avatar
                  name={j.fullName}
                  initials={j.initials || undefined}
                  state={!j.isActive ? 'inactive' : j.pinLocked ? 'locked' : 'active'}
                />
              }
              subtitle={judgeState(j)}
              onPress={finished ? undefined : () => onOpenJudge(j)}
            />
          ))}
        </GroupedList>
      ) : (
        <EmptyState variant="inline" text={t('org:judges.empty')} />
      )}
    </View>
  );

  const devicesTab = !devices ? (
    error && !loading ? (
      <EmptyState variant="error" onRetry={onRetry} />
    ) : (
      loadingRows
    )
  ) : (
    <View style={styles.section}>
      {devices.length ? (
        <GroupedList testID="devices-list">
          {devices.map((d) => (
            <ListRow
              key={d.id}
              testID={`device-${d.id}`}
              title={d.name}
              subtitle={deviceLine(d)}
              leading={
                <RowTile>
                  <Icon name="device-tablet" size={18} color={d.online ? color.accent : color.neutral[400]} />
                </RowTile>
              }
              trailing={
                d.batteryLevel !== null ? (
                  <View
                    style={styles.battery}
                    accessible
                    accessibilityLabel={t('org:judges.batteryA11y', {
                      pct: Math.round(d.batteryLevel * 100),
                    })}
                  >
                    <Icon name={batteryIcon(d.batteryLevel)} size={18} color={color.neutral[400]} />
                    <Text variant="caption" tabular color={color.neutral[400]}>
                      {t('org:judges.battery', { pct: Math.round(d.batteryLevel * 100) })}
                    </Text>
                  </View>
                ) : undefined
              }
              onPress={canManageDevices ? () => onOpenDevice(d) : undefined}
            />
          ))}
        </GroupedList>
      ) : (
        <EmptyState variant="inline" text={t('org:judges.noDevices')} />
      )}
    </View>
  );

  return (
    <>
      <ScreenContainer
        testID="judges-screen"
        footerHeight={finished ? 0 : barHeight}
        footer={
          finished ? undefined : (
            <StickyActionBar>
              <Button
                testID="pair-tablet"
                label={t('org:judges.pair')}
                icon="qr-code"
                size={48}
                fullWidth
                onBar
                disabled={!canWrite}
                onPress={onPair}
              />
            </StickyActionBar>
          )
        }
      >
        <ScreenHeader back={{ label: t('nav.tournament'), onPress: onBack }} />
        <OfflineBanner />
        <Text variant="titleM" accessibilityRole="header">
          {t('org:judges.title')}
        </Text>
        <View style={styles.segments}>
          <SegmentedControl<JudgesTab>
            testID="judges-tabs"
            value={tab}
            onChange={onTab}
            segments={[
              {
                key: 'judges',
                label: t('org:judges.tabJudges'),
                count: judges?.filter((j) => j.isActive).length,
              },
              { key: 'devices', label: t('org:judges.tabDevices'), count: devices?.length },
            ]}
          />
        </View>
        {tab === 'judges' ? judgesTab : devicesTab}
      </ScreenContainer>
      {sheets}
    </>
  );
}

const styles = StyleSheet.create({
  segments: { marginVertical: layout[18] },
  section: { gap: layout[4] },
  battery: { flexDirection: 'row', alignItems: 'center', gap: layout[4] },
});
