import * as RN from 'react-native';
import { visibleCategories } from '../../../data/judge/queries';
import { upsertScoreSheet } from '../../../data/local/scoreSheets';
import { network } from '../../../data/network/online';
import { syncEvents } from '../../../data/sync/events';
import { refreshFromDb, syncStore } from '../../../data/sync/syncStore';
import { JUDGE_ROUTES, setupJudge, settleSync, signIn, startJudge } from '../../../test-utils/judge';
import { act, fireEvent, renderWithProviders, screen, waitFor } from '../../../test-utils/render';
import { json } from '../../../test-utils/sync';
import { PenaltyCounter } from '../../../ui/scoring/PenaltyCounter';
import { REPEAT_DELAY_MS, REPEAT_INTERVAL_MS } from '../../../ui/scoring/RepeatButton';
import { ScoreSlider, snapTenths } from '../../../ui/scoring/ScoreSlider';
import { DRAFT_DEBOUNCE_MS } from '../draft';
import { nextUnscoredEntry, submitLabelKey } from '../model';

const env = setupJudge();

/** Arkusz sędziego jA w danym stanie (bez outboxu). */
async function sheet(
  entryId: string,
  state: 'SYNCED' | 'PENDING' | 'REJECTED',
  rejectCode: string | null = null,
) {
  await env.local.tx((db) =>
    upsertScoreSheet(db, {
      id: `0190a000-0000-7000-8000-00000000000${entryId.slice(1)}`,
      categoryId: 'c1',
      entryId,
      judgeId: 'jA',
      revision: 1,
      serverRevision: state === 'PENDING' ? 0 : 1,
      syncState: state,
      rejectCode,
      totalHundredths: 2000,
      serverTotalHundredths: null,
      comment: 'zapisany',
      submittedAtLocal: '2026-10-26T10:00:00.000Z',
      values: [
        { criterionId: 'k1', valueTenths: 80 },
        { criterionId: 'k2', valueTenths: 80 },
      ],
      penalties: [{ penaltyTypeId: 'p1', count: 0 }],
    }),
  );
  refreshFromDb(env.local.read, 'jA');
}

const value = (k: string) => screen.getByTestId(`criterion-${k}-value`);

describe('IMP-307: kategorie sędziego (SCR-JDG-03)', () => {
  it('TC-STATE-009: DRAFT dla każdego, IN_PROGRESS/LOCKED tylko z panelem', async () => {
    await env.local.tx((db) => {
      db.runSync(
        `INSERT INTO local_category (id, name, style, level, age_group, status, position, panel_judge_ids)
         VALUES ('c3', 'Exotic', 'EXOTIC', 'PRO', 'SENIOR', 'LOCKED', 3, '["jA"]'),
                ('c4', 'Doubles', 'DOUBLES', 'PRO', 'SENIOR', 'IN_PROGRESS', 4, '["jB"]')`,
      );
    });
    expect(visibleCategories(env.local.read, 'jA').map((c) => [c.id, c.status])).toEqual([
      ['c1', 'IN_PROGRESS'],
      ['c2', 'DRAFT'],
      ['c3', 'LOCKED'],
    ]);
    expect(visibleCategories(env.local.read, 'jC').map((c) => c.id)).toEqual(['c2']);
  });

  it('TC-E2E-JDG-009: „Dzień dobry, …”, własny postęp, W przygotowaniu – toast bez nawigacji', async () => {
    await signIn(env, 'jA');
    await sheet('e1', 'SYNCED');
    const r = await startJudge(JUDGE_ROUTES, '/categories');
    expect(screen.getByText('Dzień dobry, Sędzia')).toBeOnTheScreen();
    expect(screen.getByText('Wybierz kategorię, aby rozpocząć ocenianie.')).toBeOnTheScreen();
    expect(screen.getByTestId('category-c1')).toHaveTextContent(/1\/3 ocenione/);
    expect(screen.getByTestId('category-c1')).toHaveTextContent(/Pole Sport · Advanced/);
    expect(screen.getByTestId('category-c2')).toHaveTextContent(/jeszcze nie rozpoczęto/);
    await fireEvent.press(screen.getByTestId('category-c2'));
    expect(screen.getByText('Ta kategoria jeszcze się nie rozpoczęła')).toBeOnTheScreen();
    expect(r.getPathname()).toBe('/categories');
    await fireEvent.press(screen.getByTestId('category-c1'));
    expect(r.getPathname()).toBe('/category/c1');
  });

  it('TC-EDGE-057 / TC-EDGE-058: brak kategorii; zablokowane z kłódką i podglądem; zmiany bez przeładowania', async () => {
    await signIn(env, 'jA');
    await env.local.tx((db) => db.runSync("UPDATE local_category SET status = 'LOCKED' WHERE id = 'c1'"));
    const r = await startJudge(JUDGE_ROUTES, '/categories');
    expect(screen.getByTestId('category-locked-icon', { includeHiddenElements: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('category-c1'));
    expect(r.getPathname()).toBe('/category/c1');
    await act(async () => {
      await env.local.tx((db) => db.runSync('DELETE FROM local_category'));
      syncEvents.emit([{ type: 'snapshotApplied' }]);
    });
    await waitFor(() => expect(r.getPathname()).toBe('/categories'));
    expect(screen.getByTestId('categories-empty')).toHaveTextContent(
      'Organizator nie dodał jeszcze kategorii do tego turnieju.',
    );
  });
});

describe('IMP-308: kolejka (SCR-JDG-04)', () => {
  it('TC-E2E-JDG-010 / TC-UI-029: ikony stanów, etykiety a11y, wycofane ukryte, panel „Wybierz zawodniczkę…”', async () => {
    await signIn(env, 'jA');
    await sheet('e1', 'SYNCED');
    await sheet('e2', 'PENDING');
    await env.local.tx((db) => {
      db.runSync(
        "UPDATE local_entry SET full_name = ?, club = ? WHERE id = 'e3'",
        'Aleksandra Brzęczyszczykiewicz-Konstantynopolitańczykiewiczówna',
        'Akademia Tańca na Rurze i Akrobatyki Powietrznej w Gorzowie',
      );
      db.runSync(
        `INSERT INTO local_entry (id, category_id, start_number, start_order, full_name, club, status)
         VALUES ('e9', 'c1', 49, 9, 'Wycofana Zawodniczka', NULL, 'WITHDRAWN')`,
      );
    });
    await startJudge(JUDGE_ROUTES, '/category/c1');
    expect(screen.getByText('Pole Sport Seniorki')).toBeOnTheScreen();
    expect(screen.getByText('2/3 ocenione')).toBeOnTheScreen();
    expect(screen.getByTestId('pick-athlete')).toHaveTextContent(
      'Wybierz zawodniczkę z listy, aby ją ocenić.',
    );
    expect(screen.queryByTestId('queue-row-e9')).toBeNull();
    expect(screen.getByTestId('queue-row-e1')).toHaveAccessibleName('41, Zawodniczka 1, oceniona, wysłana');
    expect(screen.getByTestId('queue-row-e2')).toHaveAccessibleName('42, Zawodniczka 2, oceniona, w kolejce');
    expect(screen.getByTestId('queue-row-e3')).toHaveAccessibleName(
      '43, Aleksandra Brzęczyszczykiewicz-Konstantynopolitańczykiewiczówna, ' +
        'Akademia Tańca na Rurze i Akrobatyki Powietrznej w Gorzowie, nieoceniona',
    );
    await act(async () => {
      await sheet('e3', 'REJECTED', 'CATEGORY_LOCKED');
    });
    for (const s of ['synced', 'pending', 'rejected'])
      expect(screen.getByTestId(`queue-state-${s}`, { includeHiddenElements: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('queue-row-e3'));
    expect(screen.getByTestId('athlete-name')).toHaveProp('numberOfLines', 1);
  });

  it('TC-E2E-JDG-025: odrzucone – baner kolejki i lista w popoverze SCR-JDG-07', async () => {
    await signIn(env, 'jA');
    await sheet('e1', 'REJECTED', 'CATEGORY_LOCKED');
    await sheet('e2', 'REJECTED', 'CATEGORY_LOCKED');
    await startJudge(JUDGE_ROUTES, '/category/c1');
    expect(screen.getByTestId('queue-rejected-banner')).toHaveTextContent(
      '2 oceny nie zostały przyjęte – kategoria zakończona',
    );
    await fireEvent.press(screen.getByTestId('queue-rejected-banner'));
    expect(screen.getByTestId('sync-popover')).toBeOnTheScreen();
    expect(screen.getByTestId('sync-rejected')).toHaveTextContent(/#41 Zawodniczka 1 – Kategoria zakończona/);
    expect(screen.getByText('Organizator zdecyduje o ich uwzględnieniu.')).toBeOnTheScreen();
  });

  it('UX-01 / UX-15: ocena bez rozstrzygnięcia w „Wymaga uwagi”, wiersz otwiera formularz, Wstecz zamyka', async () => {
    await signIn(env, 'jA');
    await sheet('e2', 'PENDING');
    await env.local.tx((db) =>
      db.runSync(
        `INSERT INTO outbox (mutation_id, type, judge_id, score_sheet_id, payload, created_at, attempts,
           next_attempt_at, state) VALUES ('0190a000-0000-7000-8000-0000000000f1', 'SUBMIT_SCORE_SHEET', 'jA',
           '0190a000-0000-7000-8000-000000000002', '{}', 0, 22, 9999999999999, 'QUEUED')`,
      ),
    );
    await startJudge(JUDGE_ROUTES, '/categories');
    const back = jest
      .spyOn(RN.BackHandler, 'addEventListener')
      .mockImplementation(() => ({ remove: () => undefined }));
    await fireEvent.press(screen.getByTestId('sync-pill'));
    expect(screen.getByTestId('sync-rejected')).toHaveTextContent(
      /Wymaga uwagi.*#42 Zawodniczka 2 – serwer nie przyjął oceny \(22 próby\), ponawiamy/,
    );
    await act(async () => {
      expect((back.mock.calls.at(-1)?.[1] as () => boolean)()).toBe(true);
    });
    back.mockRestore();
    expect(screen.queryByTestId('sync-popover')).toBeNull();
    await fireEvent.press(screen.getByTestId('sync-pill'));
    await fireEvent.press(screen.getByTestId('sync-rejected-e2'));
    expect(screen.queryByTestId('sync-popover')).toBeNull();
    expect(screen).toHavePathname('/category/c1');
  });
});

describe('IMP-309…312: formularz oceny (SCR-JDG-05)', () => {
  it('TC-E2E-JDG-011: wartości domyślne – połowa skali, wynik 12,5 / 25,0, bez chipu kar', async () => {
    await signIn(env, 'jA');
    await startJudge(JUDGE_ROUTES, '/category/c1?entry=e1');
    expect(screen.getByText('Kryteria')).toBeOnTheScreen();
    expect(value('k1')).toHaveTextContent('5,0');
    expect(value('k2')).toHaveTextContent('5,0');
    expect(screen.getByTestId('score-total')).toHaveTextContent('12,5');
    expect(screen.getByTestId('score-footer')).toHaveTextContent(/\/ 25,0/);
    expect(screen.queryByTestId('penalty-chip')).toBeNull();
    expect(screen.getByTestId('penalty-p1')).toHaveTextContent(/−0,5 pkt za każde · maks. 3×/);
    expect(screen.getByTestId('score-submit')).toHaveTextContent('Zatwierdź i dalej');
  });

  it('TC-E2E-JDG-012 / TC-UI-022 / TC-UI-021: −/+, kary z limitem, chip kar i wynik na żywo', async () => {
    await signIn(env, 'jA');
    await startJudge(JUDGE_ROUTES, '/category/c1?entry=e1');
    for (let i = 0; i < 12; i++) await fireEvent.press(screen.getByTestId('criterion-k1-plus'));
    expect(value('k1')).toHaveTextContent('10,0');
    expect(screen.getByTestId('criterion-k1-plus')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('criterion-k2-minus'));
    expect(value('k2')).toHaveTextContent('4,5');
    expect(screen.getByTestId('score-total')).toHaveTextContent('16,8');
    for (let i = 0; i < 4; i++) await fireEvent.press(screen.getByTestId('penalty-p1-plus'));
    expect(screen.getByTestId('penalty-p1-count')).toHaveTextContent('3');
    expect(screen.getByTestId('penalty-p1-plus')).toBeDisabled();
    expect(screen.getByTestId('penalty-chip')).toHaveTextContent('kary −1,5');
    expect(screen.getByTestId('score-total')).toHaveTextContent('15,3');
    for (let i = 0; i < 4; i++) await fireEvent.press(screen.getByTestId('penalty-p1-minus'));
    expect(screen.getByTestId('penalty-p1-count')).toHaveTextContent('0');
    expect(screen.getByTestId('penalty-p1-minus')).toBeDisabled();
    expect(screen.queryByTestId('penalty-chip')).toBeNull();
  });

  it('TC-UI-010: komentarz – maks. 500 znaków, licznik od 400', async () => {
    await signIn(env, 'jA');
    await startJudge(JUDGE_ROUTES, '/category/c1?entry=e1');
    await fireEvent.changeText(screen.getByTestId('score-comment'), 'a'.repeat(399));
    expect(screen.queryByText('399/500')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('score-comment'), 'a'.repeat(520));
    expect(screen.getByTestId('score-comment')).toHaveDisplayValue('a'.repeat(500));
    expect(screen.getByText('500/500')).toBeOnTheScreen();
  });
});

describe('IMP-310 / IMP-311: kontrolki', () => {
  it('TC-UI-019 / TC-EDGE-043: suwak – krok 0,5, zakres [0; skala], akcje a11y, disabled', async () => {
    expect(snapTenths(0.73, 10)).toBe(75);
    expect(snapTenths(-0.4, 10)).toBe(0);
    expect(snapTenths(1.7, 10)).toBe(100);
    const onChange = jest.fn();
    const { rerender } = await renderWithProviders(
      <ScoreSlider value={95} scaleMax={10} onChange={onChange} accessibilityLabel="Technika, 9,5 z 10" />,
      { mode: 'judge' },
    );
    const slider = screen.getByTestId('score-slider');
    expect(slider).toHaveAccessibleName('Technika, 9,5 z 10');
    await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onChange).toHaveBeenLastCalledWith(100);
    await rerender(<ScoreSlider value={100} scaleMax={10} onChange={onChange} accessibilityLabel="x" />);
    await fireEvent(screen.getByTestId('score-slider'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    expect(onChange).toHaveBeenLastCalledWith(100);
    onChange.mockClear();
    await rerender(
      <ScoreSlider value={0} scaleMax={10} onChange={onChange} accessibilityLabel="x" disabled />,
    );
    await fireEvent(screen.getByTestId('score-slider'), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('TC-UI-020: przytrzymanie „−” powtarza co 150 ms i zatrzymuje się na 0', async () => {
    jest.useFakeTimers();
    await signIn(env, 'jA');
    await startJudge(JUDGE_ROUTES, '/category/c1?entry=e1');
    const minus = screen.getByTestId('criterion-k1-minus');
    await fireEvent(minus, 'longPress');
    expect(value('k1')).toHaveTextContent('4,5');
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        jest.advanceTimersByTime(REPEAT_INTERVAL_MS);
      });
    }
    expect(value('k1')).toHaveTextContent('1,5');
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        jest.advanceTimersByTime(REPEAT_INTERVAL_MS);
      });
    }
    expect(value('k1')).toHaveTextContent('0,0');
    expect(REPEAT_DELAY_MS).toBe(400);
  });

  it('TC-DESIGN-012: licznik kary – stany 0 / 1 / maksimum, etykieta adjustable', async () => {
    const onChange = jest.fn();
    const { rerender } = await renderWithProviders(
      <PenaltyCounter
        id="p"
        name="Upadek"
        pointsTenths={20}
        maxOccurrences={3}
        count={0}
        onChange={onChange}
      />,
      { mode: 'judge' },
    );
    expect(screen.getByTestId('penalty-p')).toHaveAccessibleName('Upadek, 0 z 3');
    expect(screen.getByTestId('penalty-p')).toHaveTextContent(/−2 pkt za każde · maks. 3×/);
    expect(screen.getByTestId('penalty-p-minus')).toBeDisabled();
    await rerender(
      <PenaltyCounter
        id="p"
        name="Upadek"
        pointsTenths={20}
        maxOccurrences={3}
        count={3}
        onChange={onChange}
      />,
    );
    expect(screen.getByTestId('penalty-p-plus')).toBeDisabled();
    expect(screen.getByTestId('penalty-p-plus')).toHaveStyle({ opacity: 0.35 });
    await fireEvent(screen.getByTestId('penalty-p'), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    expect(onChange).toHaveBeenCalledWith('p', 2);
  });
});

describe('IMP-313: zatwierdzenie i auto-przejście', () => {
  it('TC-STATE-001: następna nieoceniona – szkic nie jest oceną, od początku listy, bez bieżącej', () => {
    const queue = [41, 42, 43, 44, 45, 46, 47, 48, 49].map((n) => ({ id: `e${n}` }));
    const scored = new Set(['e41', 'e42', 'e43']);
    expect(nextUnscoredEntry(queue, scored, 'e46')).toBe('e44');
    expect(nextUnscoredEntry([{ id: 'e1' }], new Set(), 'e1')).toBeNull();
  });

  it('TC-STATE-002: etykieta przycisku', () => {
    expect(submitLabelKey(true, true)).toBe('judge:form.update');
    expect(submitLabelKey(false, true)).toBe('judge:form.submitNext');
    expect(submitLabelKey(false, false)).toBe('judge:form.submit');
  });

  it('TC-E2E-JDG-013 / TC-EDGE-030: toast po COMMIT, jedna mutacja przy podwójnym tapnięciu, przejście i wysyłka', async () => {
    await signIn(env, 'jA');
    await env.local.tx((db) => db.runSync("DELETE FROM outbox WHERE type <> 'SUBMIT_SCORE_SHEET'"));
    const r = await startJudge(JUDGE_ROUTES, '/category/c1?entry=e1');
    await fireEvent.press(screen.getByTestId('criterion-k1-plus'));
    const submit = screen.getByTestId('score-submit');
    await fireEvent.press(submit);
    await fireEvent.press(submit);
    await waitFor(() => expect(screen.getByText('Zapisano ocenę: Zawodniczka 1')).toBeOnTheScreen());
    expect(r.getSearchParams()).toMatchObject({ entry: 'e2' });
    const sheets = env.local.read.getAllSync<{ total_hundredths: number }>(
      "SELECT total_hundredths FROM local_score_sheet WHERE judge_id = 'jA'",
    );
    expect(sheets).toEqual([{ total_hundredths: 1300 }]);
    const submits = env.local.read.getAllSync("SELECT 1 FROM outbox WHERE type = 'SUBMIT_SCORE_SHEET'");
    expect(submits).toHaveLength(1);
    await settleSync(env);
    await waitFor(() =>
      expect(screen.getByTestId('queue-row-e1')).toHaveAccessibleName('41, Zawodniczka 1, oceniona, wysłana'),
    );
    expect(env.server.state.applied).toBe(1);
  });

  it('TC-E2E-JDG-014: ostatnia nieoceniona – „Zatwierdź ocenę”, potem pusty panel', async () => {
    await signIn(env, 'jA');
    await sheet('e1', 'SYNCED');
    await sheet('e2', 'SYNCED');
    await startJudge(JUDGE_ROUTES, '/category/c1?entry=e3');
    expect(screen.getByTestId('score-submit')).toHaveTextContent('Zatwierdź ocenę');
    await fireEvent.press(screen.getByTestId('score-submit'));
    await waitFor(() => expect(screen.getByTestId('pick-athlete')).toBeOnTheScreen());
  });

  it('TC-E2E-JDG-015: poprawa oceny – „Oceniono”, zapisane wartości, rewizja 2', async () => {
    await signIn(env, 'jA');
    await sheet('e1', 'SYNCED');
    await startJudge(JUDGE_ROUTES, '/category/c1?entry=e1');
    expect(screen.getByTestId('badge-scored')).toBeOnTheScreen();
    expect(value('k1')).toHaveTextContent('8,0');
    expect(screen.getByTestId('score-comment')).toHaveDisplayValue('zapisany');
    expect(screen.getByTestId('score-submit')).toHaveTextContent('Zaktualizuj ocenę');
    await fireEvent.press(screen.getByTestId('criterion-k1-plus'));
    await fireEvent.press(screen.getByTestId('score-submit'));
    await waitFor(() => expect(screen.getByText('Zapisano ocenę: Zawodniczka 1')).toBeOnTheScreen());
    const row = env.local.read.getFirstSync<{ revision: number }>(
      "SELECT revision FROM local_score_sheet WHERE entry_id = 'e1'",
    );
    expect(row?.revision).toBe(2);
    const m = env.local.read.getFirstSync<{ payload: string }>(
      "SELECT payload FROM outbox WHERE type = 'SUBMIT_SCORE_SHEET'",
    );
    expect(JSON.parse(m?.payload ?? '{}').payload).toMatchObject({ baseRevision: 1 });
  });
});

describe('IMP-314: kategoria zablokowana', () => {
  it('TC-E2E-JDG-016 / TC-DESIGN-003 / TC-EDGE-067: blokada przez WS – podgląd bez stopki, szkic zostaje', async () => {
    await signIn(env, 'jA');
    await sheet('e1', 'SYNCED');
    await startJudge(JUDGE_ROUTES, '/category/c1?entry=e2');
    await fireEvent.press(screen.getByTestId('criterion-k1-plus'));
    await act(async () => {
      jest.advanceTimersByTime(DRAFT_DEBOUNCE_MS);
      await env.local.tx(() => undefined);
    });
    await act(async () => {
      env.rt.engine.lockCategory('c1');
      await env.local.tx(() => undefined);
    });
    await waitFor(() => expect(screen.getByTestId('queue-locked-banner')).toBeOnTheScreen());
    expect(screen.getByText('Kategoria zakończona — tylko podgląd')).toBeOnTheScreen();
    expect(screen.getByTestId('no-own-score')).toHaveTextContent('Brak Twojej oceny dla tej zawodniczki.');
    expect(screen.queryByTestId('score-footer')).toBeNull();
    await fireEvent.press(screen.getByTestId('queue-row-e1'));
    expect(screen.getByTestId('score-form')).toBeOnTheScreen();
    expect(screen.queryByTestId('score-footer')).toBeNull();
    expect(screen.getByTestId('criterion-k1-plus')).toBeDisabled();
    const draft = env.local.read.getFirstSync<{ payload: string }>(
      "SELECT payload FROM local_draft WHERE judge_id = 'jA' AND entry_id = 'e2'",
    );
    expect(JSON.parse(draft?.payload ?? '{}')).toMatchObject({ criteria: { k1: 55 } });
    await act(async () => {
      env.rt.engine.unlockCategory('c1');
      await env.local.tx(() => undefined);
    });
    await fireEvent.press(screen.getByTestId('queue-row-e2'));
    await waitFor(() => expect(value('k1')).toHaveTextContent('5,5'));
  });
});

describe('IMP-315: szkic formularza', () => {
  it('TC-STATE-007 / TC-E2E-JDG-018: jeden zapis po 300 ms, odtworzenie po „restarcie”, usunięcie po zatwierdzeniu', async () => {
    await signIn(env, 'jA');
    const first = await startJudge(JUDGE_ROUTES, '/category/c1?entry=e1');
    const writes = jest.spyOn(env.local, 'tx');
    for (const k of ['k1', 'k2', 'k1']) {
      await fireEvent.press(screen.getByTestId(`criterion-${k}-plus`));
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
    }
    expect(writes).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(DRAFT_DEBOUNCE_MS);
      await env.local.tx(() => undefined);
    });
    expect(writes).toHaveBeenCalledTimes(2);
    writes.mockRestore();
    await first.unmount();
    await startJudge(JUDGE_ROUTES, '/category/c1?entry=e1');
    expect(value('k1')).toHaveTextContent('6,0');
    expect(value('k2')).toHaveTextContent('5,5');
    await fireEvent.press(screen.getByTestId('score-submit'));
    await waitFor(() => expect(screen.getByText('Zapisano ocenę: Zawodniczka 1')).toBeOnTheScreen());
    expect(env.local.read.getFirstSync('SELECT COUNT(*) AS n FROM local_draft')).toEqual({ n: 0 });
  });
});

describe('IMP-316: stany dodatkowe formularza', () => {
  it('TC-SYNC-028 / TC-E2E-JDG-023: zmiana listy – baner i toast, wpisane wartości zostają', async () => {
    await signIn(env, 'jA');
    await startJudge(JUDGE_ROUTES, '/category/c1?entry=e1');
    await fireEvent.press(screen.getByTestId('criterion-k2-plus'));
    await act(async () => {
      await env.local.tx((db) =>
        db.runSync(
          `INSERT INTO local_entry (id, category_id, start_number, start_order, full_name, club, status)
           VALUES ('e4', 'c1', 50, 4, 'Nowa Zawodniczka', NULL, 'ACTIVE')`,
        ),
      );
      syncEvents.emit([{ type: 'startListChanged', categoryId: 'c1' }]);
    });
    expect(screen.getByTestId('form-list-banner')).toHaveTextContent('Lista startowa została zaktualizowana');
    expect(screen.getAllByText('Lista startowa została zaktualizowana').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('queue-row-e4')).toBeOnTheScreen();
    expect(value('k2')).toHaveTextContent('5,5');
  });

  it('ocena odrzucona – „Ta ocena nie została przyjęta: {powód}.”', async () => {
    await signIn(env, 'jA');
    await sheet('e1', 'REJECTED', 'ENTRY_WITHDRAWN');
    await startJudge(JUDGE_ROUTES, '/category/c1?entry=e1');
    expect(screen.getByTestId('form-rejected-banner')).toHaveTextContent(
      'Ta ocena nie została przyjęta: Zawodniczka wycofana.',
    );
  });

  it('TC-SYNC-012: STALE_REVISION – baner i „Pokaż aktualną” (wersja serwera nadpisuje arkusz i szkic)', async () => {
    await signIn(env, 'jA', 'ONLINE_PIN');
    network.reportHttpSuccess();
    await sheet('e1', 'REJECTED', 'STALE_REVISION');
    env.routes.set('GET /v1/judge/me/score-sheets', () =>
      json({
        items: [
          {
            scoreSheetId: '0190a000-0000-7000-8000-000000000001',
            categoryId: 'c1',
            entryId: 'e1',
            criteria: [
              { criterionId: 'k1', value: 9.5 },
              { criterionId: 'k2', value: 7 },
            ],
            penalties: [],
            comment: 'z tabletu B',
            revision: 2,
            total: 20,
            updatedAt: '2026-10-26T10:05:00.000Z',
          },
        ],
      }),
    );
    await startJudge(JUDGE_ROUTES, '/category/c1?entry=e1');
    expect(screen.getByTestId('form-stale-banner')).toHaveTextContent('Ocena zmieniona na innym urządzeniu.');
    await fireEvent.press(screen.getByTestId('show-current'));
    await waitFor(() => expect(value('k1')).toHaveTextContent('9,5'));
    expect(screen.queryByTestId('form-stale-banner')).toBeNull();
    expect(screen.getByTestId('score-comment')).toHaveDisplayValue('z tabletu B');
  });
});

describe('IMP-300: powłoka i orientacja', () => {
  async function windowSize(width: number, height: number) {
    const size = { width, height, scale: 2, fontScale: 1 };
    await act(async () => RN.Dimensions.set({ window: size, screen: size }));
  }
  afterEach(() => windowSize(1180, 820));

  it('TC-E2E-JDG-028: obrót do pionu w trakcie oceniania – nakładka, formularz i wysyłka trwają', async () => {
    await signIn(env, 'jA');
    await windowSize(1180, 820);
    await startJudge(JUDGE_ROUTES, '/category/c1?entry=e1', { orientation: true });
    await fireEvent.press(screen.getByTestId('criterion-k1-plus'));
    await windowSize(820, 1180);
    expect(screen.getByText('Obróć tablet do pozycji poziomej.')).toBeOnTheScreen();
    // Zapis i synchronizacja w tle działają pod nakładką (formularz zamontowany).
    await act(async () => {
      await env.rt.engine.syncNow();
    });
    await windowSize(1180, 820);
    expect(screen.queryByTestId('orientation-overlay')).toBeNull();
    expect(value('k1')).toHaveTextContent('5,5');
  });
});

describe('IMP-317: pigułka synchronizacji i popover (SCR-JDG-07)', () => {
  it('TC-UI-026: 5 stanów pigułki z ikonami', async () => {
    await signIn(env, 'jA');
    await startJudge(JUDGE_ROUTES, '/categories');
    const states: [Partial<ReturnType<typeof syncStore.getState>>, string, string][] = [
      [{ online: true, pending: 0, isSyncing: false }, 'synced', 'Wysłano'],
      [{ online: true, pending: 3, isSyncing: true }, 'sending', 'Wysyłanie… (3)'],
      [{ online: false, pending: 3, isSyncing: false }, 'offlineQueue', 'Offline · 3 w kolejce'],
      [{ online: false, pending: 0 }, 'offline', 'Offline'],
      [{ online: true, rejected: 1 }, 'attention', 'Wymaga uwagi'],
    ];
    for (const [state, kind, text] of states) {
      await act(async () => syncStore.setState({ rejected: 0, maxAttempts: 0, ...state }));
      expect(screen.getByTestId(`sync-pill-${kind}`)).toHaveTextContent(text);
    }
  });

  it('TC-E2E-JDG-022 / UX-15: popover – ostatnia wysyłka i pobranie, kolejka, połączenie, „Synchronizuj teraz”', async () => {
    await signIn(env, 'jA');
    await startJudge(JUDGE_ROUTES, '/categories');
    await act(async () =>
      syncStore.setState({
        online: false,
        lastPushAt: env.clock.now() - 2 * 60_000,
        lastPullAt: env.clock.now() - 10_000,
      }),
    );
    await fireEvent.press(screen.getByTestId('sync-pill'));
    const popover = screen.getByTestId('sync-popover');
    expect(popover).toHaveTextContent(/Synchronizacja/);
    expect(popover).toHaveTextContent(/Ostatnia wysyłka ocen: 2 min temu/);
    expect(popover).toHaveTextContent(/Ostatnie pobranie zmian: przed chwilą/);
    expect(popover).toHaveTextContent(/Oceny w kolejce: 1/);
    expect(popover).toHaveTextContent(/Połączenie: offline/);
    expect(popover).toHaveTextContent(
      /Oceny są bezpieczne na tym tablecie. Wyślemy je automatycznie po odzyskaniu połączenia./,
    );
    await fireEvent.press(screen.getByTestId('sync-now'));
    await settleSync(env);
    await waitFor(() => expect(screen.getByTestId('sync-popover')).toHaveTextContent(/Oceny w kolejce: 0/));
    expect(env.calls.some((c) => c.path === '/v1/sync/push')).toBe(true);
    await fireEvent.press(screen.getByTestId('sync-popover-backdrop', { includeHiddenElements: true }));
    expect(screen.queryByTestId('sync-popover')).toBeNull();
  });
});
