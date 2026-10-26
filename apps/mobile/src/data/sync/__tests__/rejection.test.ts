import { SYNC_REJECTION_CODES } from '@polechamp/contracts';
import { createI18n } from '@polechamp/i18n';
import type { LocalDb } from '../../local/LocalDb';
import { ScoreSheetRepo } from '../../local/scoreSheets';
import { syncEvents, type SyncEvent } from '../events';
import { applyChanges } from '../pull';
import { pushOnce } from '../push';
import { countQueueRejections, handleRejections, planRejection } from '../RejectionHandler';
import { applySnapshot } from '../snapshot';
import { submitSheet } from '../submit';
import {
  fakeApi,
  fakeSyncServer,
  json,
  openTestDb,
  snapshotFixture,
  testClock,
  type Handler,
} from '../../../test-utils/sync';

const NOW = Date.parse('2026-10-26T10:00:00.000Z');
const SESSION = '0199c000-0000-7000-8000-000000000001';

describe('obsługa odrzuceń (IMP-357)', () => {
  let local: LocalDb;
  let events: SyncEvent[];
  const clock = testClock();

  beforeEach(async () => {
    local = openTestDb();
    await applySnapshot(local, snapshotFixture(), clock);
    events = [];
    syncEvents.subscribe((e) => events.push(e));
  });
  afterEach(() => {
    local.close();
    syncEvents.reset();
  });

  const startSession = (judgeId: string) =>
    local.tx((db) =>
      db.runSync(
        "INSERT INTO local_judge_session (id, judge_id, auth_mode, pin_version, started_at, last_activity_at) VALUES (?, ?, 'OFFLINE_PIN', 1, 'x', 'x')",
        `s-${judgeId}`,
        judgeId,
      ),
    );

  const submit = (judgeId: string, entryId: string, criteria = [{ criterionId: 'k1', valueTenths: 80 }]) =>
    submitSheet(
      local,
      {
        judgeId,
        judgeSessionId: SESSION,
        authMode: 'OFFLINE_PIN',
        categoryId: 'c1',
        entryId,
        criteria,
        penalties: [{ penaltyTypeId: 'p1', count: 1 }],
        comment: 'k',
        totalHundredths: 750,
      },
      NOW,
    );

  /** Push z odrzuceniem wszystkich mutacji kodem `code`, potem `RejectionHandler`. */
  async function rejectAll(code: string, extra?: Handler) {
    const server = fakeSyncServer();
    const fake = fakeApi(async (req) => {
      if (new URL(req.url).pathname === '/v1/sync/push') {
        const body = (await req.clone().json()) as { mutations: { mutationId: string }[] };
        body.mutations.forEach((m) => server.state.reject.set(m.mutationId, code));
        return server.handler(req);
      }
      return extra ? extra(req) : json({});
    });
    const deps = { api: fake.api, local, clock };
    const out = await pushOnce(deps);
    if (out.status !== 'ok') throw new Error(out.status);
    await handleRejections(deps, out.rejections);
    return fake.calls;
  }

  const sessionEnded = (judgeId: string) =>
    local.read.getFirstSync<{ end_reason: string | null }>(
      'SELECT end_reason FROM local_judge_session WHERE judge_id = ?',
      judgeId,
    )?.end_reason;

  it('tabela kod → baner, sesja i migawka; każdy kod ma tekst PL', () => {
    const t = createI18n().t;
    for (const code of SYNC_REJECTION_CODES) {
      const plan = planRejection(code);
      expect(plan.messageKey).toBe(`errors:${code}`);
      expect(t(plan.messageKey as never)).not.toBe(code);
    }
    expect(planRejection('PIN_VERSION_OUTDATED')).toMatchObject({
      banner: 'session',
      endSession: 'PIN_VERSION_OUTDATED',
    });
    expect(planRejection('JUDGE_SESSION_INVALID')).toMatchObject({
      banner: 'session',
      endSession: 'JUDGE_SESSION_INVALID',
    });
    expect(planRejection('JUDGE_INACTIVE')).toMatchObject({
      banner: 'session',
      endSession: 'JUDGE_INACTIVE',
    });
    expect(planRejection('STALE_REVISION')).toMatchObject({
      banner: 'form',
      endSession: null,
      snapshot: false,
    });
    expect(planRejection('SCHEMA_MISMATCH')).toMatchObject({ banner: 'form', snapshot: true });
    expect(planRejection('ENTRY_WITHDRAWN')).toMatchObject({ banner: 'form', endSession: null });
    expect(planRejection('CATEGORY_LOCKED')).toMatchObject({ banner: 'queue', endSession: null });
    expect(planRejection('TOURNAMENT_FINISHED')).toMatchObject({ banner: 'queue' });
  });

  it('TC-SYNC-007 / TC-E2E-JDG-025: 3 odrzucenia CATEGORY_LOCKED – ikony ostrzeżenia i baner kolejki', async () => {
    await startSession('jA');
    for (const e of ['e1', 'e2', 'e3']) await submit('jA', e);
    await rejectAll('CATEGORY_LOCKED');
    const sheets = ScoreSheetRepo.forJudge(local.read, 'jA').list('c1');
    expect(sheets.map((s) => [s.syncState, s.rejectCode])).toEqual(
      Array(3).fill(['REJECTED', 'CATEGORY_LOCKED']),
    );
    expect(countQueueRejections(local.read, 'jA', 'c1')).toBe(3);
    expect(createI18n().t('judge:rejectedBanner', { count: 3 })).toBe(
      '3 oceny nie zostały przyjęte – kategoria zablokowana',
    );
    expect(events.filter((e) => e.type === 'rejected')).toHaveLength(3);
    expect(sessionEnded('jA')).toBeNull();
  });

  it('TC-SYNC-008: przyjęcie po odblokowaniu – arkusz SYNCED po zmianie audience DEVICE', async () => {
    const { scoreSheetId } = await submit('jA', 'e1');
    await rejectAll('CATEGORY_LOCKED');
    await local.tx((db) =>
      applyChanges(
        db,
        {
          cursor: 20,
          hasMore: false,
          changes: [
            {
              seq: 20,
              entityType: 'score_sheet',
              op: 'U',
              entity: {
                id: scoreSheetId,
                scoreSheetId,
                judgeId: 'jA',
                categoryId: 'c1',
                entryId: 'e1',
                criteria: [{ criterionId: 'k1', value: 8 }],
                penalties: [],
                comment: 'k',
                revision: 1,
                total: 7.5,
                authMode: 'OFFLINE_PIN',
                updatedAt: '2026-10-26T11:00:00.000Z',
              },
            },
          ],
        },
        'x',
      ),
    );
    expect(ScoreSheetRepo.forJudge(local.read, 'jA').byEntry('e1')).toMatchObject({
      syncState: 'SYNCED',
      rejectCode: null,
      serverRevision: 1,
    });
    expect(countQueueRejections(local.read, 'jA')).toBe(0);
  });

  it('TC-SYNC-009: ENTRY_WITHDRAWN – „Zawodniczka wycofana” bez kończenia sesji', async () => {
    await startSession('jA');
    await submit('jA', 'e2');
    await rejectAll('ENTRY_WITHDRAWN');
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'rejected', code: 'ENTRY_WITHDRAWN', entryId: 'e2', banner: 'form' }),
    );
    expect(createI18n().t('errors:ENTRY_WITHDRAWN')).toBe('Zawodniczka wycofana');
    expect(sessionEnded('jA')).toBeNull();
  });

  it('TC-SYNC-010: JUDGE_INACTIVE kończy sesję z komunikatem o wyłączeniu profilu', async () => {
    await startSession('jC');
    await submit('jC', 'e1');
    await submit('jC', 'e2');
    await rejectAll('JUDGE_INACTIVE');
    expect(sessionEnded('jC')).toBe('JUDGE_INACTIVE');
    expect(events.filter((e) => e.type === 'judgeSessionEnded')).toEqual([
      { type: 'judgeSessionEnded', judgeId: 'jC', reason: 'JUDGE_INACTIVE' },
    ]);
    expect(createI18n().t('errors:JUDGE_INACTIVE')).toBe('Twój profil został wyłączony przez organizatora.');
  });

  it('TC-SYNC-011: PIN_VERSION_OUTDATED / JUDGE_SESSION_INVALID kończą sesję i wymagają PIN-u', async () => {
    await startSession('jB');
    await submit('jB', 'e1');
    await rejectAll('PIN_VERSION_OUTDATED');
    expect(sessionEnded('jB')).toBe('PIN_VERSION_OUTDATED');
    expect(ScoreSheetRepo.forJudge(local.read, 'jB').byEntry('e1')?.rejectCode).toBe('PIN_VERSION_OUTDATED');

    await startSession('jA');
    await submit('jA', 'e3');
    await rejectAll('JUDGE_SESSION_INVALID');
    expect(sessionEnded('jA')).toBe('JUDGE_SESSION_INVALID');
    expect(createI18n().t('errors:JUDGE_SESSION_INVALID')).toBe(
      'Sesja sędziego jest nieważna. Zaloguj się ponownie.',
    );
  });

  it('TC-SYNC-012: STALE_REVISION – stan do decyzji sędziego, świadome zatwierdzenie → nowa rewizja', async () => {
    const server = fakeSyncServer();
    const first = await submit('jA', 'e1');
    await local.tx((db) =>
      db.runSync('UPDATE local_score_sheet SET server_revision = 1 WHERE id = ?', first.scoreSheetId),
    );
    server.state.sheets.set(first.scoreSheetId, 2);
    const fake = fakeApi(server.handler);
    const deps = { api: fake.api, local, clock };
    // Mutacja zbudowana jeszcze z baseRevision 0 → rewizja serwera 2 nie pasuje.
    const out = await pushOnce(deps);
    if (out.status !== 'ok') throw new Error(out.status);
    await handleRejections(deps, out.rejections);
    expect(ScoreSheetRepo.forJudge(local.read, 'jA').byEntry('e1')?.rejectCode).toBe('STALE_REVISION');
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'rejected', code: 'STALE_REVISION', banner: 'form' }),
    );
    expect(server.state.processed.size).toBe(0);

    // „Pokaż aktualną” pobiera rev 2; ponowne zatwierdzenie → baseRevision 2 → rev 3.
    await local.tx((db) =>
      db.runSync('UPDATE local_score_sheet SET server_revision = 2 WHERE id = ?', first.scoreSheetId),
    );
    await submitSheet(
      local,
      {
        judgeId: 'jA',
        judgeSessionId: SESSION,
        authMode: 'OFFLINE_PIN',
        categoryId: 'c1',
        entryId: 'e1',
        criteria: [{ criterionId: 'k1', valueTenths: 90 }],
        penalties: [],
        comment: '',
        totalHundredths: 900,
      },
      NOW,
    );
    await pushOnce(deps);
    expect(server.state.sheets.get(first.scoreSheetId)).toBe(3);
    expect(ScoreSheetRepo.forJudge(local.read, 'jA').byEntry('e1')).toMatchObject({
      syncState: 'SYNCED',
      serverRevision: 3,
    });
  });

  it('TC-SYNC-017: SCHEMA_MISMATCH – migawka i szkic zmapowany po criterion_id', async () => {
    await submit('jA', 'e1', [
      { criterionId: 'k1', valueTenths: 80 },
      { criterionId: 'k2', valueTenths: 60 },
    ]);
    const changed = snapshotFixture({ cursor: 40 });
    changed.categories[0]!.criteria = [
      changed.categories[0]!.criteria[0]!,
      { id: 'k9', name: 'Nowe', scaleMax: 10, step: 0.5, weight: 1, position: 2 },
    ];
    const calls = await rejectAll('SCHEMA_MISMATCH', () => json(changed));
    expect(calls.map((c) => c.path)).toEqual(['/v1/sync/push', '/v1/sync/snapshot']);
    expect(ScoreSheetRepo.forJudge(local.read, 'jA').draft('e1')).toEqual({
      criteria: { k1: 80 },
      penalties: { p1: 1 },
      comment: 'k',
    });
    expect(events).toContainEqual({ type: 'formOutdated', judgeId: 'jA', entryId: 'e1' });
    expect(local.read.getFirstSync('SELECT cursor FROM sync_meta')).toEqual({ cursor: 40 });
  });
});
