import { http, HttpResponse } from 'msw';
import type { CategoryDetails, EntryRow, ResultsResponse } from '@polechamp/contracts';
import OrgLayout from '../../../../app/(org)/_layout';
import CategoryRoute from '../../../../app/(org)/c/[categoryId]';
import TournamentRoute from '../../../../app/(org)/t/[tournamentId]';
import { suggestStartNumber } from '../../../data/org/entries';
import { i18n } from '../../../i18n';
import { categoryDetails, tournamentDetails } from '../../../test-utils/fixtures';
import { API, noContent, problem, setupOrgServer, startOrg } from '../../../test-utils/org';
import { fireEvent, screen, waitFor, within } from '../../../test-utils/render';
import { lockWarningsModel } from '../LockWarningsSheet';

jest.mock('../../../data/realtime/useOrgRealtime', () => ({ useOrgRealtime: () => undefined }));

const { server, state } = setupOrgServer();
const routes = {
  '(org)/_layout': OrgLayout,
  '(org)/t/[tournamentId]': TournamentRoute,
  '(org)/c/[categoryId]': CategoryRoute,
};

const entry = (n: number, name: string, over: Partial<EntryRow> = {}): EntryRow => ({
  id: `e${n}`,
  startNumber: n,
  startOrder: n,
  status: 'ACTIVE',
  version: 1,
  athlete: { id: `a${n}`, fullName: name, club: 'Aerial Dreams Warszawa', isMinor: false },
  judged: { done: 5, expected: 5 },
  ...over,
});

function mockCategory(
  initial: CategoryDetails,
  tournamentStatus: 'DRAFT' | 'IN_PROGRESS' | 'FINISHED' = 'IN_PROGRESS',
) {
  const box = { current: initial };
  server.use(
    http.get(`${API}/v1/me`, () =>
      HttpResponse.json({ id: 'u1', email: 'a@b.pl', displayName: 'A', emailVerified: true, locale: 'pl' }),
    ),
    http.get(`${API}/v1/categories/c3`, () => HttpResponse.json(box.current)),
    http.get(`${API}/v1/tournaments/t1`, () =>
      HttpResponse.json(tournamentDetails({ status: tournamentStatus })),
    ),
  );
  return box;
}

describe('SCR-ORG-06 zakładka Kryteria (IMP-262)', () => {
  it('TC-E2E-ORG-015 / TC-DESIGN-014: W przygotowaniu – wiersze, odznaki, maks. wynik, kary', async () => {
    mockCategory(categoryDetails());
    const r = await startOrg(routes, '/c/c3', state);
    const list = await screen.findByTestId('criteria-list');
    expect(within(list).getAllByText('Skala 0–10, co 0,5')).toHaveLength(5);
    expect(within(list).getByText('×2')).toBeOnTheScreen();
    expect(within(list).getByText('×1,5')).toBeOnTheScreen();
    expect(screen.getByText('Maksymalny wynik sędziego: 65 pkt')).toBeOnTheScreen();
    expect(screen.getByText('maks. 3× na występ')).toBeOnTheScreen();
    expect(screen.getByText('−2 pkt')).toBeOnTheScreen();
    expect(screen.getByText('−0,5 pkt')).toBeOnTheScreen();
    expect(screen.getAllByText('Dodaj')).toHaveLength(2);
    expect(screen.getByTestId('category-action-start')).toBeOnTheScreen();
    await r.unmount();
  });

  it('TC-E2E-ORG-015: Trwa – bez „Dodaj”, informacja o blokadzie; pasek blokada + PDF', async () => {
    mockCategory(categoryDetails({ status: 'IN_PROGRESS', penaltyTypes: [] }));
    const r = await startOrg(routes, '/c/c3', state);
    expect(await screen.findByText('Kryteria są zablokowane po rozpoczęciu kategorii.')).toBeOnTheScreen();
    expect(screen.queryByText('Dodaj')).toBeNull();
    expect(screen.getByText('Brak kar.')).toBeOnTheScreen();
    expect(screen.getByTestId('category-action-lock')).toBeOnTheScreen();
    expect(screen.getByTestId('category-action-exportPdf')).toBeOnTheScreen();
    await r.unmount();
  });
});

describe('SCR-ORG-09/10 kryteria i kary (IMP-263, IMP-264)', () => {
  it('TC-E2E-ORG-016: dodanie „Flow” ×1,5; zła waga; usunięcie z potwierdzeniem; MIN_CRITERIA', async () => {
    let created: unknown;
    mockCategory(categoryDetails());
    server.use(
      http.post(`${API}/v1/categories/c3/criteria`, async ({ request }) => {
        created = await request.json();
        return HttpResponse.json({}, { status: 201 });
      }),
      http.delete(`${API}/v1/criteria/k1`, () => noContent()),
      http.delete(`${API}/v1/criteria/k2`, () => problem(409, 'MIN_CRITERIA')),
    );
    const r = await startOrg(routes, '/c/c3', state);
    await fireEvent.press((await screen.findAllByText('Dodaj'))[0]!);
    await fireEvent.changeText(screen.getByTestId('criterion-name'), 'Flow');
    await fireEvent.changeText(screen.getByTestId('criterion-weight'), '0,3');
    await fireEvent.press(screen.getByTestId('criterion-save'));
    expect(await screen.findByText('Waga od 0,5 do 5 (co 0,5).')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('criterion-weight'), '1,5');
    await fireEvent.press(screen.getByTestId('segment-1'));
    await fireEvent.press(screen.getByTestId('criterion-save'));
    expect(await screen.findByText('Dodano kryterium')).toBeOnTheScreen();
    expect(created).toEqual({ name: 'Flow', scaleMax: 10, weight: 1.5, step: 1, description: null });

    await fireEvent.press(screen.getByTestId('criterion-k1'));
    await fireEvent.press(await screen.findByTestId('criterion-delete'));
    expect(await screen.findByText('Usunąć kryterium „Technika”?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('criterion-delete-confirm'));
    expect(await screen.findByText('Usunięto kryterium')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('criterion-k2'));
    await fireEvent.press(await screen.findByTestId('criterion-delete'));
    await fireEvent.press(await screen.findByTestId('criterion-delete-confirm'));
    expect(await screen.findByText('Kategoria musi mieć co najmniej jedno kryterium.')).toBeOnTheScreen();
    await r.unmount();
  });

  it('TC-E2E-ORG-017: kara „Wulgarne elementy” 5 pkt, maks. 1; maks. 11 → błąd', async () => {
    let created: unknown;
    mockCategory(categoryDetails());
    server.use(
      http.post(`${API}/v1/categories/c3/penalty-types`, async ({ request }) => {
        created = await request.json();
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const r = await startOrg(routes, '/c/c3', state);
    await fireEvent.press((await screen.findAllByText('Dodaj'))[1]!);
    await fireEvent.changeText(screen.getByTestId('penalty-name'), 'Wulgarne elementy');
    await fireEvent.changeText(screen.getByTestId('penalty-points'), '5');
    await fireEvent.changeText(screen.getByTestId('penalty-max'), '11');
    await fireEvent.press(screen.getByTestId('penalty-save'));
    expect(await screen.findByText('Od 1 do 10.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('penalty-max'), '1');
    await fireEvent.press(screen.getByTestId('penalty-save'));
    expect(await screen.findByText('Dodano karę')).toBeOnTheScreen();
    expect(created).toEqual({ name: 'Wulgarne elementy', points: 5, maxOccurrences: 1 });
    await r.unmount();
  });
});

describe('SCR-ORG-06…08 rama i akcje kategorii (IMP-261, IMP-271)', () => {
  it('TC-E2E-ORG-018: warunek startu → toast z przyczyną; start → „Kategoria rozpoczęta”', async () => {
    const box = mockCategory(categoryDetails(), 'DRAFT');
    let attempts = 0;
    server.use(
      http.post(`${API}/v1/categories/c3/start`, () => {
        if (++attempts === 1)
          return problem(422, 'START_REQUIREMENTS_NOT_MET', { detail: 'NO_ACTIVE_ENTRIES' });
        box.current = { ...box.current, status: 'IN_PROGRESS' };
        return HttpResponse.json(box.current);
      }),
    );
    const r = await startOrg(routes, '/c/c3', state);
    await fireEvent.press(await screen.findByTestId('category-action-start'));
    expect(await screen.findByText('Dodaj co najmniej jedną zawodniczkę.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('category-action-start'));
    expect(await screen.findByText('Kategoria rozpoczęta')).toBeOnTheScreen();
    expect(await screen.findByTestId('category-action-lock')).toBeOnTheScreen();
    await r.unmount();
  });

  it('TC-STATE-013: treść ostrzeżenia przed blokadą', () => {
    const t = i18n.getFixedT('pl', ['ui', 'org']);
    const now = Date.parse('2026-10-03T12:00:00Z');
    const model = lockWarningsModel(
      t as never,
      {
        missingSheets: 15,
        devicesWithPending: [
          { deviceId: 'd2', name: 'Tablet stół 2', pendingMutations: 3, lastSeenAt: null },
        ],
        offlineDevices: [
          { deviceId: 'd3', name: 'Tablet stół 3', pendingMutations: 0, lastSeenAt: '2026-10-03T11:55:00Z' },
        ],
      },
      now,
    );
    expect(model.missing).toBe('Brakuje 15 ocen. Wyniki zostaną zapisane jako ostateczne.');
    expect(model.devices).toEqual(['Tablet stół 2 – 3 niewysłane oceny', 'Tablet stół 3 – offline od 5 min']);
  });

  it('TC-E2E-ORG-026: blokada z ostrzeżeniem → Anuluj → „Zablokuj mimo to”; odblokowanie', async () => {
    const box = mockCategory(categoryDetails({ status: 'IN_PROGRESS' }));
    const forces: boolean[] = [];
    server.use(
      http.post(`${API}/v1/categories/c3/lock`, async ({ request }) => {
        const { force } = (await request.json()) as { force: boolean };
        forces.push(force);
        if (!force) {
          return problem(409, 'LOCK_WARNINGS', {
            missingSheets: 15,
            devicesWithPending: [
              { deviceId: 'd2', name: 'Tablet stół 2', pendingMutations: 3, lastSeenAt: null },
            ],
            offlineDevices: [],
          });
        }
        box.current = { ...box.current, status: 'LOCKED' };
        return HttpResponse.json({
          id: 'c3',
          status: 'LOCKED',
          lockedAt: '2026-10-03T12:00:00Z',
          resultsVersion: 3,
          finalResultsHash: 'x',
        });
      }),
      http.post(`${API}/v1/categories/c3/unlock`, () => {
        box.current = { ...box.current, status: 'IN_PROGRESS' };
        return HttpResponse.json(box.current);
      }),
    );
    const r = await startOrg(routes, '/c/c3', state);
    await fireEvent.press(await screen.findByTestId('category-action-lock'));
    expect(
      await screen.findByText('Brakuje 15 ocen. Wyniki zostaną zapisane jako ostateczne.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Tablet stół 2 – 3 niewysłane oceny')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Anuluj'));
    await waitFor(() => expect(screen.queryByTestId('lock-force')).toBeNull());
    await fireEvent.press(screen.getByTestId('category-action-lock'));
    await fireEvent.press(await screen.findByTestId('lock-force'));
    expect(await screen.findByText('Kategoria zakończona')).toBeOnTheScreen();
    expect(forces).toEqual([false, false, true]);
    await fireEvent.press(await screen.findByTestId('category-action-unlock'));
    expect(await screen.findByText('Kategoria odblokowana')).toBeOnTheScreen();
    await r.unmount();
  });
});

describe('SCR-ORG-07/11/17 zawodniczki (IMP-265…267)', () => {
  const entries = [
    entry(41, 'Zuzanna Król'),
    entry(42, 'Agnieszka Mazur', { judged: { done: 3, expected: 5 } }),
    entry(43, 'Amelia Król', { status: 'WITHDRAWN', startOrder: 1 }),
  ];

  it('TC-STATE-015: podpowiedź numeru – najmniejszy wolny > maks.', () => {
    const list = [41, 45, 49].map((n) => ({ startNumber: n }));
    expect(suggestStartNumber(list)).toBe(50);
    expect(suggestStartNumber(list, new Set([50]))).toBe(51);
    expect(suggestStartNumber([])).toBe(1);
  });

  it('TC-E2E-ORG-019: liczniki, wycofana na końcu; dodanie z podpowiedzią; numer zajęty', async () => {
    mockCategory(categoryDetails({ status: 'IN_PROGRESS', entryCount: 3 }));
    let body: unknown;
    server.use(
      http.get(`${API}/v1/categories/c3/entries`, () => HttpResponse.json({ items: entries })),
      http.post(`${API}/v1/categories/c3/entries`, async ({ request }) => {
        body = await request.json();
        if ((body as { startNumber: number }).startNumber === 41)
          return problem(409, 'START_NUMBER_TAKEN', { nr: 41 });
        return HttpResponse.json(entry(44, 'Julia Kamińska'), { status: 201 });
      }),
    );
    const r = await startOrg(routes, '/c/c3?tab=entries', state);
    const list = await screen.findByTestId('entries-list');
    const rows = within(list).getAllByText(/Król|Mazur/);
    expect(rows.map((n) => n.props.children)).toEqual(['Zuzanna Król', 'Agnieszka Mazur', 'Amelia Król']);
    expect(within(list).getByText('5/5')).toBeOnTheScreen();
    expect(within(list).getByText('3/5')).toBeOnTheScreen();
    expect(within(list).getByText('Wycofana')).toBeOnTheScreen();
    expect(screen.queryByTestId('entries-search')).toBeNull();

    await fireEvent.press(screen.getByText('Dodaj'));
    expect(screen.getByTestId('entry-number').props.value).toBe('44');
    await fireEvent.changeText(screen.getByTestId('entry-number'), '41');
    await fireEvent.changeText(screen.getByTestId('entry-name'), 'Julia Kamińska');
    await fireEvent.press(screen.getByTestId('entry-save'));
    expect(await screen.findByText('Numer 41 jest już zajęty.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('entry-number'), '44');
    await fireEvent.press(screen.getByTestId('entry-add-another'));
    expect(await screen.findByText('Dodano zawodniczkę')).toBeOnTheScreen();
    expect(body).toEqual({ startNumber: 44, fullName: 'Julia Kamińska', club: null, birthYear: null });
    expect(screen.getByTestId('entry-number').props.value).toBe('45');
    await r.unmount();
  });

  it('TC-E2E-ORG-020: niepełnoletnia bez zgody → błąd; ze zgodą → zapis', async () => {
    mockCategory(categoryDetails({ entryCount: 0 }), 'DRAFT');
    let body: unknown;
    server.use(
      http.get(`${API}/v1/categories/c3/entries`, () => HttpResponse.json({ items: [] })),
      http.post(`${API}/v1/categories/c3/entries`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(entry(1, 'Ola Nowak'), { status: 201 });
      }),
    );
    const r = await startOrg(routes, '/c/c3?tab=entries', state);
    expect(await screen.findByText('Lista startowa jest pusta.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Dodaj'));
    await fireEvent.changeText(screen.getByTestId('entry-name'), 'Ola Nowak');
    await fireEvent.changeText(screen.getByTestId('entry-birth-year'), String(new Date().getFullYear() - 14));
    await fireEvent.press(screen.getByTestId('entry-save'));
    expect(await screen.findByText('Potwierdź zgodę opiekuna.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('entry-consent'));
    await fireEvent.press(screen.getByTestId('entry-save'));
    expect(await screen.findByText('Dodano zawodniczkę')).toBeOnTheScreen();
    expect(body).toMatchObject({ isMinor: true, guardianConsentConfirmed: true });
    await r.unmount();
  });

  it('TC-E2E-ORG-021: edycja klubu (If-Match), wycofanie z potwierdzeniem, usunięcie bez ocen', async () => {
    mockCategory(categoryDetails({ status: 'IN_PROGRESS', entryCount: 3 }));
    const calls: string[] = [];
    server.use(
      http.get(`${API}/v1/categories/c3/entries`, () =>
        HttpResponse.json({
          items: [...entries, entry(44, 'Nowa Osoba', { judged: { done: 0, expected: 5 } })],
        }),
      ),
      http.patch(`${API}/v1/entries/e41`, async ({ request }) => {
        calls.push(`patch ${request.headers.get('If-Match')} ${JSON.stringify(await request.json())}`);
        return HttpResponse.json(entries[0]);
      }),
      http.post(`${API}/v1/entries/e41/withdraw`, () => {
        calls.push('withdraw');
        return HttpResponse.json(entries[0]);
      }),
      http.delete(`${API}/v1/entries/e44`, () => {
        calls.push('delete');
        return noContent();
      }),
    );
    const r = await startOrg(routes, '/c/c3?tab=entries', state);
    await fireEvent.press(await screen.findByTestId('entry-e41'));
    await fireEvent.changeText(screen.getByTestId('entry-club'), 'Pole Passion Gdańsk');
    await fireEvent.press(screen.getByTestId('entry-save'));
    expect(await screen.findByText('Zapisano zmiany')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('entry-e41'));
    await fireEvent.press(await screen.findByTestId('entry-withdraw'));
    expect(
      await screen.findByText(
        'Zniknie z kolejki sędziów. W rankingu, PDF i CSV zostanie na końcu jako „Wycofana” – bez miejsca i wyniku. Oceny zostaną zachowane.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('entry-remove')).toBeNull();
    await fireEvent.press(screen.getByTestId('entry-confirm'));
    expect(await screen.findByText('Wycofano zawodniczkę')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('entry-e44'));
    await fireEvent.press(await screen.findByTestId('entry-remove'));
    await fireEvent.press(await screen.findByTestId('entry-confirm'));
    expect(await screen.findByText('Usunięto zawodniczkę z listy')).toBeOnTheScreen();
    expect(calls).toEqual(['patch W/"1" {"club":"Pole Passion Gdańsk"}', 'withdraw', 'delete']);
    await r.unmount();
  });

  it('UX-39: edycja wczytuje rok urodzenia; bez zmian „Zapisz” nieaktywny, zmiana klubu nie rusza roku', async () => {
    const minor = entry(45, 'Ola Nowak', {
      athlete: { id: 'a45', fullName: 'Ola Nowak', club: null, birthYear: 2012, isMinor: true },
    });
    mockCategory(categoryDetails({ status: 'IN_PROGRESS', entryCount: 1 }));
    const bodies: unknown[] = [];
    server.use(
      http.get(`${API}/v1/categories/c3/entries`, () => HttpResponse.json({ items: [minor] })),
      http.patch(`${API}/v1/entries/e45`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(minor);
      }),
    );
    const r = await startOrg(routes, '/c/c3?tab=entries', state);
    await fireEvent.press(await screen.findByTestId('entry-e45'));
    expect(screen.getByTestId('entry-birth-year').props.value).toBe('2012');
    expect(screen.getByTestId('entry-consent').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId('entry-save')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('entry-club'), 'Pole Art');
    await fireEvent.press(screen.getByTestId('entry-save'));
    expect(await screen.findByText('Zapisano zmiany')).toBeOnTheScreen();
    expect(bodies).toEqual([{ club: 'Pole Art' }]);
    await r.unmount();
  });

  it('UX-23 / UX-36: tap etykiety przełącza zgodę; „Dalej” przechodzi do pola; zamknięcie ze zmianami pyta', async () => {
    mockCategory(categoryDetails({ entryCount: 0 }), 'DRAFT');
    server.use(http.get(`${API}/v1/categories/c3/entries`, () => HttpResponse.json({ items: [] })));
    const r = await startOrg(routes, '/c/c3?tab=entries', state);
    expect(await screen.findByText('Lista startowa jest pusta.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Dodaj'));
    expect(screen.getByTestId('entry-name').props.returnKeyType).toBe('next');
    await fireEvent.changeText(screen.getByTestId('entry-birth-year'), String(new Date().getFullYear() - 14));
    await fireEvent.press(screen.getByText('Mam zgodę rodzica/opiekuna na przetwarzanie danych'));
    expect(screen.getByTestId('entry-consent').props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(screen.getByTestId('entry-sheet-backdrop', { includeHiddenElements: true }));
    expect(await screen.findByText('Odrzucić zmiany?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('sheet-keep-editing'));
    expect(screen.getByTestId('entry-birth-year').props.value).toBe(String(new Date().getFullYear() - 14));
    await fireEvent.press(screen.getByTestId('entry-sheet-backdrop', { includeHiddenElements: true }));
    await fireEvent.press(await screen.findByTestId('sheet-discard'));
    await waitFor(() => expect(screen.queryByTestId('entry-sheet')).toBeNull());
    await r.unmount();
  });

  it('UX-12: W przygotowaniu bez ocen – tylko „Usuń z listy”, bez „Wycofaj”', async () => {
    mockCategory(categoryDetails({ status: 'DRAFT', entryCount: 1 }), 'DRAFT');
    server.use(
      http.get(`${API}/v1/categories/c3/entries`, () =>
        HttpResponse.json({ items: [entry(41, 'Zuzanna Król', { judged: { done: 0, expected: 5 } })] }),
      ),
    );
    const r = await startOrg(routes, '/c/c3?tab=entries', state);
    await fireEvent.press(await screen.findByTestId('entry-e41'));
    expect(await screen.findByTestId('entry-remove')).toBeOnTheScreen();
    expect(screen.queryByTestId('entry-withdraw')).toBeNull();
    await r.unmount();
  });

  it('TC-E2E-ORG-034: „Usuń dane osobowe” dostępne w turnieju zakończonym (TL-17)', async () => {
    mockCategory(categoryDetails({ status: 'LOCKED', entryCount: 2 }), 'FINISHED');
    let anonymized = false;
    server.use(
      http.get(`${API}/v1/categories/c3/entries`, () => HttpResponse.json({ items: entries.slice(0, 2) })),
      http.post(`${API}/v1/entries/e41/anonymize`, () => {
        anonymized = true;
        return HttpResponse.json(entries[0]);
      }),
    );
    const r = await startOrg(routes, '/c/c3?tab=entries', state);
    expect(screen.queryByText('Dodaj')).toBeNull();
    await fireEvent.press(await screen.findByTestId('entry-e41'));
    expect(screen.queryByTestId('entry-withdraw')).toBeNull();
    await fireEvent.press(screen.getByTestId('entry-anonymize'));
    expect(
      await screen.findByText('W wynikach pozostanie „Zawodniczka nr 41”. Tej operacji nie można cofnąć.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('entry-confirm'));
    expect(await screen.findByText('Usunięto dane osobowe')).toBeOnTheScreen();
    expect(anonymized).toBe(true);
    await r.unmount();
  });

  it('UX-11: wejście z ekranu „Zawodniczki” – etykieta wstecz „Zawodniczki”, domyślnie „Turniej”', async () => {
    mockCategory(categoryDetails({ status: 'IN_PROGRESS', entryCount: 0 }));
    server.use(http.get(`${API}/v1/categories/c3/entries`, () => HttpResponse.json({ items: [] })));
    let r = await startOrg(routes, '/c/c3?tab=entries&from=athletes', state);
    expect(await screen.findByText('Zawodniczki', { exact: false })).toBeOnTheScreen();
    expect(screen.queryByText('Turniej')).toBeNull();
    await r.unmount();
    r = await startOrg(routes, '/c/c3?tab=entries', state);
    expect(await screen.findByText('Turniej')).toBeOnTheScreen();
    await r.unmount();
  });

  it('UX-40: turniej zakończony – „Usuń dane osobowe” także dla zawodniczki bez ocen', async () => {
    mockCategory(categoryDetails({ status: 'LOCKED', entryCount: 1 }), 'FINISHED');
    const unscored = entry(45, 'Oliwia Wrona', { judged: { done: 0, expected: 5 } });
    let anonymized = false;
    server.use(
      http.get(`${API}/v1/categories/c3/entries`, () => HttpResponse.json({ items: [unscored] })),
      http.post(`${API}/v1/entries/e45/anonymize`, () => {
        anonymized = true;
        return HttpResponse.json(unscored);
      }),
    );
    const r = await startOrg(routes, '/c/c3?tab=entries', state);
    await fireEvent.press(await screen.findByTestId('entry-e45'));
    expect(screen.queryByTestId('entry-remove')).toBeNull();
    await fireEvent.press(screen.getByTestId('entry-anonymize'));
    expect(
      await screen.findByText('Imię, nazwisko i klub zostaną usunięte. Tej operacji nie można cofnąć.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('entry-confirm'));
    expect(await screen.findByText('Usunięto dane osobowe')).toBeOnTheScreen();
    expect(anonymized).toBe(true);
    await r.unmount();
  });

  it('TC-E2E-ORG-022: wyszukiwarka od 15 pozycji, zapytanie `q` do API', async () => {
    mockCategory(categoryDetails({ status: 'IN_PROGRESS', entryCount: 15 }));
    const queries: (string | null)[] = [];
    server.use(
      http.get(`${API}/v1/categories/c3/entries`, ({ request }) => {
        const q = new URL(request.url).searchParams.get('q');
        queries.push(q);
        return HttpResponse.json({
          items: q ? entries.filter((e) => e.athlete.fullName.includes('Król')) : entries,
        });
      }),
    );
    const r = await startOrg(routes, '/c/c3?tab=entries', state);
    await fireEvent.changeText(await screen.findByTestId('entries-search'), 'Krol');
    await waitFor(() => expect(queries).toContain('Krol'));
    await waitFor(() => expect(screen.queryByText('Agnieszka Mazur')).toBeNull());
    await r.unmount();
  });
});

describe('SCR-ORG-08 zakładka Wyniki (IMP-268)', () => {
  const results = (over: Partial<ResultsResponse> = {}): ResultsResponse => ({
    categoryId: 'c3',
    status: 'IN_PROGRESS',
    resultsVersion: 3,
    maxJudgeScore: 65,
    judgeCount: 5,
    formula: 'MEAN',
    tieBreak: { criterionId: 'k1', criterionName: 'Technika' },
    rows: [
      {
        entryId: 'e47',
        rank: 1,
        startNumber: 47,
        fullName: 'Natalia Sikora',
        club: 'Studio Vertical Wrocław',
        entryStatus: 'ACTIVE',
        official: 55.5,
        display: '55,50',
        sheetCount: 3,
        isComplete: false,
        isProvisional: true,
      },
      {
        entryId: 'e48',
        rank: null,
        startNumber: 48,
        fullName: 'Ola Nowak',
        club: null,
        entryStatus: 'ACTIVE',
        official: null,
        display: '—',
        sheetCount: 0,
        isComplete: false,
        isProvisional: false,
      },
    ],
    ...over,
  });

  it('TC-E2E-ORG-023: wynik z API, „3/5 sędziów”, bez ocen „–”/„brak ocen”, objaśnienie z „Technikę”', async () => {
    mockCategory(categoryDetails({ status: 'IN_PROGRESS' }));
    server.use(http.get(`${API}/v1/categories/c3/results`, () => HttpResponse.json(results())));
    const r = await startOrg(routes, '/c/c3?tab=results', state);
    const row = await screen.findByTestId('result-e47');
    expect(within(row).getByText('55,50')).toBeOnTheScreen();
    expect(within(row).getByText('3/5 sędziów')).toBeOnTheScreen();
    // UX2-01, UX2-03: „wstępny” w kategorii trwającej, liczba pełnych wyników (mianownik – aktywne, także bez ocen), bez paska.
    expect(within(row).getByText('wstępny')).toBeOnTheScreen();
    expect(screen.getByTestId('results-complete-count')).toHaveTextContent('Pełne wyniki: 0 z 2');
    expect(within(row).queryByRole('progressbar')).toBeNull();
    expect(within(row).getByText('#47 · Studio Vertical Wrocław')).toBeOnTheScreen();
    const empty = screen.getByTestId('result-e48');
    expect(within(empty).getByText('–')).toBeOnTheScreen();
    expect(within(empty).getByText('brak ocen')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Wynik = średnia sędziów z (kryterium × waga − kary). Remis rozstrzyga wyższa ocena za Technikę.',
      ),
    ).toBeOnTheScreen();
    await r.unmount();
  });

  it('TC-DESIGN-001: W przygotowaniu – wszystkie wiersze „—”, „brak ocen”, miejsca „–”', async () => {
    mockCategory(categoryDetails());
    server.use(
      http.get(`${API}/v1/categories/c3/results`, () =>
        HttpResponse.json(
          results({
            status: 'DRAFT',
            rows: results().rows.map((row) => ({
              ...row,
              rank: null,
              official: null,
              sheetCount: 0,
              display: '—',
            })),
          }),
        ),
      ),
    );
    const r = await startOrg(routes, '/c/c3?tab=results', state);
    await screen.findByTestId('results-list');
    expect(screen.getAllByText('–')).toHaveLength(2);
    expect(screen.getAllByText('brak ocen')).toHaveLength(2);
    expect(screen.getAllByText('—')).toHaveLength(2);
    await r.unmount();
  });
});
