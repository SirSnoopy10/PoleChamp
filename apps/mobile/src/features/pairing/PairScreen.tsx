import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PairingCode } from '@polechamp/contracts';
import { color, layout, radius } from '@polechamp/tokens';
import { judgeRuntime } from '../../data/judge/runtime';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { TextField } from '../../ui/form';
import { ScreenGlow } from '../../ui/layout/ScreenGlow';
import { Text } from '../../ui/Text';
import { MEDIUM } from '../judge/styles';
import {
  DEVICE_LIMIT,
  maskPairingCode,
  pairDevice,
  pairErrorKey,
  parsePairingLink,
  usePairingStage,
  type PairErrorKey,
} from './pairing';

const CAMERA_SIZE = 320;
const CORNER = 28;

/**
 * SCR-JDG-06 – parowanie tabletu (IMP-301): skan QR (`expo-camera`) albo kod „XXXX-XXXX”,
 * opcjonalna nazwa tabletu, „Połącz” → etapy łączenia i pobierania list → SCR-JDG-01.
 * Link `polechamp://pair?c=…` wypełnia kod i od razu łączy (bez skanu).
 */
export function PairScreen({ initialCode }: { initialCode?: string }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const stage = usePairingStage();
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState(() => maskPairingCode(initialCode ?? ''));
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState<PairErrorKey | null>(null);
  const busy = stage !== 'idle';
  const scanned = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  const connect = useCallback(
    async (value: string) => {
      if (busy) return;
      setError(null);
      try {
        await pairDevice(judgeRuntime(), {
          code: value,
          deviceName: deviceName.trim() || t('judge:pair.defaultDeviceName'),
        });
      } catch (e) {
        scanned.current = false;
        setError(pairErrorKey(e));
      }
    },
    [busy, deviceName, t],
  );

  const auto = useRef(!!initialCode);
  useEffect(() => {
    if (!auto.current || !PairingCode.safeParse(code).success) return;
    auto.current = false;
    void connect(code);
  }, [code, connect]);

  const onScan = ({ data }: { data: string }) => {
    const link = parsePairingLink(data);
    if (!link || scanned.current) return;
    scanned.current = true;
    const masked = maskPairingCode(link.code);
    setCode(masked);
    void connect(masked);
  };

  const cameraDenied = permission !== null && !permission.granted;

  return (
    <View testID="pair-screen" style={styles.root}>
      <ScreenGlow />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + layout[48] }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.square}>
          <Icon name="qr-code" size={24} color={color.accent} />
        </View>
        <Text variant="titleL" align="center" accessibilityRole="header">
          {t('judge:pair.title')}
        </Text>
        <Text variant="bodyS" align="center" color={color.neutral[400]}>
          {t('judge:pair.text')}
        </Text>
        <View style={styles.columns}>
          <View style={styles.column}>
            {cameraDenied ? (
              <View testID="pair-no-camera" style={[styles.camera, styles.noCamera]}>
                <Text variant="bodyS" align="center" color={color.neutral[300]}>
                  {t('judge:pair.noCamera')}
                </Text>
                <Button
                  variant="ghost"
                  label={t('judge:pair.openSettings')}
                  onPress={() => void Linking.openSettings()}
                  testID="pair-open-settings"
                />
              </View>
            ) : (
              <View testID="pair-camera" style={styles.camera}>
                {permission?.granted ? (
                  <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={busy ? undefined : onScan}
                  />
                ) : null}
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
              </View>
            )}
            <Text variant="meta" align="center" color={color.neutral[400]}>
              {t('judge:pair.scan')}
            </Text>
          </View>
          <View style={styles.column}>
            <TextField
              label={t('judge:pair.code')}
              value={code}
              onChangeText={(v) => {
                setError(null);
                setCode(maskPairingCode(v));
              }}
              placeholder={t('judge:pair.codePlaceholder')}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={9}
              editable={!busy}
              testID="pair-code"
            />
            <TextField
              label={t('judge:pair.deviceName')}
              value={deviceName}
              onChangeText={setDeviceName}
              placeholder={t('judge:pair.deviceNamePlaceholder')}
              maxLength={60}
              editable={!busy}
              testID="pair-device-name"
            />
            {error ? (
              <Text
                testID="pair-error"
                variant="meta"
                color={color.accentRamp[300]}
                accessibilityLiveRegion="polite"
              >
                {t(error, { max: DEVICE_LIMIT })}
              </Text>
            ) : null}
            {busy ? (
              <View testID="pair-progress" style={styles.progress} accessibilityLiveRegion="polite">
                <ActivityIndicator color={color.accent} />
                <Text variant="meta" style={MEDIUM}>
                  {t(stage === 'connecting' ? 'judge:pair.connecting' : 'judge:pair.loading')}
                </Text>
              </View>
            ) : null}
            <Button
              label={t('judge:pair.connect')}
              size={48}
              fullWidth
              loading={busy}
              disabled={code.length !== 9}
              onPress={() => void connect(code)}
              testID="pair-connect"
            />
          </View>
        </View>
      </ScrollView>
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
  columns: { flexDirection: 'row', gap: layout[48], alignItems: 'flex-start' },
  column: { width: CAMERA_SIZE, gap: layout[16] },
  camera: {
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: color.surface,
  },
  noCamera: { alignItems: 'center', justifyContent: 'center', gap: layout[12], padding: layout[22] },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: color.accent },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: layout[4],
    borderLeftWidth: layout[4],
    borderTopLeftRadius: radius.lg,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: layout[4],
    borderRightWidth: layout[4],
    borderTopRightRadius: radius.lg,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: layout[4],
    borderLeftWidth: layout[4],
    borderBottomLeftRadius: radius.lg,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: layout[4],
    borderRightWidth: layout[4],
    borderBottomRightRadius: radius.lg,
  },
  progress: { flexDirection: 'row', alignItems: 'center', gap: layout[10] },
});
