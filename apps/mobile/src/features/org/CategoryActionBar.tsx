import type { z } from 'zod';
import type {
  CategoryStatus as CategoryStatusSchema,
  TournamentStatus as TournamentStatusSchema,
} from '@polechamp/contracts';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { StickyActionBar } from '../../ui/layout/StickyActionBar';

type CategoryStatus = z.infer<typeof CategoryStatusSchema>;
type TournamentStatus = z.infer<typeof TournamentStatusSchema>;

export type CategoryAction = 'start' | 'lock' | 'unlock' | 'exportPdf';

/** Akcje paska SCR-ORG-03 wg stanu kategorii i turnieju (TC-UI-024, FR-308…310, FR-208). */
export function categoryActions(category: CategoryStatus, tournament: TournamentStatus): CategoryAction[] {
  if (tournament === 'FINISHED') return ['exportPdf'];
  switch (category) {
    case 'DRAFT':
      return ['start'];
    case 'IN_PROGRESS':
      return ['lock', 'exportPdf'];
    case 'LOCKED':
      return ['unlock', 'exportPdf'];
  }
}

const LABEL = {
  start: 'actions.startCategory',
  lock: 'actions.lockCategory',
  unlock: 'actions.unlockCategory',
  exportPdf: 'actions.exportPdf',
} as const;

export interface CategoryActionBarProps {
  category: CategoryStatus;
  tournament: TournamentStatus;
  onAction: (action: CategoryAction) => void;
  /** `useCanWrite()` – offline lub turniej zakończony blokuje zmiany (eksport PDF pozostaje). */
  canWrite?: boolean;
}

export function CategoryActionBar({
  category,
  tournament,
  onAction,
  canWrite = true,
}: CategoryActionBarProps) {
  const t = useT();
  const actions = categoryActions(category, tournament);
  return (
    <StickyActionBar>
      {actions.map((action, i) => (
        <Button
          key={action}
          variant={i === 0 && action !== 'exportPdf' && actions.length > 1 ? 'secondary' : 'primary'}
          onBar
          fullWidth
          size={48}
          icon={action === 'exportPdf' ? 'file-pdf' : undefined}
          label={t(LABEL[action])}
          disabled={action !== 'exportPdf' && !canWrite}
          onPress={() => onAction(action)}
        />
      ))}
    </StickyActionBar>
  );
}
