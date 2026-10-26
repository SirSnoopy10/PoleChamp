import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import type { AppConfig, Me } from '@polechamp/contracts';
import { useT } from '../../i18n';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/cards/Card';
import { EmptyState } from '../../ui/EmptyState';
import { TextField } from '../../ui/form';
import { Icon } from '../../ui/Icon';
import { ScreenContainer } from '../../ui/layout/ScreenContainer';
import { ScreenHeader } from '../../ui/layout/ScreenHeader';
import { GroupedList, ListRow } from '../../ui/list/GroupedList';
import { OfflineBanner } from '../../ui/OfflineBanner';
import { ConfirmContent, Sheet } from '../../ui/sheet';
import { Skeleton } from '../../ui/Skeleton';
import { Text } from '../../ui/Text';

type LegalKey = keyof AppConfig['legal'];

export interface AccountScreenProps {
  me: Me | undefined;
  config: AppConfig | undefined;
  loading: boolean;
  error: boolean;
  version: string;
  canWrite: boolean;
  loggingOut: boolean;
  onBack: () => void;
  onRetry: () => void;
  onVerify: () => void;
  onOpenLink: (url: string) => void;
  onLogout: () => void;
  /** Usunięcie konta – rzuca `ApiError` (np. `ACTIVE_TOURNAMENT_EXISTS`). */
  onDelete: () => Promise<unknown>;
}

const DOCS: { key: LegalKey; label: string }[] = [
  { key: 'termsUrl', label: 'org:account.terms' },
  { key: 'privacyUrl', label: 'org:account.privacy' },
  { key: 'dpaUrl', label: 'org:account.dpa' },
  { key: 'supportUrl', label: 'org:account.support' },
];

/** Arkusz usunięcia konta: przycisk aktywny dopiero po wpisaniu „USUŃ”. */
function DeleteAccountSheet({
  visible,
  onClose,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  onDelete: () => Promise<unknown>;
}) {
  const t = useT();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const word = t('org:account.deleteWord');
  useEffect(() => {
    if (visible) setTyped('');
  }, [visible]);
  const confirm = async () => {
    setBusy(true);
    try {
      await onDelete();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel={t('org:account.deleteTitle')}
      testID="delete-sheet"
    >
      <ConfirmContent
        icon="trash"
        title={t('org:account.deleteTitle')}
        text={t('org:account.deleteText', { word })}
        actions={
          <>
            <TextField
              testID="delete-word"
              label={t('org:account.deleteField')}
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Button
              testID="delete-confirm"
              variant="secondary"
              label={t('org:account.deleteConfirm')}
              size={48}
              fullWidth
              disabled={typed.trim().toLocaleUpperCase('pl') !== word}
              loading={busy}
              onPress={() => void confirm()}
            />
            <Button variant="ghost" label={t('common:cancel')} size={48} fullWidth onPress={onClose} />
          </>
        }
      />
    </Sheet>
  );
}

/** SCR-ORG-21 – konto (IMP-277): profil, dokumenty prawne z `app-config`, wylogowanie, usunięcie konta. */
export function AccountScreen({
  me,
  config,
  loading,
  error,
  version,
  canWrite,
  loggingOut,
  onBack,
  onRetry,
  onVerify,
  onOpenLink,
  onLogout,
  onDelete,
}: AccountScreenProps) {
  const t = useT();
  const [deleting, setDeleting] = useState(false);
  return (
    <>
      <ScreenContainer testID="account-screen">
        <ScreenHeader back={{ label: t('nav.tournaments'), onPress: onBack }} />
        <OfflineBanner />
        <Text variant="titleM" accessibilityRole="header" style={styles.title}>
          {t('org:account.title')}
        </Text>
        {me ? (
          <Card padding={16} style={styles.profile} testID="account-profile">
            <Text variant="subhead">{me.displayName}</Text>
            <Text variant="meta" color={color.neutral[400]}>
              {me.email}
            </Text>
            {me.emailVerified ? (
              <View style={styles.verified}>
                <Badge variant="scored" />
                <Text variant="caption" color={color.accentRamp[300]}>
                  {t('org:account.verified')}
                </Text>
              </View>
            ) : (
              <Button
                testID="account-verify"
                variant="ghost"
                size={44}
                label={t('org:account.verify')}
                onPress={onVerify}
                style={styles.start}
              />
            )}
          </Card>
        ) : error && !loading ? (
          <EmptyState variant="error" onRetry={onRetry} />
        ) : (
          <Skeleton height={96} />
        )}
        <View style={styles.section}>
          <GroupedList testID="account-docs">
            {DOCS.map((doc) => (
              <ListRow
                key={doc.key}
                testID={`doc-${doc.key}`}
                title={t(doc.label as never)}
                onPress={config ? () => onOpenLink(config.legal[doc.key]) : undefined}
              />
            ))}
            <ListRow
              title={t('org:account.version', { version })}
              leading={<Icon name="info" size={18} color={color.neutral[400]} />}
            />
          </GroupedList>
        </View>
        <View style={styles.actions}>
          <Button
            testID="account-logout"
            variant="secondary"
            icon="sign-out"
            label={t('org:account.logout')}
            size={48}
            fullWidth
            loading={loggingOut}
            onPress={onLogout}
          />
          <Button
            testID="account-delete"
            variant="ghost"
            destructive
            size={44}
            label={t('org:account.delete')}
            disabled={!canWrite}
            onPress={() => setDeleting(true)}
            style={styles.center}
          />
        </View>
      </ScreenContainer>
      <DeleteAccountSheet visible={deleting} onClose={() => setDeleting(false)} onDelete={onDelete} />
    </>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: layout[18] },
  profile: { gap: layout[4] },
  verified: { flexDirection: 'row', alignItems: 'center', gap: layout[6], marginTop: layout[6] },
  start: { alignSelf: 'flex-start' },
  section: { marginTop: layout[22] },
  actions: { marginTop: layout[28], gap: layout[8] },
  center: { alignSelf: 'center' },
});
