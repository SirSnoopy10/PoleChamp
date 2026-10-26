import type { ErrorEvent } from '@sentry/react-native';
import { scrubEvent } from '../../../observability/scrub';
import { storage } from '../../../storage/mmkv';
import { createSupportGesture, SUPPORT_TAPS } from '../diagExport';
import { DIAG_CAPACITY, diagLog, type DiagEntry } from '../diagLog';

describe('dziennik diagnostyczny (IMP-359)', () => {
  afterEach(() => diagLog.clear());

  it('bufor cykliczny 1 000 wpisów w MMKV', () => {
    for (let i = 0; i < DIAG_CAPACITY + 5; i++) diagLog.add({ event: 'push', status: 'ok', pending: i }, i);
    const entries = diagLog.entries();
    expect(entries).toHaveLength(DIAG_CAPACITY);
    expect(entries[0]?.pending).toBe(5);
    expect(JSON.parse(storage.getString('sync.diag') ?? '[]')).toHaveLength(DIAG_CAPACITY);
    expect(diagLog.tail(100)).toHaveLength(100);
  });

  it('TC-SEC-017: brak PII – treść spoza wzorców nie trafia do dziennika ani Sentry', () => {
    const marker = 'ZZTEST Kowalska';
    diagLog.add({
      event: 'rejected',
      status: marker,
      code: `CATEGORY_LOCKED ${marker}`,
      mutationId: marker,
      ...({ fullName: marker, comment: marker, pin: '1234', token: 'Bearer abc' } as object),
    } as Omit<DiagEntry, 'at'>);
    diagLog.add({
      event: 'push',
      status: 'retry',
      code: 'NETWORK',
      mutationId: '0199c000-0000-7000-8000-000000000001',
      http: 503,
    });
    const text = diagLog.toText();
    for (const s of [marker, '1234', 'Bearer']) expect(text).not.toContain(s);
    expect(diagLog.entries()[0]).toEqual({
      at: expect.any(String),
      event: 'rejected',
      status: 'other',
      code: 'OTHER',
    });
    expect(text).toContain('0199c000-0000-7000-8000-000000000001');

    const event = scrubEvent({ type: undefined, message: 'błąd' } as ErrorEvent);
    expect(event.extra?.syncDiag).toHaveLength(2);
    expect(JSON.stringify(event)).not.toContain(marker);
  });

  it('ukryty gest wsparcia: 5 tapnięć w 3 s', () => {
    let t = 0;
    const unlock = jest.fn();
    const tap = createSupportGesture(unlock, () => t);
    for (let i = 0; i < SUPPORT_TAPS - 1; i++) tap();
    t = 5000;
    tap();
    expect(unlock).not.toHaveBeenCalled();
    for (let i = 0; i < SUPPORT_TAPS - 1; i++) tap();
    expect(unlock).toHaveBeenCalledTimes(1);
  });
});
