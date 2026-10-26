import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import { useT } from '../../i18n';
import { ScreenContainer } from '../../ui/layout/ScreenContainer';
import { Text } from '../../ui/Text';

export interface RoutePlaceholderProps {
  /** Identyfikator ekranu ze specyfikacji (np. `SCR-ORG-01`). */
  screen: string;
  area: 'org' | 'judge';
}

/** Zaślepka trasy do czasu ekranów EP-07 (organizator) i EP-08 (sędzia) – IMP-220. */
export function RoutePlaceholder({ screen, area }: RoutePlaceholderProps) {
  const t = useT();
  return (
    <ScreenContainer testID={`route-${screen}`}>
      <View style={styles.body}>
        <Text variant="kicker" color={color.neutral[400]}>
          {screen}
        </Text>
        <Text variant="body" color={color.neutral[300]}>
          {t(area === 'org' ? 'placeholder.org' : 'placeholder.judge')}
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ body: { gap: layout[8], paddingTop: layout[48] } });
