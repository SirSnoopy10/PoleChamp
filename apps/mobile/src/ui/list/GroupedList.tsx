import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius, shadow } from '@polechamp/tokens';
import { PRESSED_OVERLAY } from '../cards/Card';
import { Icon } from '../Icon';
import { Text } from '../Text';

/** Lista grupowana (09-design-system §4.5): wiersze rozdzielone 1 dp na tle divider. */
export function GroupedList({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} style={styles.list}>
      {Children.toArray(children)}
    </View>
  );
}

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /**
   * Wiersz edytowalny: chevron i `onPress`. Nieedytowalny (np. kategoria rozpoczęta) – bez chevronu
   * i bez akcji (UI-07). Akcje destrukcyjne nigdy nie występują w wierszu (UI-06).
   */
  onPress?: () => void;
  /** Wysokość: 56 (konfiguracja) / 60 (osoby). */
  minHeight?: 56 | 60;
  inactive?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  minHeight = 56,
  inactive,
  accessibilityLabel,
  testID,
}: ListRowProps) {
  const editable = !!onPress && !inactive;
  const body = (pressed: boolean) => (
    <View
      style={[
        styles.row,
        { minHeight },
        pressed && { backgroundColor: PRESSED_OVERLAY },
        inactive && styles.inactive,
      ]}
    >
      {leading}
      <View style={styles.texts}>
        <Text variant="body" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color={color.neutral[400]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {editable ? (
        <Icon name="caret-right" size={16} color={color.neutral[600]} testID="row-chevron" />
      ) : null}
    </View>
  );
  const label = accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title);
  if (!editable) {
    return (
      <View testID={testID} accessible accessibilityLabel={label} style={styles.cell}>
        {body(false)}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.cell}
    >
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

/** Kafelek wiodący wiersza (np. archiwum na liście turniejów). */
export function RowTile({ children }: { children: ReactNode }) {
  return <View style={styles.tile}>{children}</View>;
}

const styles = StyleSheet.create({
  list: { gap: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: color.divider, ...shadow.sm },
  cell: { backgroundColor: color.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  texts: { flex: 1, minWidth: 0, gap: 2 },
  title: { lineHeight: 20 },
  inactive: { opacity: 0.45 },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radius.r12,
    backgroundColor: color.neutral[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
