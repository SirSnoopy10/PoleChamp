import { formatTournamentDate } from '@polechamp/i18n';
import type { TournamentDetails } from '@polechamp/contracts';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { ConfirmContent, Sheet } from '../../ui/sheet';

export interface StartTournamentSheetProps {
  visible: boolean;
  onClose: () => void;
  tournament: Pick<TournamentDetails, 'name' | 'startDate' | 'endDate'>;
  busy: boolean;
  onConfirm: () => void;
}

/** „Rozpocząć turniej?” z datą (decyzja PO IMP-705c, UX-06) – start jest nieodwracalny. */
export function StartTournamentSheet({
  visible,
  onClose,
  tournament,
  busy,
  onConfirm,
}: StartTournamentSheetProps) {
  const t = useT();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel={t('org:startTournament.title')}
      testID="start-sheet"
    >
      <ConfirmContent
        icon="play"
        title={t('org:startTournament.title')}
        text={t('org:startTournament.text', {
          name: tournament.name,
          date: formatTournamentDate(tournament.startDate, tournament.endDate),
        })}
        actions={
          <>
            <Button
              testID="start-confirm"
              icon="play"
              label={t('org:startTournament.confirm')}
              size={48}
              fullWidth
              loading={busy}
              onPress={onConfirm}
            />
            <Button variant="ghost" label={t('common:cancel')} size={48} fullWidth onPress={onClose} />
          </>
        }
      />
    </Sheet>
  );
}
