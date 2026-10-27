import { measureRenders } from 'reassure';
import { act, fireEvent, Providers, screen } from '../../../test-utils/render';
import { CriterionCard } from '../../../ui/scoring/CriterionCard';
import { PenaltyCounter } from '../../../ui/scoring/PenaltyCounter';
import { createScoreFormStore } from '../formStore';
import { ScoreFooter } from '../ScoreFooter';
import { ScoreForm } from '../ScoreForm';
import { formModel, perfJudge } from './perf.fixtures';

// Reassure (IMP-500): baza regresji formularza oceny – `pnpm --filter @polechamp/mobile perf:test`,
// próg w CI: scripts/reassure-gate.mjs (renderów nie więcej, czas ≤ +10% – TC-PERF-004).
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

test('ScoreForm – 12 kryteriów, 10 kar, 10 kroków noty i 2 kary', async () => {
  const model = formModel(12, 10);
  await measureRenders(
    <Providers>
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
    </Providers>,
    {
      scenario: async () => {
        for (let i = 0; i < 10; i++) await fireEvent.press(screen.getByTestId('criterion-k3-plus'));
        await fireEvent.press(screen.getByTestId('penalty-p1-plus'));
        await fireEvent.press(screen.getByTestId('penalty-p1-plus'));
      },
    },
  );
});

test('CriterionCard – 10 kroków +', async () => {
  let value = 50;
  await measureRenders(
    <Providers>
      <CriterionCard
        id="k1"
        name="Technika"
        description="Czystość elementów"
        weightTenths={15}
        scaleMax={10}
        value={value}
        onChange={(_id, v) => (value = v)}
      />
    </Providers>,
    {
      scenario: async () => {
        for (let i = 0; i < 10; i++) await fireEvent.press(screen.getByTestId('criterion-k1-plus'));
      },
    },
  );
});

test('PenaltyCounter – render 10 kar', async () => {
  await measureRenders(
    <Providers>
      {Array.from({ length: 10 }, (_, i) => (
        <PenaltyCounter
          key={i}
          id={`p${i}`}
          name={`Kara ${i}`}
          pointsTenths={5}
          maxOccurrences={3}
          count={i % 3}
          onChange={noop}
        />
      ))}
    </Providers>,
  );
});

test('ScoreFooter – 20 zmian noty', async () => {
  const model = formModel(12, 10);
  const store = createScoreFormStore(model.initial);
  await measureRenders(
    <Providers>
      <ScoreFooter
        store={store}
        config={model.config}
        maxHundredths={model.maxHundredths}
        label="Zatwierdź"
        onSubmit={noop}
      />
    </Providers>,
    {
      scenario: async () => {
        for (let i = 0; i < 20; i++) await act(async () => store.getState().setCriterion('k1', (i % 21) * 5));
      },
    },
  );
});
