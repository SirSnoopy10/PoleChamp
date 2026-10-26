import { useLocalSearchParams } from 'expo-router';
import { RoutePlaceholder } from '../../src/features/system/RoutePlaceholder';

/**
 * SCR-JDG-06 parowanie – ekran w EP-08. Link `polechamp://pair?c=…&t=…` (i `https://polechamp.app/pair`)
 * przekazuje kod i turniej w parametrach (`c`, `t`) do wypełnienia formularza.
 */
export default function PairRoute() {
  const { c, t } = useLocalSearchParams<{ c?: string; t?: string }>();
  return <RoutePlaceholder screen={`SCR-JDG-06${c ? ` · ${c}` : ''}${t ? ` · ${t}` : ''}`} area="judge" />;
}
