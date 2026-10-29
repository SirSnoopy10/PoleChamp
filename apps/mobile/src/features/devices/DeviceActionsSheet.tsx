import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { layout } from '@polechamp/tokens';
import type { DeviceRow } from '@polechamp/contracts';
import { useOnline } from '../../data/network/online';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/form';
import { ConfirmContent, Sheet, SheetHeader, SheetStep, useSheetStep } from '../../ui/sheet';
import { toast } from '../../ui/Toast';
import { toastSaveError } from '../categories/CategoryFormSheet';

export interface DeviceActionsSheetProps {
  device: DeviceRow | null;
  onClose: () => void;
  onRename: (device: DeviceRow, name: string) => Promise<unknown>;
  onRevoke: (device: DeviceRow) => Promise<unknown>;
}

/** Akcje tabletu z SCR-ORG-14 (IMP-276): „Zmień nazwę” i „Odłącz urządzenie” z liczbą niewysłanych ocen. */
export function DeviceActionsSheet({ device, onClose, onRename, onRevoke }: DeviceActionsSheetProps) {
  const t = useT();
  const offline = !useOnline();
  const { step, setStep, reset } = useSheetStep<'menu' | 'rename' | 'revoke'>('menu');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!device) return;
    reset();
    setName(device.name);
  }, [device?.id]);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      onClose();
      toast.success(success);
    } catch (e) {
      toastSaveError(e);
    } finally {
      setBusy(false);
    }
  };

  const trimmed = name.trim();
  let content = null;
  if (device && step === 'menu') {
    content = (
      <View style={styles.body}>
        <SheetHeader title={device.name} />
        <Button
          testID="device-rename"
          variant="secondary"
          icon="pencil-simple"
          label={t('org:device.rename')}
          size={48}
          fullWidth
          onPress={() => setStep('rename')}
          disabled={offline}
        />
        <Button
          testID="device-revoke"
          variant="secondary"
          destructive
          icon="link-break"
          label={t('org:device.revoke')}
          size={48}
          fullWidth
          onPress={() => setStep('revoke')}
          disabled={offline}
        />
      </View>
    );
  } else if (device && step === 'rename') {
    content = (
      <View style={styles.body}>
        <SheetHeader title={t('org:device.rename')} />
        <TextField
          testID="device-name"
          label={t('org:device.name')}
          value={name}
          onChangeText={setName}
          maxLength={60}
          error={trimmed ? undefined : t('org:device.nameError')}
        />
        <Button
          testID="device-name-save"
          label={t('org:device.save')}
          size={48}
          fullWidth
          disabled={offline || !trimmed}
          loading={busy}
          onPress={() => void run(() => onRename(device, trimmed), 'toasts:changesSaved')}
        />
      </View>
    );
  } else if (device) {
    content = (
      <ConfirmContent
        icon="link-break"
        title={t('org:device.revokeTitle', { name: device.name })}
        text={t('org:device.revokeText', { n: device.pendingMutations })}
        actions={
          <>
            <Button
              testID="device-revoke-confirm"
              variant="secondary"
              destructive
              label={t('org:device.revokeConfirm')}
              size={48}
              fullWidth
              loading={busy}
              onPress={() => void run(() => onRevoke(device), 'toasts:deviceRevoked')}
              disabled={offline}
            />
            <Button
              variant="ghost"
              label={t('common:cancel')}
              size={48}
              fullWidth
              onPress={() => setStep('menu')}
            />
          </>
        }
      />
    );
  }

  return (
    <Sheet visible={!!device} onClose={onClose} accessibilityLabel={device?.name} testID="device-sheet">
      <SheetStep stepKey={step}>{content}</SheetStep>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: layout[14] },
});
