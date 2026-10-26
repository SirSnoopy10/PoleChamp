import { renderRouter } from 'expo-router/testing-library';
import JudgeLayout from '../../../../app/(judge)/_layout';
import PairRoute from '../../../../app/(judge)/pair';
import ProfilesRoute from '../../../../app/(judge)/profiles';
import OrgLayout from '../../../../app/(org)/_layout';
import TournamentsRoute from '../../../../app/(org)/index';
import LoginRoute from '../../../../app/(org)/login';
import ResetRoute from '../../../../app/(org)/reset';
import ModeRoute from '../../../../app/(system)/mode';
import { tokenStore } from '../../../data/api/tokens';
import type { AppMode } from '../../../mode/mode';
import { act, Providers } from '../../../test-utils/render';
import { entryRoute, judgeRedirect, orgRedirect } from '../guards';

const routes = {
  '(org)/_layout': OrgLayout,
  '(org)/index': TournamentsRoute,
  '(org)/login': LoginRoute,
  '(org)/reset': ResetRoute,
  '(judge)/_layout': JudgeLayout,
  '(judge)/pair': PairRoute,
  '(judge)/profiles': ProfilesRoute,
  '(system)/mode': ModeRoute,
};

async function start(url: string, mode: AppMode | null) {
  await act(async () => tokenStore.load());
  const result = await renderRouter(routes, {
    initialUrl: url,
    wrapper: ({ children }) => <Providers mode={mode}>{children}</Providers>,
  });
  // Przekierowania strażników (`<Redirect>`) wykonują się w efektach po pierwszym renderze.
  await act(async () => undefined);
  return result;
}

const empty = { org: null, device: null, judge: null };

describe('struktura tras i strażniki (IMP-220)', () => {
  afterEach(() => tokenStore.reset());

  it('strażnik organizatora: tryb → sesja → logowanie; publiczne /login i /reset', () => {
    expect(orgRedirect({ mode: null, session: empty, pathname: '/' })).toBe('/mode');
    expect(orgRedirect({ mode: 'judge', session: empty, pathname: '/' })).toBe('/categories');
    expect(orgRedirect({ mode: 'org', session: empty, pathname: '/' })).toBe('/login');
    expect(orgRedirect({ mode: 'org', session: empty, pathname: '/reset' })).toBeNull();
    const org = { ...empty, org: { accessToken: 'a', refreshToken: 'r' } };
    expect(orgRedirect({ mode: 'org', session: org, pathname: '/login' })).toBe('/');
    expect(orgRedirect({ mode: 'org', session: org, pathname: '/t/t1' })).toBeNull();
  });

  it('strażnik tabletu: parowanie → profile → PIN; link parowania na świeżej instalacji', () => {
    expect(judgeRedirect({ mode: 'judge', session: empty, pathname: '/categories' })).toBe('/pair');
    expect(judgeRedirect({ mode: null, session: empty, pathname: '/pair' })).toBeNull();
    const device = { ...empty, device: 'd' };
    expect(judgeRedirect({ mode: 'judge', session: device, pathname: '/categories' })).toBe('/profiles');
    expect(judgeRedirect({ mode: 'judge', session: device, pathname: '/pin/j1' })).toBeNull();
    expect(judgeRedirect({ mode: 'judge', session: { ...device, judge: 'j' }, pathname: '/pair' })).toBe(
      '/categories',
    );
    expect(entryRoute(null)).toBe('/mode');
  });

  it('TC-COMPAT-008: pierwsze uruchomienie → SCR-SYS-01; organizator bez sesji → SCR-ORG-13', async () => {
    const first = await start('/', null);
    expect(first.getPathname()).toBe('/mode');
    await first.unmount();
    const org = await start('/', 'org');
    expect(org.getPathname()).toBe('/login');
    expect(org.getByTestId('route-SCR-ORG-13')).toBeOnTheScreen();
  });

  it('TC-COMPAT-008: deep link polechamp://pair?c=…&t=… otwiera SCR-JDG-06 z kodem', async () => {
    const r = await start('/pair?c=ABCD-1234&t=t1', 'judge');
    expect(r.getPathname()).toBe('/pair');
    expect(r.getSearchParams()).toEqual({ c: 'ABCD-1234', t: 't1' });
    expect(r.getByText('SCR-JDG-06 · ABCD-1234 · t1')).toBeOnTheScreen();
  });

  it('link resetu hasła działa bez sesji', async () => {
    const r = await start('/reset?token=abc', 'org');
    expect(r.getPathname()).toBe('/reset');
  });
});
