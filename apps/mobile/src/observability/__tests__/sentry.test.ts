import type { ErrorEvent } from '@sentry/react-native';
import { FILTERED } from '@polechamp/contracts';
import { scrubBreadcrumb, scrubEvent } from '../scrub';

describe('Sentry bez PII (IMP-218)', () => {
  it('TC-SEC-017 (mobile): nazwisko w okruszku i kontekście usunięte', () => {
    const event = {
      event_id: 'e1',
      type: undefined,
      message: 'Błąd zapisu',
      user: { id: 'u1', email: 'zztest@example.com', username: 'ZZTEST' },
      contexts: { entry: { fullName: 'ZZTEST Kowalska', startNumber: 47 } },
      breadcrumbs: [
        { category: 'ui.toast', message: 'Zapisano ocenę: ZZTEST Kowalska' },
        { category: 'navigation', data: { to: '/reset?token=sekret' } },
        { category: 'console', message: 'komentarz ZZTEST' },
      ],
    } as unknown as ErrorEvent;
    const scrubbed = scrubEvent(event);
    expect(JSON.stringify(scrubbed)).not.toMatch(/ZZTEST|zztest|sekret/);
    expect(scrubbed.user).toEqual({ id: 'u1' });
    expect(scrubbed.breadcrumbs?.[0]?.message).toBe(FILTERED);
    expect(scrubbed.breadcrumbs?.[1]?.data).toEqual({ to: `/reset?token=${FILTERED}` });
    expect(scrubbed.contexts?.entry).toEqual({ fullName: FILTERED, startNumber: 47 });
  });

  it('okruszki nawigacji zachowują treść bez sekretów', () => {
    expect(scrubBreadcrumb({ category: 'navigation', message: 'SCR-ORG-03' }).message).toBe('SCR-ORG-03');
  });
});
