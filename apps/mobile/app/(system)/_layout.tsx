import { Stack } from 'expo-router';
import { color } from '@polechamp/tokens';

/** Ekrany systemowe (wybór trybu) – poza strażnikami trybów. */
export default function SystemLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />;
}
