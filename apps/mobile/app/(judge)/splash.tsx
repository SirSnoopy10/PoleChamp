import { Redirect } from 'expo-router';

/**
 * SCR-JDG-00 – start tabletu to nakładka splash w `app/_layout.tsx` (`useJudgeSplashStage`, IMP-302),
 * jak splash organizatora (IMP-254). Trasa zostaje dla starych linków – przejście do wyboru profilu.
 */
export default function JudgeSplashRoute() {
  return <Redirect href="/profiles" />;
}
