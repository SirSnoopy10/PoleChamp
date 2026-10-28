import { http, HttpResponse } from 'msw';
import OrgLayout from '../../../../app/(org)/_layout';
import TournamentsRoute from '../../../../app/(org)/index';
import AthletesRoute from '../../../../app/(org)/athletes/[tournamentId]';
import TournamentRoute from '../../../../app/(org)/t/[tournamentId]';
import { i18n } from '../../../i18n';
import { categoryItem, device, tournamentDetails } from '../../../test-utils/fixtures';
import { API, noContent, problem, setupOrgServer, startOrg } from '../../../test-utils/org';
import { fireEvent, screen, waitFor, within } from '../../../test-utils/render';
import { finishModel } from '../FinishTournamentSheet';

jest.mock('../../../data/realtime/useOrgRealtime', () => ({ useOrgRealtime: () => undefined }));

const { server, state } = setupOrgServer();
const routes = {
  '(org)/_layout': OrgLayout,
  '(org)/index': TournamentsRoute,
  '(org)/t/[tournamentId]': TournamentRoute,
  '(org)/athletes/[tournamentId]': AthletesRoute,
};
const me = (emailVerified = true) =>
  http.get(`${API}/v1/me`, () =>
    HttpResponse.json({ id: 'u1', email: 'a@b.pl', displayName: 'A', emailVerified, locale: 'pl' }),
  );
const details = (body: ReturnType<typeof tournamentDetails>) =>
  http.get(`${API}/v1/tournaments/t1`, () => HttpResponse.json(body));
const emptyList = http.get(`${API}/v1/tournaments`, () => HttpResponse.json({ items: [] }));

describe('SCR-ORG-03 szczegóły turnieju (IMP-257)', () => {
  it('TC-E2E-ORG-010: kafle, postęp, karty kategorii z pigułkami', async () => {
    server.use(me(), details(tournamentDetails()));
    const r = await startOrg(routes, '/t/t1', state);
    const tiles = await screen.findByTestId('stat-tiles');
    expect(within(tiles).getByText('8')).toBeOnTheScreen();
    expect(within(tiles).getByText('61')).toBeOnTheScreen();
    expect(within(tiles).getByText('5')).toBeOnTheScreen();
    expect(screen.getByText('80%')).toBeOnTheScreen();
    expect(screen.getByText('173 z 215 ocen w rozpoczętych kategoriach')).toBeOnTheScreen();
    expect(within(screen.getByTestId('category-c3')).getByText('Trwa')).toBeOnTheScreen();
    expect(screen.getByTestId('tournament-finish')).toBeOnTheScreen();
    await r.unmount();
  });

  it('kafel „Zawodniczki” otwiera listę z podziałem na kategorie', async () => {
    const entry = (id: string, nr: number, fullName: string, status: 'ACTIVE' | 'WITHDRAWN' = 'ACTIVE') => ({
      id,
      startNumber: nr,
      startOrder: nr,
      status,
      version: 1,
      athlete: { id: `a${id}`, fullName, club: 'Klub', isMinor: false },
      judged: { done: 0, expected: 0 },
    });
    server.use(
      me(),
      details(
        tournamentDetails({
          categories: [categoryItem('c1', { name: 'Kat A' }), categoryItem('c2', { name: 'Kat B' })],
        }),
      ),
      http.get(`${API}/v1/categories/c1/entries`, () =>
        HttpResponse.json({ items: [entry('e1', 12, 'Anna Nowak')] }),
      ),
      http.get(`${API}/v1/categories/c2/entries`, () =>
        HttpResponse.json({ items: [entry('e2', 7, 'Ewa Kot', 'WITHDRAWN')] }),
      ),
    );
    const r = await startOrg(routes, '/t/t1', state);
    const tiles = await screen.findByTestId('stat-tiles');
    await fireEvent.press(within(tiles).getByText('Zawodniczki'));
    const a = await screen.findByTestId('athletes-category-c1');
    expect(await within(a).findByText('nr 12 · Anna Nowak')).toBeOnTheScreen();
    const b = screen.getByTestId('athletes-category-c2');
    expect(await within(b).findByText('nr 7 · Ewa Kot')).toBeOnTheScreen();
    expect(within(b).getByText('Wycofana')).toBeOnTheScreen();
    await r.unmount();
  });

  it('TC-E2E-ORG-010: pusty turniej – stan pusty otwiera „Nowa kategoria”', async () => {
    server.use(
      me(),
      details(
        tournamentDetails({
          status: 'DRAFT',
          categories: [],
          stats: { categories: 0, athletes: 0, judges: 0 },
          progress: { done: 0, expected: 0, percent: 0, startedCategories: 0 },
        }),
      ),
    );
    const r = await startOrg(routes, '/t/t1', state);
    expect(await screen.findByText('Brak rozpoczętych kategorii')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Brak kategorii. Dodaj pierwszą, aby zacząć.'));
    expect(await screen.findByText('Nowa kategoria')).toBeOnTheScreen();
    await r.unmount();
  });

  it('TC-DESIGN-002: turniej Zakończona – brak przycisku statusu, „Dodaj”, ołówka; „Nierozegrana”', async () => {
    server.use(
      me(),
      details(
        tournamentDetails({ status: 'FINISHED', categories: [categoryItem('c8', { name: 'Masters' })] }),
      ),
    );
    const r = await startOrg(routes, '/t/t1', state);
    await screen.findByTestId('tournament-status');
    expect(screen.queryByTestId('tournament-start')).toBeNull();
    expect(screen.queryByTestId('tournament-finish')).toBeNull();
    expect(screen.queryByTestId('tournament-edit')).toBeNull();
    expect(screen.queryByText('Dodaj')).toBeNull();
    expect(within(screen.getByTestId('category-c8')).getByText('Nierozegrana')).toBeOnTheScreen();
    await r.unmount();
  });

  it('baner weryfikacji e-maila i odrzuconych ocen; EMAIL_NOT_VERIFIED przy starcie', async () => {
    server.use(
      me(false),
      details(tournamentDetails({ status: 'DRAFT', pendingRejectedSubmissions: 2 })),
      http.post(`${API}/v1/tournaments/t1/start`, () => problem(403, 'EMAIL_NOT_VERIFIED')),
    );
    const r = await startOrg(routes, '/t/t1', state);
    expect(await screen.findByText('Potwierdź adres e-mail, aby rozpocząć turniej.')).toBeOnTheScreen();
    expect(screen.getByText('Odrzucone oceny (2)')).toBeOnTheScreen();
    await r.unmount();
  });
});

describe('SCR-ORG-04 zakończenie turnieju (IMP-258)', () => {
  it('TC-STATE-014: kategorie, braki ocen, tablety z kolejką, odrzucone', () => {
    const t = i18n.getFixedT('pl', ['ui', 'org']);
    const model = finishModel(
      t as never,
      {
        pendingRejectedSubmissions: 2,
        categories: [
          categoryItem('a', { status: 'IN_PROGRESS', progress: { done: 30, expected: 40, percent: 75 } }),
          categoryItem('b', { status: 'IN_PROGRESS', progress: { done: 10, expected: 15, percent: 67 } }),
          categoryItem('c'),
          categoryItem('d'),
          categoryItem('e'),
        ],
      },
      [device('d1', { name: 'Tablet stół 2', pendingMutations: 3 }), device('d2')],
    );
    expect(model.categories).toBe(
      'Kategorie w toku (2) zostaną zablokowane. Kategorie w przygotowaniu (3) zostaną oznaczone jako nierozegrane.',
    );
    expect(model.warnings).toEqual([
      'Brakuje 15 ocen w kategoriach w toku.',
      'Tablety z niewysłanymi ocenami: Tablet stół 2 (3)',
      'Nierozstrzygnięte odrzucone oceny (2) nie będą mogły zostać przyjęte.',
    ]);
  });

  it('TC-E2E-ORG-011: start → toast; zakończ → anuluj; zakończ z If-Match → toast', async () => {
    let current = tournamentDetails({
      status: 'DRAFT',
      progress: { done: 0, expected: 0, percent: 0, startedCategories: 0 },
    });
    let ifMatch: string | null = null;
    server.use(
      me(),
      http.get(`${API}/v1/tournaments/t1`, () => HttpResponse.json(current)),
      http.get(`${API}/v1/tournaments/t1/devices`, () => HttpResponse.json({ items: [] })),
      http.post(`${API}/v1/tournaments/t1/start`, () => {
        current = { ...current, status: 'IN_PROGRESS', version: 8 };
        return HttpResponse.json(current);
      }),
      http.post(`${API}/v1/tournaments/t1/finish`, ({ request }) => {
        ifMatch = request.headers.get('If-Match');
        current = { ...current, status: 'FINISHED', version: 9 };
        return HttpResponse.json({
          id: 't1',
          status: 'FINISHED',
          finishedAt: '2026-10-04T18:00:00Z',
          autoLockedCategoryIds: [],
          unplayedCategoryIds: [],
          version: 9,
        });
      }),
    );
    const r = await startOrg(routes, '/t/t1', state);
    await fireEvent.press(await screen.findByTestId('tournament-start'));
    expect(await screen.findByText('Turniej rozpoczęty')).toBeOnTheScreen();
    await fireEvent.press(await screen.findByTestId('tournament-finish'));
    expect(await screen.findByText('Zakończyć turniej?')).toBeOnTheScreen();
    expect(
      screen.getByText(
        '„Mistrzostwa Polski Pole Sport 2026” zostanie zamknięty, a wyniki zapisane jako ostateczne.',
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Anuluj'));
    await waitFor(() => expect(screen.queryByText('Zakończyć turniej?')).toBeNull());
    await fireEvent.press(screen.getByTestId('tournament-finish'));
    await fireEvent.press(await screen.findByTestId('finish-confirm'));
    expect(await screen.findByText('Turniej zakończony')).toBeOnTheScreen();
    expect(ifMatch).toBe('W/"8"');
    await waitFor(() => expect(screen.queryByTestId('tournament-finish')).toBeNull());
    await r.unmount();
  });
});

describe('SCR-ORG-20 edycja i usunięcie turnieju (IMP-259)', () => {
  it('TC-E2E-ORG-012: zmiana miejsca → „Zapisano zmiany” (tylko zmienione pole)', async () => {
    let body: unknown;
    server.use(
      me(),
      details(tournamentDetails({ status: 'DRAFT' })),
      http.patch(`${API}/v1/tournaments/t1`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({});
      }),
    );
    const r = await startOrg(routes, '/t/t1', state);
    await fireEvent.press(await screen.findByTestId('tournament-edit'));
    await fireEvent.changeText(screen.getByTestId('tournament-venue'), 'Poznań, Arena');
    await fireEvent.press(screen.getByTestId('tournament-save'));
    expect(await screen.findByText('Zapisano zmiany')).toBeOnTheScreen();
    expect(body).toEqual({ venue: 'Poznań, Arena' });
    await r.unmount();
  });

  it('TC-E2E-ORG-012: usunięcie turnieju DRAFT → lista; w Trwa brak „Usuń turniej”', async () => {
    server.use(
      me(),
      emptyList,
      details(tournamentDetails({ status: 'DRAFT' })),
      http.delete(`${API}/v1/tournaments/t1`, () => noContent()),
    );
    const r = await startOrg(routes, '/t/t1', state);
    await fireEvent.press(await screen.findByTestId('tournament-edit'));
    await fireEvent.press(screen.getByTestId('tournament-delete'));
    expect(await screen.findByText('Usunąć turniej „Mistrzostwa Polski Pole Sport 2026”?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('tournament-delete-confirm'));
    await waitFor(() => expect(r.getPathname()).toBe('/'));
    await r.unmount();

    server.use(details(tournamentDetails()));
    const live = await startOrg(routes, '/t/t1', state);
    await fireEvent.press(await screen.findByTestId('tournament-edit'));
    expect(screen.queryByTestId('tournament-delete')).toBeNull();
    await live.unmount();
  });

  it('TC-EDGE-051: równoczesna edycja – CONFLICT_VERSION z komunikatem katalogu', async () => {
    server.use(
      me(),
      details(tournamentDetails()),
      http.patch(`${API}/v1/tournaments/t1`, () => problem(409, 'CONFLICT_VERSION')),
    );
    const r = await startOrg(routes, '/t/t1', state);
    await fireEvent.press(await screen.findByTestId('tournament-edit'));
    await fireEvent.changeText(screen.getByTestId('tournament-name'), 'Nowa nazwa turnieju');
    await fireEvent.press(screen.getByTestId('tournament-save'));
    expect(await screen.findByText('Ktoś zmienił te dane. Odśwież i spróbuj ponownie.')).toBeOnTheScreen();
    await r.unmount();
  });
});

describe('SCR-ORG-05 nowa kategoria (IMP-260)', () => {
  it('TC-E2E-ORG-013: „Exotic Pro” z szablonu → toast, zostaje na SCR-ORG-03; pusta nazwa → błąd', async () => {
    let body: unknown;
    server.use(
      me(),
      details(tournamentDetails({ status: 'DRAFT' })),
      http.post(`${API}/v1/tournaments/t1/categories`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'c9' }, { status: 201 });
      }),
    );
    const r = await startOrg(routes, '/t/t1', state);
    await fireEvent.press(await screen.findByText('Dodaj'));
    await fireEvent.press(screen.getByTestId('category-submit'));
    expect(await screen.findByText('Podaj nazwę kategorii.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('category-name'), 'Exotic Pro');
    await fireEvent.press(screen.getByText('Exotic'));
    await fireEvent.press(screen.getByText('Pro'));
    await fireEvent.press(screen.getByTestId('category-submit'));
    expect(await screen.findByText('Dodano kategorię')).toBeOnTheScreen();
    expect(body).toEqual({ name: 'Exotic Pro', style: 'EXOTIC', level: 'PRO', ageGroup: 'Open' });
    expect(r.getPathname()).toBe('/t/t1');
    await r.unmount();
  });
});
