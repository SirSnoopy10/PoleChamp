import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color } from '@polechamp/tokens';
import { useJudgeSession } from '../../data/judge/session';
import { JudgeHeader } from './JudgeHeader';
import { LogoutDialog } from './LogoutDialog';
import { PinScreen } from './PinScreen';
import { onJudgeTouch, useLogout, useReauthTimers } from './session/useJudgeSession';

/**
 * Powłoka zalogowanego sędziego (IMP-300, IMP-306): nagłówek, licznik bezczynności (dotyk),
 * wylogowanie z dialogiem SCR-JDG-09. Ponowny PIN po przerwie (FR-511) to nakładka SCR-JDG-02 nad
 * zamontowanym ekranem – formularz i jego szkic zostają, po PIN-ie sędzia wraca w to samo miejsce.
 */
export function JudgeShell({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const logout = useLogout();
  const reauthJudgeId = useJudgeSession((s) => (s.reauth ? (s.active?.judgeId ?? null) : null));
  useReauthTimers();
  return (
    <View style={styles.root}>
      <View
        testID="judge-shell"
        style={[
          styles.root,
          { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right },
        ]}
        onTouchStart={onJudgeTouch}
        accessibilityElementsHidden={!!reauthJudgeId}
        importantForAccessibility={reauthJudgeId ? 'no-hide-descendants' : 'auto'}
      >
        <JudgeHeader onLogout={logout.request} />
        <View style={styles.body}>{children}</View>
        <LogoutDialog
          count={logout.confirmCount}
          onCancel={logout.cancel}
          onConfirm={() => void logout.logout()}
        />
      </View>
      {reauthJudgeId ? (
        <View testID="reauth-overlay" style={StyleSheet.absoluteFill} accessibilityViewIsModal>
          <PinScreen key={reauthJudgeId} judgeId={reauthJudgeId} reauth />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  body: { flex: 1 },
});
