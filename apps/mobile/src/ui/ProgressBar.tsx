import { View } from 'react-native';
import { color } from '@polechamp/tokens';
import { useT } from '../i18n';

export interface ProgressBarProps {
  /** Postęp 0–1. */
  value: number;
  /** 3 (ranking), 4 (karty), 6 (postęp turnieju) dp. */
  height?: 3 | 4 | 6;
  tone?: 'primary' | 'secondary';
  /** Etykieta tekstowa obok paska (np. „30/45 ocen”) – trafia do czytnika ekranu. */
  label?: string;
  testID?: string;
}

/** Pasek postępu (09-design-system §4.12): rola `progressbar` z wartością w procentach. */
export function ProgressBar({ value, height = 4, tone = 'primary', label, testID }: ProgressBarProps) {
  const t = useT();
  const clamped = Math.min(1, Math.max(0, value));
  const pct = Math.round(clamped * 100);
  return (
    <View
      testID={testID ?? 'progress-bar'}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? t('progress.a11y', { pct })}
      accessibilityValue={{ now: pct, min: 0, max: 100, text: label }}
      style={{ height, borderRadius: height / 2, backgroundColor: color.neutral[800], overflow: 'hidden' }}
    >
      <View
        style={{
          width: `${pct}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: tone === 'primary' ? color.accent : color.accentRamp[700],
        }}
      />
    </View>
  );
}
