import { useEffect, useState } from 'react';
import { formatScore } from '@polechamp/scoring';
import { ScrollView, StyleSheet, View } from 'react-native';
import { color, layout } from '@polechamp/tokens';
import type { RejectedSubmission } from '@polechamp/contracts';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { ConfirmContent, Sheet, SheetHeader, SheetStep } from '../../ui/sheet';
import { SkeletonRow } from '../../ui/Skeleton';
import { Text } from '../../ui/Text';
import { toast } from '../../ui/Toast';
import { toastSaveError } from '../categories/CategoryFormSheet';
import { formatClock } from '../org/time';

const REASONS = new Set([
  'CATEGORY_LOCKED',
  'CATEGORY_NOT_STARTED',
  'TOURNAMENT_FINISHED',
  'JUDGE_NOT_IN_PANEL',
  'JUDGE_INACTIVE',
  'ENTRY_WITHDRAWN',
  'PIN_VERSION_OUTDATED',
  'JUDGE_SESSION_INVALID',
]);

export interface RejectedSheetProps {
  visible: boolean;
  onClose: () => void;
  items: RejectedSubmission[] | undefined;
  loading: boolean;
  /** Filtr kategorii (wejście z banera kategorii). */
  categoryId?: string;
  /** Kategorie zablokowane – „Przyjmij” nieaktywny. */
  lockedCategoryIds: ReadonlySet<string>;
  canWrite: boolean;
  /** Turniej zakończony – wersja informacyjna (UX-32). */
  tournamentFinished?: boolean;
  onAccept: (item: RejectedSubmission) => Promise<unknown>;
  onDiscard: (item: RejectedSubmission) => Promise<unknown>;
  /** Odświeżenie listy i statusów kategorii przy otwarciu arkusza (UX-03). */
  onOpen?: () => void;
}

/**
 * SCR-ORG-22 – odrzucone oceny (IMP-272): „Przyjmij” po odblokowaniu kategorii, „Odrzuć” z drugim
 * krokiem; ocena z `newerSheetExists` wymaga potwierdzenia nadpisania.
 */
export function RejectedSheet({
  visible,
  onClose,
  items,
  loading,
  categoryId,
  lockedCategoryIds,
  canWrite,
  tournamentFinished = false,
  onAccept,
  onDiscard,
  onOpen,
}: RejectedSheetProps) {
  const t = useT();
  useEffect(() => {
    // Tylko przy otwarciu (zmiana `visible`), nie przy każdej nowej funkcji `onOpen`.
    if (visible) onOpen?.();
  }, [visible]);
  const [confirm, setConfirm] = useState<{ item: RejectedSubmission; action: 'accept' | 'discard' } | null>(
    null,
  );
  const shown = (items ?? []).filter((i) => !categoryId || i.category.id === categoryId);

  const run = async (item: RejectedSubmission, action: 'accept' | 'discard') => {
    try {
      await (action === 'accept' ? onAccept(item) : onDiscard(item));
      toast.success(action === 'accept' ? 'toasts:rejectedAccepted' : 'toasts:rejectedDiscarded');
    } catch (e) {
      toastSaveError(e);
    } finally {
      setConfirm(null);
    }
  };

  const close = () => {
    setConfirm(null);
    onClose();
  };

  const reason = (code: string) => (REASONS.has(code) ? t(`org:rejected.reason.${code}` as never) : code);

  return (
    <Sheet
      scroll={false}
      visible={visible}
      onClose={close}
      accessibilityLabel={t('org:rejected.title')}
      testID="rejected-sheet"
    >
      <SheetStep stepKey={confirm ? `${confirm.action}-${confirm.item.id}` : 'list'}>
        {confirm ? (
          <ConfirmContent
            icon={confirm.action === 'accept' ? 'check-circle' : 'x-circle'}
            title={t(confirm.action === 'accept' ? 'org:rejected.acceptTitle' : 'org:rejected.discardTitle')}
            text={
              confirm.action === 'accept'
                ? t('org:rejected.acceptNewer')
                : t('org:rejected.discardText', {
                    judge: confirm.item.judge.fullName,
                    nr: confirm.item.entry.startNumber,
                    athlete: confirm.item.entry.fullName,
                  })
            }
            actions={
              <>
                <Button
                  testID="rejected-confirm"
                  variant={confirm.action === 'discard' ? 'secondary' : 'primary'}
                  label={t(confirm.action === 'accept' ? 'org:rejected.accept' : 'org:rejected.discard')}
                  size={48}
                  fullWidth
                  onPress={() => void run(confirm.item, confirm.action)}
                />
                <Button
                  variant="ghost"
                  label={t('common:cancel')}
                  size={48}
                  fullWidth
                  onPress={() => setConfirm(null)}
                />
              </>
            }
          />
        ) : (
          <View style={styles.list}>
            <SheetHeader title={t('org:rejected.title')} />
            <Text variant="meta" color={color.neutral[300]}>
              {t(tournamentFinished ? 'org:rejected.introFinished' : 'org:rejected.intro')}
            </Text>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {!items && loading ? (
                <SkeletonRow />
              ) : shown.length ? (
                shown.map((item) => {
                  const locked = lockedCategoryIds.has(item.category.id);
                  return (
                    <View key={item.id} style={styles.row} testID={`rejected-${item.id}`}>
                      <View style={styles.line}>
                        <Text variant="bodyS" style={styles.flex}>
                          {t('org:rejected.row', {
                            judge: item.judge.fullName,
                            nr: item.entry.startNumber,
                            athlete: item.entry.fullName,
                          })}
                        </Text>
                        <Text variant="subhead" tabular>
                          {formatScore(Math.round(item.payloadTotal * 100), 2)}
                        </Text>
                      </View>
                      <Text variant="caption" color={color.neutral[400]}>
                        {t('org:rejected.meta', {
                          category: item.category.name,
                          reason: reason(item.reason),
                        })}
                      </Text>
                      <Text variant="caption" color={color.neutral[400]}>
                        {t('org:rejected.sent', { time: formatClock(item.receivedAt) })}
                      </Text>
                      <View style={styles.actions}>
                        <Button
                          testID={`rejected-accept-${item.id}`}
                          variant="ghost"
                          size={44}
                          label={t('org:rejected.accept')}
                          disabled={locked || !canWrite}
                          onPress={() =>
                            item.newerSheetExists
                              ? setConfirm({ item, action: 'accept' })
                              : void run(item, 'accept')
                          }
                        />
                        <Button
                          testID={`rejected-discard-${item.id}`}
                          variant="ghost"
                          size={44}
                          destructive
                          label={t('org:rejected.discard')}
                          disabled={!canWrite}
                          onPress={() => setConfirm({ item, action: 'discard' })}
                        />
                      </View>
                      {locked && canWrite ? (
                        <Text
                          variant="caption"
                          color={color.neutral[400]}
                          testID={`rejected-locked-${item.id}`}
                        >
                          {t('org:rejected.unlockFirst', { category: item.category.name })}
                        </Text>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <EmptyState variant="inline" text={t('org:rejected.empty')} />
              )}
            </ScrollView>
          </View>
        )}
      </SheetStep>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: layout[12], flexShrink: 1 },
  scroll: { flexShrink: 1 },
  row: {
    gap: layout[4],
    paddingVertical: layout[12],
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: layout[8] },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: layout[8] },
});
