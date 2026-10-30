import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { color, layout, radius } from '@polechamp/tokens';
import type { DeviceRow } from '@polechamp/contracts';
import { useOnline } from '../../data/network/online';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Sheet, SheetHeader } from '../../ui/sheet';
import { Skeleton } from '../../ui/Skeleton';
import { Text } from '../../ui/Text';
import { toastSaveError } from '../categories/CategoryFormSheet';

const KEEP_AWAKE_TAG = 'pairing';
const QR_SIZE = 200;

export interface PairingCode {
  code: string;
  qrPayload: string;
  expiresAt: string;
}

/** „K7QM4ZTX” → „K7QM-4ZTX”. */
export const formatPairingCode = (code: string) =>
  code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

/** Sekundy → „mm:ss”. */
export const mmss = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export interface PairTabletSheetProps {
  visible: boolean;
  onClose: () => void;
  /** `POST …/pairing-codes` – przy otwarciu i „Nowy kod”. */
  onCreateCode: () => Promise<PairingCode>;
  /** Urządzenia turnieju (aktualizowane zdarzeniem `device.paired`). */
  devices: readonly DeviceRow[];
  now?: () => number;
}

/**
 * SCR-ORG-16 – parowanie tabletu (IMP-275): QR na jasnym tle (wyjątek kolorystyczny, NFR-209),
 * kod tekstowy, odliczanie ważności, „Sparowane teraz” – tablety, których nie było przy otwarciu.
 */
export function PairTabletSheet({
  visible,
  onClose,
  onCreateCode,
  devices,
  now = Date.now,
}: PairTabletSheetProps) {
  const t = useT();
  const offline = !useOnline();
  const [code, setCode] = useState<PairingCode | null>(null);
  const [left, setLeft] = useState(0);
  const known = useRef<Set<string> | null>(null);

  const refresh = async () => {
    try {
      const next = await onCreateCode();
      setCode(next);
      setLeft(Math.max(0, Math.round((Date.parse(next.expiresAt) - now()) / 1000)));
    } catch (e) {
      toastSaveError(e);
    }
  };

  useEffect(() => {
    if (!visible) {
      setCode(null);
      known.current = null;
      return;
    }
    known.current = new Set(devices.map((d) => d.id));
    void refresh();
    // Wygaszanie ekranu wstrzymane na czas parowania; odmowa (np. Wake Lock w przeglądarce) nie przeszkadza.
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
  }, [visible]);

  useEffect(() => {
    if (!code || left <= 0) return;
    const id = setTimeout(
      () => setLeft(Math.max(0, Math.round((Date.parse(code.expiresAt) - now()) / 1000))),
      1000,
    );
    return () => clearTimeout(id);
  }, [code, left]);

  const expired = !!code && left <= 0;
  const paired = known.current ? devices.filter((d) => !known.current?.has(d.id)) : [];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel={t('org:pairing.title')}
      testID="pair-sheet"
    >
      <View style={styles.body}>
        <SheetHeader title={t('org:pairing.title')} />
        <Text variant="meta" color={color.neutral[300]}>
          {t('org:pairing.instructions')}
        </Text>
        <View
          style={[styles.qrCard, expired && styles.dimmed]}
          testID="pair-qr"
          accessibilityLabel={t('org:pairing.qrA11y')}
        >
          {code ? (
            <QRCode
              value={code.qrPayload}
              size={QR_SIZE}
              color={color.neutral[900]}
              backgroundColor={color.neutral[100]}
            />
          ) : (
            <Skeleton width={QR_SIZE} height={QR_SIZE} />
          )}
        </View>
        {code ? (
          <View style={[styles.center, expired && styles.dimmed]}>
            <Text variant="numL" tabular style={styles.code} testID="pair-code">
              {formatPairingCode(code.code)}
            </Text>
          </View>
        ) : null}
        <Text variant="caption" align="center" tabular color={color.neutral[400]} testID="pair-countdown">
          {expired ? t('org:pairing.expired') : code ? t('org:pairing.validFor', { time: mmss(left) }) : ''}
        </Text>
        {paired.length ? (
          <View style={styles.paired} testID="paired-now">
            <Text variant="kicker" color={color.neutral[400]}>
              {t('org:pairing.pairedNow')}
            </Text>
            {paired.map((d) => (
              <View key={d.id} style={styles.pairedRow}>
                <Icon name="check-circle" weight="fill" size={16} color={color.accent} />
                <Text variant="bodyS">{d.name}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Button
          testID="pair-new-code"
          variant="secondary"
          label={t('org:pairing.newCode')}
          size={48}
          fullWidth
          disabled={offline || !expired}
          onPress={() => void refresh()}
        />
        {expired ? null : (
          <Text variant="caption" align="center" color={color.neutral[400]} testID="pair-new-code-hint">
            {t('org:pairing.newCodeHint')}
          </Text>
        )}
        <Button testID="pair-done" label={t('org:pairing.done')} size={48} fullWidth onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: layout[12] },
  qrCard: {
    alignSelf: 'center',
    padding: layout[16],
    borderRadius: radius.lg,
    backgroundColor: color.neutral[100],
  },
  dimmed: { opacity: 0.35 },
  center: { alignItems: 'center' },
  // 28 dp, odstęp liter 0,1 em (SCR-ORG-16).
  code: { fontSize: layout[28], letterSpacing: layout[28] * 0.1 },
  paired: { gap: layout[6] },
  pairedRow: { flexDirection: 'row', alignItems: 'center', gap: layout[8] },
});
