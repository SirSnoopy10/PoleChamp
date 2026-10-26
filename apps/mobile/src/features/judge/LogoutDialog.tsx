import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';

export interface LogoutDialogProps {
  /** Liczba niewysłanych ocen; 0 – dialog ukryty. */
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/** SCR-JDG-09 „Wylogować się?” – tylko przy niepustej kolejce wysyłki (FR-808). */
export function LogoutDialog({ count, onCancel, onConfirm }: LogoutDialogProps) {
  const t = useT();
  return (
    <Dialog
      visible={count > 0}
      onClose={onCancel}
      title={t('judge:logout.title')}
      text={t('judge:logoutUnsent', { count })}
      testID="logout-dialog"
      actions={
        <>
          <Button variant="secondary" size={44} label={t('common:cancel')} onPress={onCancel} />
          <Button size={44} label={t('judge:logout.confirm')} onPress={onConfirm} testID="logout-confirm" />
        </>
      }
    />
  );
}
