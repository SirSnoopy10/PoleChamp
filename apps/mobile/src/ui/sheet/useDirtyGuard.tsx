import { useCallback, useEffect, useState } from 'react';
import { useT } from '../../i18n';
import { Button } from '../Button';
import { ConfirmContent } from './ConfirmSheet';
import { SheetStep } from './SheetStep';

/**
 * Pytanie „Odrzucić zmiany?” przy zamykaniu arkusza z niezapisanym formularzem (×, tło, gest,
 * wstecz – UX-36). `close` przekazujemy do `Sheet` jako `onClose`; gdy `prompt` nie jest pusty,
 * arkusz pokazuje go zamiast formularza. Zamknięcie po zapisie wołamy bezpośrednio (`onClose`).
 */
export function useDirtyGuard(visible: boolean, dirty: boolean, onClose: () => void) {
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (visible) setAsking(false);
  }, [visible]);
  const close = useCallback(() => {
    if (dirty && !asking) setAsking(true);
    else onClose();
  }, [dirty, asking, onClose]);
  const prompt = asking ? <DiscardChanges onDiscard={onClose} onKeep={() => setAsking(false)} /> : null;
  return { close, prompt };
}

function DiscardChanges({ onDiscard, onKeep }: { onDiscard: () => void; onKeep: () => void }) {
  const t = useT();
  return (
    <SheetStep stepKey="discard">
      <ConfirmContent
        icon="warning-circle"
        title={t('sheet.discardTitle')}
        text={t('sheet.discardText')}
        actions={
          <>
            <Button
              testID="sheet-discard"
              variant="secondary"
              destructive
              label={t('sheet.discard')}
              size={48}
              fullWidth
              onPress={onDiscard}
            />
            <Button
              testID="sheet-keep-editing"
              variant="ghost"
              label={t('sheet.keepEditing')}
              size={48}
              fullWidth
              onPress={onKeep}
            />
          </>
        }
      />
    </SheetStep>
  );
}
