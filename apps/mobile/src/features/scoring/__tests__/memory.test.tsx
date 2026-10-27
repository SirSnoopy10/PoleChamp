import { AppState } from 'react-native';
import { syncEvents } from '../../../data/sync/events';
import { renderWithProviders, screen } from '../../../test-utils/render';
import { ScoreForm } from '../ScoreForm';
import { formModel, perfJudge } from './perf.fixtures';

// IMP-503 (TC-PERF-014 – część lokalna): 200 kolejnych formularzy (zatwierdzenie → następna
// zawodniczka) nie zostawia subskrypcji AppState ani zdarzeń synchronizacji. Pamięć procesu
// na urządzeniu – docs-dev/perf/battery-memory.md.
const mockDisposed = jest.fn();
// Bez środowiska tabletu (baza, silnik synchronizacji) – formularz potrzebuje tylko `local` dla szkicu.
jest.mock('../../../data/judge/runtime', () => ({ judgeRuntime: () => ({ local: {} }) }));
jest.mock('../draft', () => ({
  DRAFT_DEBOUNCE_MS: 300,
  attachDraftAutosave: () => ({
    flush: async () => undefined,
    cancel: () => undefined,
    dispose: () => mockDisposed(),
  }),
}));

const noop = () => undefined;

it('TC-PERF-014: 200 formularzy – subskrypcje i autozapis zwalniane przy odmontowaniu', async () => {
  let active = 0;
  const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => {
    active++;
    return { remove: () => void active-- };
  });
  const baseline = syncEvents.listenerCount();
  const view = await renderWithProviders(<></>);
  // Subskrypcje providerów (np. TanStack focusManager) – poza formularzem.
  const base = active;
  for (let i = 0; i < 200; i++) {
    const model = formModel(5, 3);
    model.entry = { ...model.entry, id: `e${i}`, startNumber: i + 1 };
    await view.rerender(
      <ScoreForm
        key={model.entry.id}
        judge={perfJudge}
        model={model}
        sheet={null}
        readOnly={false}
        othersUnscored
        listChanged={false}
        onSubmitted={noop}
        onReload={noop}
      />,
    );
  }
  expect(screen.getByTestId('score-form')).toBeOnTheScreen();
  expect(active - base).toBe(1);
  expect(mockDisposed).toHaveBeenCalledTimes(199);
  await view.rerender(<></>);
  expect(active - base).toBe(0);
  await view.unmount();
  expect(mockDisposed).toHaveBeenCalledTimes(200);
  expect(syncEvents.listenerCount()).toBe(baseline);
  spy.mockRestore();
}, 30_000);
