import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, layout, size } from '@polechamp/tokens';
import { useT } from '../../i18n';
import type { AppMode } from '../../mode/mode';
import { Brand } from '../../ui/Brand';
import { ModeCard } from '../../ui/cards/ModeCard';
import { ORG_MAX_WIDTH } from '../../ui/layout/ScreenContainer';
import { Text } from '../../ui/Text';
import { deviceCapabilities, type DeviceCapabilities } from './deviceCapabilities';

export interface ModeScreenProps {
  onSelect: (mode: AppMode) => void;
  /** Wstrzykiwane w testach; domyślnie z wymiarów ekranu. */
  capabilities?: DeviceCapabilities;
}

/** SCR-SYS-01 – wybór trybu przy pierwszym uruchomieniu (IMP-213). */
export function ModeScreen({ onSelect, capabilities }: ModeScreenProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const caps = useMemo(() => capabilities ?? deviceCapabilities(), [capabilities]);
  return (
    <View
      testID="mode-screen"
      style={[
        styles.root,
        { paddingTop: insets.top + layout[22], paddingBottom: insets.bottom + layout[22] },
      ]}
    >
      <View style={styles.column}>
        <View style={styles.brand}>
          <Brand />
        </View>
        <Text variant="body" align="center" color={color.neutral[300]}>
          {t('mode.question')}
        </Text>
        <ModeCard
          testID="mode-org"
          icon="device-mobile"
          title={t('mode.organizer')}
          hint={t('mode.organizerHint')}
          onPress={() => onSelect('org')}
        />
        <ModeCard
          testID="mode-judge"
          icon="device-tablet"
          title={t('mode.judge')}
          hint={t('mode.judgeHint')}
          disabledHint={t('mode.judgeRequiresTablet')}
          onPress={caps.supportsJudge ? () => onSelect('judge') : undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg,
    justifyContent: 'center',
    paddingHorizontal: size.screenGutter,
  },
  column: { width: '100%', maxWidth: ORG_MAX_WIDTH, alignSelf: 'center', gap: layout[14] },
  brand: { marginBottom: layout[8] },
});
