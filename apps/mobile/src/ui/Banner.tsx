import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius } from '@polechamp/tokens';
import { useT } from '../i18n';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type BannerVariant = 'locked' | 'rejected' | 'offline' | 'emailVerify';

const ICON: Record<BannerVariant, IconName> = {
  locked: 'lock-simple',
  rejected: 'warning-circle',
  offline: 'cloud-slash',
  emailVerify: 'info',
};

export interface BannerProps {
  variant: BannerVariant;
  /** Tekst własny (np. liczba odrzuconych ocen); domyślnie z katalogu `ui:banner.*`. */
  text?: string;
  /** `rejected`: tapnięcie otwiera listę odrzuconych. */
  onPress?: () => void;
  /** Wersja informacyjna (np. odrzucone oceny po zakończeniu turnieju – UX-32): kolory neutralne. */
  muted?: boolean;
  /** `emailVerify`: „Wyślij kod ponownie”. */
  onAction?: () => void;
  testID?: string;
}

/** Baner stanu (09-design-system §4.19): accent-900/accent-200, offline neutral-900/neutral-300. */
export function Banner({ variant, text, onPress, onAction, muted = false, testID }: BannerProps) {
  const t = useT();
  const offline = variant === 'offline' || muted;
  const fg = offline ? color.neutral[300] : color.accentRamp[200];
  const label = text ?? t(`banner.${variant === 'rejected' ? 'locked' : variant}`);
  const body = (
    <View style={styles.row}>
      <Icon name={muted ? 'info' : ICON[variant]} size={15} color={fg} />
      <Text variant="caption" color={fg} style={styles.text}>
        {label}
      </Text>
      {variant === 'rejected' && onPress ? <Icon name="caret-right" size={15} color={fg} /> : null}
    </View>
  );
  const frame = [styles.banner, { backgroundColor: offline ? color.neutral[900] : color.accentRamp[900] }];
  return (
    <View testID={testID ?? `banner-${variant}`} accessibilityLiveRegion="polite">
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={frame}>
          {body}
        </Pressable>
      ) : (
        <View accessible accessibilityRole="alert" accessibilityLabel={label} style={frame}>
          {body}
        </View>
      )}
      {variant === 'emailVerify' && onAction ? (
        <Button
          variant="ghost"
          size={44}
          label={t('banner.resendCode')}
          onPress={onAction}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { flex: 1 },
  action: { alignSelf: 'flex-start' },
});
