import { typography, type TypographyStyle } from '@polechamp/tokens';
import { Text } from '../../../ui/Text';
import { registerSection } from '../registry';

const SAMPLES: Partial<Record<TypographyStyle, string>> = {
  kicker: 'Kategorie',
  numXL: '8,5',
  numL: '24,75',
  numM: '142,50',
  pin: '• • • •',
};

registerSection({
  id: 'typography',
  title: 'Typografia',
  cases: (Object.keys(typography) as TypographyStyle[]).map((variant) => ({
    id: variant,
    title: `${variant} · ${typography[variant].fontSize}/${typography[variant].lineHeight}`,
    render: () => <Text variant={variant}>{SAMPLES[variant] ?? 'Mistrzostwa Polski Pole Sport 2026'}</Text>,
  })),
});
