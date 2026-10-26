import { useLocalSearchParams } from 'expo-router';
import { PairScreen } from '../../src/features/pairing/PairScreen';

/**
 * SCR-JDG-06 parowanie (IMP-301). Link `polechamp://pair?c=…&t=…` (i `https://polechamp.app/pair`)
 * przekazuje kod w parametrze `c` – formularz wypełniony, połączenie bez skanu.
 */
export default function PairRoute() {
  const { c } = useLocalSearchParams<{ c?: string }>();
  return <PairScreen initialCode={c} />;
}
