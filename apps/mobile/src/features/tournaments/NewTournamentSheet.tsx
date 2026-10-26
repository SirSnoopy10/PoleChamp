import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { layout } from '@polechamp/tokens';
import { TournamentCreate } from '@polechamp/contracts';
import { uuidv7 } from '../../data/api';
import { ApiError } from '../../data/api/errors';
import { useOnline } from '../../data/network/online';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { useZodForm } from '../../ui/form';
import { Sheet, SheetHeader } from '../../ui/sheet';
import { toast } from '../../ui/Toast';
import { emptyTournament, TournamentFields, type TournamentFormValues } from './TournamentFields';

export interface NewTournamentSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Zapis z kluczem idempotencji arkusza; zwraca id nowego turnieju. */
  onCreate: (body: TournamentCreate, idempotencyKey: string) => Promise<{ id: string }>;
  /** Po zapisie – przejście do SCR-ORG-03. */
  onCreated: (id: string) => void;
}

/**
 * SCR-ORG-02 – nowy turniej (IMP-256). Klucz `Idempotency-Key` powstaje przy otwarciu arkusza i zostaje
 * przy ponowieniu; błąd sieci zostawia arkusz z danymi (toast błędu), błędy 422 trafiają pod pola.
 */
export function NewTournamentSheet({ visible, onClose, onCreate, onCreated }: NewTournamentSheetProps) {
  const t = useT();
  const offline = !useOnline();
  const form = useZodForm<typeof TournamentCreate>(TournamentCreate, {
    defaultValues: emptyTournament,
    errorParams: { venue: { max: 120 } },
  });
  const [key, setKey] = useState(uuidv7);

  useEffect(() => {
    if (!visible) return;
    form.reset(emptyTournament);
    setKey(uuidv7());
  }, [visible]);

  const submit = form.handleSubmit(async (values: TournamentFormValues) => {
    try {
      const created = await onCreate(TournamentCreate.parse(values), key);
      onClose();
      toast.success('toasts:tournamentCreated');
      onCreated(created.id);
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors.length) form.applyApiErrors(e.fieldErrors);
      else toast.error('toasts:saveFailed');
    }
  });

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel={t('org:tournamentForm.newTitle')}>
      <View style={styles.body}>
        <SheetHeader title={t('org:tournamentForm.newTitle')} />
        <TournamentFields form={form} onSubmitEditing={() => void submit()} />
        <Button
          testID="tournament-create"
          label={t('org:tournamentForm.create')}
          size={48}
          fullWidth
          loading={form.formState.isSubmitting}
          onPress={() => void submit()}
          disabled={offline}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: layout[14] },
});
