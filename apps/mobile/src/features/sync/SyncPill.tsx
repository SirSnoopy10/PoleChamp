import { Pressable } from 'react-native';
import { createStore, useStore } from 'zustand';
import { selectSyncPillState, useSyncStore } from '../../data/sync/syncStore';
import { useT } from '../../i18n';
import { StatusPill } from '../../ui/StatusPill';
import { SyncPopover } from './SyncPopover';

/** Popover SCR-JDG-07 otwierany z pigułki i z banera odrzuceń SCR-JDG-04. */
export const syncPopover = createStore<{ open: boolean }>()(() => ({ open: false }));
export const openSyncPopover = () => syncPopover.setState({ open: true });

/**
 * Pigułka synchronizacji w nagłówku (SCR-JDG-07, IMP-317): 5 stanów z `selectSyncPillState`
 * (06-offline §8.1, online wg TL-45); tapnięcie otwiera popover ze szczegółami.
 */
export function SyncPill() {
  const t = useT();
  const pending = useSyncStore((s) => s.pending);
  const kind = useSyncStore((s) => selectSyncPillState(s).kind);
  const open = useStore(syncPopover, (s) => s.open);
  return (
    <>
      <Pressable
        testID="sync-pill"
        onPress={openSyncPopover}
        accessibilityRole="button"
        accessibilityLabel={t('judge:header.syncA11y', { state: t(`status.${kind}`, { count: pending }) })}
        hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
      >
        <StatusPill variant={kind} count={pending} testID={`sync-pill-${kind}`} />
      </Pressable>
      {open ? <SyncPopover onClose={() => syncPopover.setState({ open: false })} /> : null}
    </>
  );
}
