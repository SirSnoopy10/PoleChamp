import { http, HttpResponse } from 'msw';
import type { RejectedSubmission, ResultsResponse } from '@polechamp/contracts';
import OrgLayout from '../../../../app/(org)/_layout';
import CategoryRoute from '../../../../app/(org)/c/[categoryId]';
import TournamentRoute from '../../../../app/(org)/t/[tournamentId]';
import { network } from '../../../data/network/online';
import { EXPORT_TIMEOUT_MS, runExport, type ExportDeps } from '../../../data/org/exports';
import { categoryDetails, tournamentDetails } from '../../../test-utils/fixtures';
import { API, setupOrgServer, startOrg } from '../../../test-utils/org';
import { act, fireEvent, renderWithProviders, screen, waitFor, within } from '../../../test-utils/render';
import { Button } from '../../../ui/Button';
import { useSheet } from '../../../ui/sheet';
import { PdfPreviewSheet } from '../../exports/PdfPreviewSheet';

jest.mock('../../../data/realtime/useOrgRealtime', () => ({ useOrgRealtime: () => undefined }));

const { server, state } = setupOrgServer();
const routes = {
  '(org)/_layout': OrgLayout,
  '(org)/t/[tournamentId]': TournamentRoute,
  '(org)/c/[categoryId]': CategoryRoute,
};

const results: ResultsResponse = {
  categoryId: 'c3',
  status: 'IN_PROGRESS',
  resultsVersion: 3,
  maxJudgeScore: 65,
  judgeCount: 5,
  formula: 'MEAN',
  tieBreak: { criterionId: 'k1', criterionName: 'Technika' },
  rows: [
    {
      entryId: 'e43',
      rank: 1,
      startNumber: 43,
      fullName: 'Amelia Król',
      club: 'Pole Passion Gdańsk',
      entryStatus: 'ACTIVE',
      official: 54.8,
      display: '54,8',
      sheetCount: 5,
      isComplete: true,
      isProvisional: false,
    },
  ],
};

function base() {
  server.use(
    http.get(`${API}/v1/me`, () =>
      HttpResponse.json({ id: 'u1', email: 'a@b.pl', displayName: 'A', emailVerified: true, locale: 'pl' }),
    ),
    http.get(`${API}/v1/tournaments/t1`, () =>
      HttpResponse.json(tournamentDetails({ pendingRejectedSubmissions: 2 })),
    ),
    http.get(`${API}/v1/categories/c3`, () => HttpResponse.json(categoryDetails({ status: 'IN_PROGRESS' }))),
    http.get(`${API}/v1/categories/c3/results`, () => HttpResponse.json(results)),
  );
}

describe('SCR-ORG-19 oceny zawodniczki (IMP-269)', () => {
  it('TC-E2E-ORG-024: karty sędziów z notami, karami, komentarzem, „offline”; historia zmian', async () => {
    base();
    const sheet = (id: string, judge: string, over: object = {}) => ({
      id,
      judge: { id: `j${id}`, fullName: judge },
      criteria: [
        { criterionId: 'k1', name: 'Technika', weight: 2, value: 8.5 },
        { criterionId: 'k2', name: 'Choreografia', weight: 1.5, value: 7 },
      ],
      penalties: [{ penaltyTypeId: 'p1', name: 'Upadek', points: 2, count: 1 }],
      comment: '',
      total: 54.5,
      authMode: 'ONLINE',
      revision: 1,
      revisionCount: 1,
      updatedAt: '2026-10-03T10:00:00Z',
      ...over,
    });
    server.use(
      http.get(`${API}/v1/entries/e43/score-sheets`, () =>
        HttpResponse.json({
          items: [
            sheet('s1', 'Anna Nowak', { comment: 'Świetna energia', revisionCount: 2, revision: 2 }),
            sheet('s2', 'Ewa Lis', { authMode: 'OFFLINE_PIN' }),
          ],
          missingJudges: [{ id: 'j9', fullName: 'Jan Kowal' }],
          summary: { official: 54.8, display: '54,8', rank: 1, sheetCount: 2, expectedCount: 3 },
        }),
      ),
      http.get(`${API}/v1/score-sheets/s1/revisions`, () =>
        HttpResponse.json({
          items: [
            { revision: 1, createdAt: '2026-10-03T09:58:00Z', total: 52, actorType: 'JUDGE' },
            { revision: 2, createdAt: '2026-10-03T10:00:00Z', total: 54.5, actorType: 'JUDGE' },
          ],
        }),
      ),
    );
    const r = await startOrg(routes, '/c/c3?tab=results', state);
    await fireEvent.press(await screen.findByTestId('result-e43'));
    expect(await screen.findByText('Wynik 54,8 · miejsce 1 · 2/3 sędziów')).toBeOnTheScreen();
    const card = screen.getByTestId('sheet-s1');
    expect(within(card).getByText('Technika 8,5 ×2')).toBeOnTheScreen();
    expect(within(card).getByText('Upadek ×1 (−2)')).toBeOnTheScreen();
    expect(within(card).getByText('„Świetna energia”')).toBeOnTheScreen();
    expect(within(screen.getByTestId('sheet-s2')).getByText('offline')).toBeOnTheScreen();
    expect(screen.getByText('brak oceny')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('history-s1'));
    expect(await screen.findByText(/^rew\. 1 · .* · 52$/)).toBeOnTheScreen();
    await r.unmount();
  });
});

describe('SCR-ORG-12 podgląd PDF (IMP-270)', () => {
  const tournament = tournamentDetails();

  it('runExport: odpytywanie co 1 s do READY, potem pobranie; przekroczenie 30 s → błąd', async () => {
    let clock = 0;
    const delivered: string[] = [];
    const statuses: ('PENDING' | 'READY')[] = ['PENDING', 'PENDING', 'READY'];
    const deps: ExportDeps = {
      create: async () => ({ exportId: 'x1' }),
      status: async () => {
        const status = statuses.shift() ?? 'READY';
        return status === 'READY' ? { status, downloadUrl: 'https://s3.test/x1.pdf' } : { status };
      },
      deliver: async (url) => void delivered.push(url),
      sleep: async (ms) => void (clock += ms),
      now: () => clock,
    };
    await runExport({ scope: 'TOURNAMENT', tournamentId: 't1' }, deps);
    expect(delivered).toEqual(['https://s3.test/x1.pdf']);
    expect(clock).toBe(2000);

    clock = 0;
    await expect(
      runExport(
        { scope: 'TOURNAMENT', tournamentId: 't1' },
        { ...deps, status: async () => ({ status: 'PENDING' }) },
      ),
    ).rejects.toMatchObject({ code: 'INTERNAL' });
    expect(clock).toBeGreaterThanOrEqual(EXPORT_TIMEOUT_MS);
  });

  it('TC-E2E-ORG-025: zakres kategoria – „Pole Sport Advanced · Trwa”, „Generowanie…”, toast; offline', async () => {
    let finish: () => void = () => undefined;
    const deps: ExportDeps = {
      create: async () => ({ exportId: 'x1' }),
      status: async () => ({ status: 'READY', downloadUrl: 'https://s3.test/x1.pdf' }),
      deliver: () => new Promise<void>((resolve) => (finish = resolve)),
      sleep: async () => undefined,
      now: () => 0,
    };
    network.reportHttpSuccess();
    function Harness() {
      const sheet = useSheet();
      return (
        <>
          <Button testID="open-pdf" label="PDF" onPress={sheet.open} />
          <PdfPreviewSheet
            {...sheet.props}
            tournament={tournament}
            categoryId="c3"
            results={[results]}
            deps={deps}
          />
        </>
      );
    }
    const view = await renderWithProviders(<Harness />);
    await fireEvent.press(view.getByTestId('open-pdf'));
    expect(await view.findByText('Pole Sport Advanced · Trwa')).toBeOnTheScreen();
    expect(view.getByText('Amelia Król')).toBeOnTheScreen();
    expect(view.getByText('Pole Passion Gdańsk')).toBeOnTheScreen();
    await fireEvent.press(view.getByTestId('pdf-download'));
    expect(await view.findByText('Generowanie…')).toBeOnTheScreen();
    await act(async () => finish());
    expect(await view.findByText('PDF zapisany')).toBeOnTheScreen();

    await act(async () => network.reportHttpFailure());
    expect(await view.findByText('Eksport wymaga połączenia z internetem.')).toBeOnTheScreen();
    expect(view.getByTestId('pdf-download')).toBeDisabled();
    await view.unmount();
  });
});

describe('SCR-ORG-22 odrzucone oceny (IMP-272)', () => {
  const item = (id: string, categoryId = 'c1'): RejectedSubmission => ({
    id,
    judge: { id: 'j1', fullName: 'Anna Nowak' },
    entry: { id: 'e47', startNumber: 47, fullName: 'Natalia Sikora' },
    category: { id: categoryId, name: categoryId === 'c1' ? 'Pole Sport Beginner' : 'Pole Sport Advanced' },
    reason: 'CATEGORY_LOCKED',
    receivedAt: '2026-10-03T10:00:00Z',
    payloadTotal: 52.5,
    resolution: 'PENDING',
  });

  it('TC-E2E-ORG-027: „Przyjmij” nieaktywne w zablokowanej; przyjęcie w odblokowanej; odrzucenie z potwierdzeniem', async () => {
    base();
    let items = [item('r1'), item('r2', 'c3')];
    const calls: string[] = [];
    server.use(
      http.get(`${API}/v1/tournaments/t1/rejected-submissions`, () => HttpResponse.json({ items })),
      http.post(`${API}/v1/rejected-submissions/:id/accept`, ({ params }) => {
        calls.push(`accept ${params.id as string}`);
        items = items.filter((i) => i.id !== params.id);
        return HttpResponse.json({ ...item(params.id as string), resolution: 'ACCEPTED' });
      }),
      http.post(`${API}/v1/rejected-submissions/:id/discard`, ({ params }) => {
        calls.push(`discard ${params.id as string}`);
        items = items.filter((i) => i.id !== params.id);
        return HttpResponse.json({ ...item(params.id as string), resolution: 'DISCARDED' });
      }),
    );
    const r = await startOrg(routes, '/t/t1', state);
    await fireEvent.press(await screen.findByText('Odrzucone oceny (2)'));
    expect(
      await screen.findByText(
        'Te oceny dotarły po zablokowaniu kategorii. Aby przyjąć ocenę, najpierw odblokuj kategorię.',
      ),
    ).toBeOnTheScreen();
    expect(await screen.findAllByText('Anna Nowak → #47 Natalia Sikora')).toHaveLength(2);
    expect(screen.getByText('Pole Sport Beginner · Kategoria zablokowana')).toBeOnTheScreen();
    expect(screen.getByTestId('rejected-accept-r1')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('rejected-accept-r2'));
    expect(await screen.findByText('Przyjęto ocenę')).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByTestId('rejected-r2')).toBeNull());
    await fireEvent.press(screen.getByTestId('rejected-discard-r1'));
    expect(await screen.findByText('Odrzucić ocenę?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('rejected-confirm'));
    expect(await screen.findByText('Brak odrzuconych ocen.')).toBeOnTheScreen();
    expect(calls).toEqual(['accept r2', 'discard r1']);
    await r.unmount();
  });
});
