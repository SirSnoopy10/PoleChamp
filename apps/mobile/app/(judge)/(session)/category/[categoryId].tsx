import { useLocalSearchParams } from 'expo-router';
import { JudgeCategoryScreen } from '../../../../src/features/judge/JudgeCategoryScreen';

/** SCR-JDG-04/05 kategoria i formularz oceny (`?entry=` – wybrana zawodniczka). */
export default function JudgeCategoryRoute() {
  const { categoryId, entry } = useLocalSearchParams<{ categoryId: string; entry?: string }>();
  return <JudgeCategoryScreen categoryId={categoryId} entryId={entry || null} />;
}
