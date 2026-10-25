import { useSyncExternalStore } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { color, layout, size } from '@polechamp/tokens';
import { env } from '../../config/env';
import { appBuild, appVersion, updateSignal, type UpdateState } from '../../data/api/app-version';
import { useT } from '../../i18n';
import { Brand } from '../../ui/Brand';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { ORG_MAX_WIDTH } from '../../ui/layout/ScreenContainer';
import { Text } from '../../ui/Text';

export function useUpdateState(): UpdateState {
  return useSyncExternalStore(updateSignal.subscribe, updateSignal.getState, updateSignal.getState);
}

export const storeUrl = (os: string = Platform.OS) =>
  os === 'ios' ? env.storeUrl.ios : env.storeUrl.android;

export interface UpdateRequiredProps {
  /** Liczba niewysłanych ocen tabletu (outbox – EP-08); pokazywana, gdy wysyłka jest zatrzymana. */
  unsentCount?: number;
}

/**
 * Ekran „Zaktualizuj aplikację” (IMP-217, NFR-706) – nakładka w root layoutcie. Wysyłka outboxu
 * działa dalej, dopóki wersja ≥ `minSyncAppVersion`; poniżej – liczba niewysłanych ocen.
 */
export function UpdateRequired({ unsentCount = 0 }: UpdateRequiredProps) {
  const t = useT();
  const { syncBlocked } = useUpdateState();
  return (
    <View testID="update-required" style={styles.root} accessibilityViewIsModal>
      <View style={styles.column}>
        <Brand />
        <View style={styles.icon}>
          <Icon name="download-simple" size={28} color={color.accent} />
        </View>
        <Text variant="titleS" align="center" accessibilityRole="header">
          {t('update.title')}
        </Text>
        <Text variant="body" align="center" color={color.neutral[300]}>
          {t('update.body')}
        </Text>
        {unsentCount > 0 ? (
          <Text testID="update-sync" variant="bodyS" align="center" color={color.accentRamp[300]}>
            {syncBlocked ? t('update.syncStopped', { count: unsentCount }) : t('update.syncContinues')}
          </Text>
        ) : null}
        <Button
          label={t('update.button')}
          icon="download-simple"
          fullWidth
          onPress={() => void Linking.openURL(storeUrl())}
        />
        <Text variant="caption" align="center" color={color.neutral[500]} tabular>
          {t('update.version', { version: appVersion(), build: appBuild() })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: color.bg,
    justifyContent: 'center',
    paddingHorizontal: size.screenGutter,
  },
  column: {
    width: '100%',
    maxWidth: ORG_MAX_WIDTH,
    alignSelf: 'center',
    gap: layout[14],
    alignItems: 'stretch',
  },
  icon: { alignSelf: 'center', marginTop: layout[12] },
});
