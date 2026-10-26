import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import type { DeviceRow, TournamentDetails } from '@polechamp/contracts';
import type { TFunction } from 'i18next';
import { useOnline } from '../../data/network/online';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { ConfirmContent, Sheet } from '../../ui/sheet';
import { Text } from '../../ui/Text';

export interface FinishModel {
  /** „Kategorie w toku ({n})… w przygotowaniu ({m})…” – tylko gdy dotyczy. */
  categories: string | null;
  /** Ostrzeżenia TL-48 (accent-300). */
  warnings: string[];
}

/** Treść arkusza SCR-ORG-04 z `['tournament', id]` i `['devices', id]` (TC-STATE-014, TL-48). */
export function finishModel(
  t: TFunction<['ui', 'org']>,
  tournament: Pick<TournamentDetails, 'categories' | 'pendingRejectedSubmissions'>,
  devices: readonly Pick<DeviceRow, 'name' | 'pendingMutations'>[],
): FinishModel {
  const live = tournament.categories.filter((c) => c.status === 'IN_PROGRESS');
  const drafts = tournament.categories.filter((c) => c.status === 'DRAFT').length;
  const missing = live.reduce((sum, c) => sum + Math.max(0, c.progress.expected - c.progress.done), 0);
  const queued = devices.filter((d) => d.pendingMutations > 0);
  const warnings: string[] = [];
  if (missing > 0) warnings.push(t('org:finish.missing', { k: missing }));
  if (queued.length) {
    const list = queued.map((d) => t('org:finish.deviceItem', { name: d.name, n: d.pendingMutations }));
    warnings.push(t('org:finish.devices', { list: list.join(', ') }));
  }
  if (tournament.pendingRejectedSubmissions > 0) {
    warnings.push(t('org:finish.rejected', { r: tournament.pendingRejectedSubmissions }));
  }
  return {
    categories: live.length || drafts ? t('org:finish.categories', { n: live.length, m: drafts }) : null,
    warnings,
  };
}

export interface FinishTournamentSheetProps {
  visible: boolean;
  onClose: () => void;
  tournament: TournamentDetails;
  devices: readonly DeviceRow[];
  busy: boolean;
  onConfirm: () => void;
}

/** SCR-ORG-04 – „Zakończyć turniej?” (IMP-258). */
export function FinishTournamentSheet({
  visible,
  onClose,
  tournament,
  devices,
  busy,
  onConfirm,
}: FinishTournamentSheetProps) {
  const t = useT();
  const offline = !useOnline();
  const model = finishModel(t, tournament, devices);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel={t('org:finish.title')}
      testID="finish-sheet"
    >
      <ConfirmContent
        icon="flag-checkered"
        title={t('org:finish.title')}
        text={t('org:finish.text', { name: tournament.name })}
        actions={
          <>
            <View style={styles.extra}>
              {model.categories ? (
                <Text variant="meta" align="center" color={color.neutral[400]}>
                  {model.categories}
                </Text>
              ) : null}
              {model.warnings.map((w) => (
                <View key={w} style={styles.warning}>
                  <Icon name="warning-circle" size={14} color={color.accentRamp[300]} />
                  <Text variant="meta" color={color.accentRamp[300]} style={styles.warningText}>
                    {w}
                  </Text>
                </View>
              ))}
            </View>
            <Button
              testID="finish-confirm"
              label={t('org:finish.confirm')}
              size={48}
              fullWidth
              loading={busy}
              onPress={onConfirm}
              disabled={offline}
            />
            <Button variant="secondary" label={t('common:cancel')} size={48} fullWidth onPress={onClose} />
          </>
        }
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  extra: { gap: layout[8], marginBottom: layout[4] },
  warning: { flexDirection: 'row', gap: layout[6], alignItems: 'flex-start' },
  warningText: { flex: 1 },
});
