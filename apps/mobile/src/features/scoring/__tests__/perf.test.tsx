import { Profiler, type ProfilerOnRenderCallback } from 'react';
import { formatScore, sheetTotal } from '@polechamp/scoring';
import { act, fireEvent, renderWithProviders, screen } from '../../../test-utils/render';
import { ScoreForm } from '../ScoreForm';
import { formModel, perfJudge } from './perf.fixtures';

// IMP-500: liczniki renderów kart i stopki. Karty opakowane w memo z licznikiem – zmiana jednej noty
// nie może renderować pozostałych kart ani przycisku zatwierdzenia (R-01, NFR-104).
const renders = new Map<string, number>();
const bump = (key: string) => renders.set(key, (renders.get(key) ?? 0) + 1);

jest.mock('../../../ui/scoring/CriterionCard', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const actual = jest.requireActual<typeof import('../../../ui/scoring/CriterionCard')>(
    '../../../ui/scoring/CriterionCard',
  );
  const Counted = (props: import('../../../ui/scoring/CriterionCard').CriterionCardProps) => {
    bump(`criterion-${props.id}`);
    return React.createElement(actual.CriterionCard, props);
  };
  return { CriterionCard: React.memo(Counted) };
});

jest.mock('../../../ui/scoring/PenaltyCounter', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const actual = jest.requireActual<typeof import('../../../ui/scoring/PenaltyCounter')>(
    '../../../ui/scoring/PenaltyCounter',
  );
  const Counted = (props: import('../../../ui/scoring/PenaltyCounter').PenaltyCounterProps) => {
    bump(`penalty-${props.id}`);
    return React.createElement(actual.PenaltyCounter, props);
  };
  return { PenaltyCounter: React.memo(Counted) };
});

jest.mock('../../../ui/Button', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const actual = jest.requireActual<typeof import('../../../ui/Button')>('../../../ui/Button');
  return {
    ...actual,
    Button: (props: import('../../../ui/Button').ButtonProps) => {
      if (props.testID === 'score-submit') bump('submit');
      return React.createElement(actual.Button, props);
    },
  };
});

// Autozapis szkicu wymaga bazy tabletu – tutaj niepotrzebny.
// Bez środowiska tabletu (baza, silnik synchronizacji) – formularz potrzebuje tylko `local` dla szkicu.
jest.mock('../../../data/judge/runtime', () => ({ judgeRuntime: () => ({ local: {} }) }));
jest.mock('../draft', () => ({
  DRAFT_DEBOUNCE_MS: 300,
  attachDraftAutosave: () => ({
    flush: async () => undefined,
    cancel: () => undefined,
    dispose: () => undefined,
  }),
}));

const noop = () => undefined;

async function renderForm(criteria: number, penalties: number, onRender?: ProfilerOnRenderCallback) {
  const model = formModel(criteria, penalties);
  const form = (
    <ScoreForm
      judge={perfJudge}
      model={model}
      sheet={null}
      readOnly={false}
      othersUnscored
      listChanged={false}
      onSubmitted={noop}
      onReload={noop}
    />
  );
  await renderWithProviders(
    onRender ? (
      <Profiler id="score-form" onRender={onRender}>
        {form}
      </Profiler>
    ) : (
      form
    ),
  );
  return model;
}

beforeEach(() => renders.clear());

describe('IMP-500: wydajność formularza oceny', () => {
  it('TC-PERF-004: zmiana noty renderuje tylko swoją kartę i wynik, nie przycisk ani inne karty', async () => {
    await renderForm(5, 3);
    expect(renders.get('criterion-k1')).toBe(1);
    renders.clear();

    for (let i = 0; i < 10; i++) {
      await fireEvent.press(screen.getByTestId(i % 2 ? 'criterion-k1-minus' : 'criterion-k1-plus'));
    }
    expect(renders.get('criterion-k1')).toBe(10);
    for (const id of ['k2', 'k3', 'k4', 'k5']) expect(renders.get(`criterion-${id}`)).toBeUndefined();
    for (const id of ['p1', 'p2', 'p3']) expect(renders.get(`penalty-${id}`)).toBeUndefined();
    expect(renders.get('submit')).toBeUndefined();

    await fireEvent.press(screen.getByTestId('penalty-p2-plus'));
    expect(renders.get('penalty-p2')).toBe(1);
    expect(renders.get('penalty-p1')).toBeUndefined();
    expect(renders.get('submit')).toBeUndefined();
  });

  it('TC-PERF-004: „Twój wynik” po zmianie noty – koszt aktualizacji ≤ 50 ms (12 kryteriów, 10 kar)', async () => {
    const commits: number[] = [];
    const model = await renderForm(12, 10, (_id, _phase, actual) => commits.push(actual));
    commits.length = 0;

    const started = performance.now();
    await fireEvent.press(screen.getByTestId('criterion-k7-plus'));
    const elapsed = performance.now() - started;

    const expected = sheetTotal(
      {
        criteria: { ...model.initial.criteria, k7: model.initial.criteria.k7! + 5 },
        penalties: model.initial.penalties,
      },
      model.config,
    );
    expect(screen.getByTestId('score-total')).toHaveTextContent(formatScore(expected.totalHundredths, 1));
    // Czas renderu Reacta (Profiler) i pełnej obsługi zdarzenia w Jest – górna granica dla urządzenia
    // mierzona Flashlight/Instruments (docs-dev/perf/score-form.md).
    expect(Math.max(...commits)).toBeLessThanOrEqual(50);
    expect(elapsed).toBeLessThanOrEqual(50 * 4);
  });

  it('TC-PERF-004: sheetTotal dla 12 kryteriów i 10 kar – 1 000 przeliczeń < 50 ms', () => {
    const { config, initial } = formModel(12, 10);
    const started = performance.now();
    for (let i = 0; i < 1000; i++) {
      sheetTotal(
        { criteria: { ...initial.criteria, k1: (i % 21) * 5 }, penalties: initial.penalties },
        config,
      );
    }
    expect(performance.now() - started).toBeLessThan(50);
  });

  it('TC-EDGE-024: 12 kryteriów i 10 kar – wszystkie karty, stała stopka, poprawny wynik', async () => {
    const model = await renderForm(12, 10);
    for (let i = 1; i <= 12; i++) expect(screen.getByTestId(`criterion-k${i}`)).toBeOnTheScreen();
    for (let i = 1; i <= 10; i++) expect(screen.getByTestId(`penalty-p${i}`)).toBeOnTheScreen();
    // Stopka poza przewijaną treścią (stała przy przewijaniu).
    const scroll = screen.getByTestId('score-form-scroll');
    expect(scroll).not.toContainElement(screen.getByTestId('score-footer'));

    await fireEvent.press(screen.getByTestId('penalty-p10-plus'));
    await fireEvent.press(screen.getByTestId('penalty-p10-plus'));
    const total = sheetTotal(
      { criteria: model.initial.criteria, penalties: { ...model.initial.penalties, p10: 2 } },
      model.config,
    );
    expect(screen.getByTestId('score-total')).toHaveTextContent(formatScore(total.totalHundredths, 1));
    expect(screen.getByTestId('penalty-chip')).toBeOnTheScreen();
    await act(async () => undefined);
  });
});
