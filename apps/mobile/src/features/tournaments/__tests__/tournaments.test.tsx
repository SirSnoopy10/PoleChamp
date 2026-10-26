import { http, HttpResponse } from 'msw';
import type { TournamentListItem } from '@polechamp/contracts';
import OrgLayout from '../../../../app/(org)/_layout';
import TournamentsRoute from '../../../../app/(org)/index';
import TournamentRoute from '../../../../app/(org)/t/[tournamentId]';
import { groupTournaments } from '../../../data/org/tournaments';
import { network } from '../../../data/network/online';
import { bootstrapOrg } from '../../org/bootstrap';
import { act, createTestQueryClient, fireEvent, screen, waitFor, within } from '../../../test-utils/render';
import { API, problem, setupOrgServer, startOrg } from '../../../test-utils/org';

const { server, state } = setupOrgServer();
const routes = {
  '(org)/_layout': OrgLayout,
  '(org)/index': TournamentsRoute,
  '(org)/t/[tournamentId]': TournamentRoute,
};

const item = (id: string, over: Partial<TournamentListItem>): TournamentListItem => ({
  id,
  name: id,
  status: 'DRAFT',
  startDate: null,
  endDate: null,
  venue: null,
  categoryCount: 0,
  progress: { done: 0, expected: 0, percent: 0 },
  ...over,
});

// FX-SEED (skrót): t1 Trwa, t2 W przygotowaniu, t3/t4 zakończone.
const t1 = item('t1', {
  name: 'Mistrzostwa Polski Pole Sport 2026',
  status: 'IN_PROGRESS',
  startDate: '2026-10-03',
  endDate: '2026-10-04',
  venue: 'Warszawa, Hala Torwar',
  categoryCount: 8,
  progress: { done: 173, expected: 215, percent: 80 },
});
const t2 = item('t2', {
  name: 'Puchar Wiosny PoleChamp',
  startDate: '2027-04-18',
  endDate: '2027-04-18',
  venue: 'Poznań, Arena',
  categoryCount: 3,
});
const t3 = item('t3', { name: 'Zimowy Puchar PoleChamp', status: 'FINISHED', startDate: '2026-02-08' });
const t4 = item('t4', { name: 'Otwarte Mistrzostwa Śląska', status: 'FINISHED', startDate: '2025-11-22' });

const list = (active: TournamentListItem[], finished: TournamentListItem[]) =>
  http.get(`${API}/v1/tournaments`, ({ request }) =>
    HttpResponse.json({
      items: new URL(request.url).searchParams.get('status') === 'finished' ? finished : active,
    }),
  );

describe('SCR-ORG-01 lista turniejów (IMP-255)', () => {
  it('TC-STATE-012: Trwa przed W przygotowaniu, data rosnąco, brak daty na końcu; zakończone malejąco', () => {
    const live = item('a', { status: 'IN_PROGRESS', startDate: '2026-05-01' });
    const liveNoDate = item('b', { status: 'IN_PROGRESS' });
    const draftEarly = item('c', { startDate: '2026-01-01' });
    const draftLate = item('d', { startDate: '2026-12-01' });
    const { active, finished } = groupTournaments([draftLate, liveNoDate, draftEarly, live], [t4, t3]);
    expect(active.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(finished?.map((t) => t.id)).toEqual(['t3', 't4']);
    expect(groupTournaments([t1], []).finished).toBeNull();
  });

  it('TC-E2E-ORG-008: sekcje Aktywne i Zakończone, karta z postępem i etykietą a11y', async () => {
    server.use(list([t2, t1], [t4, t3]));
    const r = await startOrg(routes, '/', state);
    const card = await screen.findByTestId('tournament-t1');
    expect(within(card).getByText('8 kategorii · 80%')).toBeOnTheScreen();
    expect(card.props.accessibilityLabel).toBe(
      'Mistrzostwa Polski Pole Sport 2026, Trwa, 3–4 października 2026, Warszawa, Hala Torwar, postęp 80 procent',
    );
    expect(screen.getByText('Zakończone')).toBeOnTheScreen();
    expect(screen.getByText('8 lutego 2026 · Miejsce do ustalenia')).toBeOnTheScreen();
    await fireEvent.press(card);
    await waitFor(() => expect(r.getPathname()).toBe('/t/t1'));
    await r.unmount();
  });

  it('TC-E2E-ORG-008: konto bez turniejów → „Nie masz jeszcze turniejów.” + „Utwórz turniej”', async () => {
    server.use(list([], []));
    const r = await startOrg(routes, '/', state);
    expect(await screen.findByText('Nie masz jeszcze turniejów.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('tournaments-create'));
    expect(await screen.findByText('Nowy turniej')).toBeOnTheScreen();
    await r.unmount();
  });

  it('brak aktywnych przy zakończonych; błąd wczytywania z ponowieniem', async () => {
    server.use(list([], [t3]));
    const r = await startOrg(routes, '/', state);
    expect(await screen.findByText('Brak aktywnych turniejów.')).toBeOnTheScreen();
    await r.unmount();

    server.use(http.get(`${API}/v1/tournaments`, () => problem(500, 'INTERNAL')));
    const failed = await startOrg(routes, '/', state);
    expect(await screen.findByText('Nie udało się wczytać danych.')).toBeOnTheScreen();
    server.use(list([t1], []));
    await fireEvent.press(screen.getByText('Spróbuj ponownie'));
    expect(await screen.findByTestId('tournament-t1')).toBeOnTheScreen();
    await failed.unmount();
  });
});

describe('SCR-ORG-02 nowy turniej (IMP-256)', () => {
  it('TC-E2E-ORG-009: pusta nazwa → błąd; zapis → szczegóły i toast', async () => {
    let body: unknown;
    server.use(
      list([], []),
      http.post(`${API}/v1/tournaments`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            id: 't9',
            name: 'Puchar Wiosny PoleChamp',
            status: 'DRAFT',
            startDate: null,
            endDate: null,
            venue: null,
            version: 1,
          },
          { status: 201 },
        );
      }),
    );
    const r = await startOrg(routes, '/', state);
    await fireEvent.press(await screen.findByTestId('tournaments-new'));
    await fireEvent.press(screen.getByTestId('tournament-create'));
    expect(await screen.findByText('Podaj nazwę turnieju (min. 3 znaki).')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('tournament-name'), 'Puchar Wiosny PoleChamp');
    await fireEvent.press(screen.getByTestId('tournament-create'));
    await waitFor(() => expect(r.getPathname()).toBe('/t/t9'));
    expect(body).toEqual({ name: 'Puchar Wiosny PoleChamp', startDate: null, endDate: null, venue: null });
    expect(await screen.findByText('Utworzono turniej')).toBeOnTheScreen();
    await r.unmount();
  });

  it('TC-EDGE-031: błąd sieci zostawia arkusz; ponowienie z tym samym Idempotency-Key', async () => {
    const keys: (string | null)[] = [];
    let calls = 0;
    server.use(
      list([], []),
      http.post(`${API}/v1/tournaments`, ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        if (++calls === 1) return HttpResponse.error();
        return HttpResponse.json(
          {
            id: 't9',
            name: 'Puchar',
            status: 'DRAFT',
            startDate: null,
            endDate: null,
            venue: null,
            version: 1,
          },
          { status: 201 },
        );
      }),
    );
    const r = await startOrg(routes, '/', state);
    await fireEvent.press(await screen.findByTestId('tournaments-new'));
    await fireEvent.changeText(screen.getByTestId('tournament-name'), 'Puchar');
    await fireEvent.press(screen.getByTestId('tournament-create'));
    expect(await screen.findByText('Nie udało się zapisać. Spróbuj ponownie.')).toBeOnTheScreen();
    expect(screen.getByTestId('tournament-name').props.value).toBe('Puchar');
    // Bez sieci zapis jest niedostępny (IMP-278); po powrocie łączności – ponowienie z tym samym kluczem.
    expect(screen.getByTestId('tournament-create')).toBeDisabled();
    await act(async () => network.reportHttpSuccess());
    await fireEvent.press(screen.getByTestId('tournament-create'));
    await waitFor(() => expect(r.getPathname()).toBe('/t/t9'));
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
    await r.unmount();
  });
});

describe('SCR-ORG-00 splash organizatora (IMP-254)', () => {
  it('TC-E2E-ORG-007: etapy „Wczytywanie turniejów…” → „Synchronizacja wyników…” → „Gotowe”', async () => {
    server.use(list([t1], [t3]));
    const client = createTestQueryClient();
    const stages: string[] = [];
    await bootstrapOrg(client, (s) => stages.push(s));
    expect(stages).toEqual(['loadingTournaments', 'syncingResults', 'ready']);
    expect(client.getQueryData(['tournaments', 'active'])).toEqual([t1]);
    client.clear();
  });

  it('błąd sieci kończy ładowanie („Gotowe”) – lista pokaże cache z banerem', async () => {
    server.use(http.get(`${API}/v1/tournaments`, () => HttpResponse.error()));
    const client = createTestQueryClient();
    const stages: string[] = [];
    await bootstrapOrg(client, (s) => stages.push(s));
    expect(stages.at(-1)).toBe('ready');
    client.clear();
    network.reset();
  });
});
