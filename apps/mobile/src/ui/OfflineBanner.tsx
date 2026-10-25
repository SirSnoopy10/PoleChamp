import { StyleSheet, View } from 'react-native';
import { useOnline } from '../data/network/online';
import { Banner } from './Banner';

/** Globalny baner offline organizatora pod wierszem nawigacji (IMP-215 krok 5, 06-offline §8.3). */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <View style={styles.wrap}>
      <Banner variant="offline" testID="offline-banner" />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { marginBottom: 12 } });
