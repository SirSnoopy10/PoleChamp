import { StyleSheet, View } from 'react-native';
import type { TFunction } from 'i18next';
import { color, layout } from '@polechamp/tokens';
import type { LockWarnings } from '@polechamp/contracts';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { ConfirmContent, Sheet } from '../../ui/sheet';
import { Text } from '../../ui/Text';

type T = TFunction<['ui', 'org']>;

/** „5 min” / „2 godz.” / „3 dni” od chwili `iso` (SCR-ORG-14, SCR-ORG-18). */
export function sinceText(t: T, iso: string | null, now = Date.now()): string {
  if (!iso) return t('org:since.now');
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return t('org:since.now');
  if (minutes < 60) return t('org:since.minutes', { n: minutes });
  if (minutes < 24 * 60) return t('org:since.hours', { n: Math.floor(minutes / 60) });
  return t('org:since.days', { n: Math.floor(minutes / (24 * 60)) });
}

/** Treść SCR-ORG-18 z odpowiedzi `409 LOCK_WARNINGS` (TC-STATE-013). */
export function lockWarningsModel(t: T, warnings: LockWarnings, now = Date.now()) {
  return {
    missing: warnings.missingSheets > 0 ? t('org:lock.missing', { n: warnings.missingSheets }) : null,
    devices: [
      ...warnings.devicesWithPending.map((d) =>
        t('org:lock.pending', { name: d.name, count: d.pendingMutations }),
      ),
      ...warnings.offlineDevices.map((d) =>
        t('org:lock.offline', { name: d.name, time: sinceText(t, d.lastSeenAt, now) }),
      ),
    ],
  };
}

export interface LockWarningsSheetProps {
  warnings: LockWarnings | null;
  onClose: () => void;
  busy: boolean;
  onForce: () => void;
}

/** SCR-ORG-18 – „Zablokować kategorię?” (IMP-271): „Zablokuj mimo to” wysyła `force: true`. */
export function LockWarningsSheet({ warnings, onClose, busy, onForce }: LockWarningsSheetProps) {
  const t = useT();
  const model = warnings ? lockWarningsModel(t, warnings) : null;
  return (
    <Sheet
      visible={!!warnings}
      onClose={onClose}
      accessibilityLabel={t('org:lock.title')}
      testID="lock-sheet"
    >
      <ConfirmContent
        icon="lock-simple"
        title={t('org:lock.title')}
        text={model?.missing ?? undefined}
        actions={
          <>
            {model?.devices.length ? (
              <View style={styles.devices}>
                {model.devices.map((line) => (
                  <View key={line} style={styles.device}>
                    <Icon name="device-tablet" size={14} color={color.accentRamp[300]} />
                    <Text variant="meta" color={color.accentRamp[300]} style={styles.flex}>
                      {line}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Text variant="caption" align="center" color={color.neutral[400]}>
              {t('org:lock.hint')}
            </Text>
            <Button
              testID="lock-force"
              label={t('org:lock.confirm')}
              size={48}
              fullWidth
              loading={busy}
              onPress={onForce}
            />
            <Button variant="secondary" label={t('common:cancel')} size={48} fullWidth onPress={onClose} />
          </>
        }
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  devices: { gap: layout[6] },
  device: { flexDirection: 'row', alignItems: 'center', gap: layout[6] },
  flex: { flex: 1 },
});
