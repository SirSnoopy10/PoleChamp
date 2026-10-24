import { uuidv7 } from '../../src/common/ids.js';
import type { Call } from './http.js';
import type { organizer } from './scenario.js';
import { judgeLogin, pairTablet } from './tablet.js';

type Org = ReturnType<typeof organizer>;
type AuthMode = 'ONLINE_PIN' | 'OFFLINE_PIN';

const now = () => new Date().toISOString();

/** Mutacje `sync/push` w kształcie z 03-api §5.1 (identyfikatory UUIDv7 jak na tablecie). */
export const mutation = {
  sessionStarted: (judgeId: string, pinVersion = 1, judgeSessionId = uuidv7()) => ({
    mutationId: uuidv7(),
    type: 'JUDGE_SESSION_STARTED' as const,
    judgeId,
    authMode: 'OFFLINE_PIN' as AuthMode,
    createdAt: now(),
    payload: { judgeSessionId, pinVersion },
  }),
  sessionEnded: (judgeId: string, judgeSessionId: string) => ({
    mutationId: uuidv7(),
    type: 'JUDGE_SESSION_ENDED' as const,
    judgeId,
    authMode: 'OFFLINE_PIN' as AuthMode,
    createdAt: now(),
    payload: { judgeSessionId },
  }),
  pinAttempts: (judgeId: string, failedCount: number) => ({
    mutationId: uuidv7(),
    type: 'PIN_ATTEMPTS_REPORT' as const,
    judgeId,
    authMode: 'OFFLINE_PIN' as AuthMode,
    createdAt: now(),
    payload: { failedCount, lockedUntil: null },
  }),
  submit: (input: {
    judgeId: string;
    judgeSessionId: string;
    categoryId: string;
    entryId: string;
    criteria: { id: string }[];
    notes?: number[];
    penalties?: { penaltyTypeId: string; count: number }[];
    baseRevision?: number;
    clientTotal?: number;
    scoreSheetId?: string;
    authMode?: AuthMode;
    createdAt?: string;
    comment?: string;
  }) => ({
    mutationId: uuidv7(),
    type: 'SUBMIT_SCORE_SHEET' as const,
    judgeId: input.judgeId,
    judgeSessionId: input.judgeSessionId,
    authMode: input.authMode ?? 'ONLINE_PIN',
    createdAt: input.createdAt ?? now(),
    payload: {
      scoreSheetId: input.scoreSheetId ?? uuidv7(),
      categoryId: input.categoryId,
      entryId: input.entryId,
      baseRevision: input.baseRevision ?? 0,
      criteria: input.criteria.map((c, i) => ({ criterionId: c.id, value: input.notes?.[i] ?? 5 })),
      penalties: input.penalties ?? [],
      comment: input.comment ?? '',
      clientTotal: input.clientTotal ?? 0,
    },
  }),
};

export type AnyMutation = ReturnType<(typeof mutation)[keyof typeof mutation]>;

export const push = (call: Call, token: string, mutations: unknown[], deviceTime = now()) =>
  call('POST', '/v1/sync/push', { token, body: { deviceTime, mutations } });

/**
 * Kategoria w trakcie: turniej, sędziowie, kategoria Pole Sport (5 kryteriów), starty, start kategorii,
 * sparowany tablet i sędzia jA zalogowany online (sesja ONLINE_PIN).
 */
export async function runningCategory(
  call: Call,
  org: Org,
  options: { judges?: string[]; entries?: number[] } = {},
) {
  const t = await org.tournament();
  const judges = [];
  for (const name of options.judges ?? ['Katarzyna Nowak', 'Ewa Zielińska'])
    judges.push(await org.judge(t.id, name));
  const c = await org.category(t.id);
  const entries = [];
  for (const n of options.entries ?? [44, 45, 46]) entries.push(await org.entry(c.id, n));
  const started = await org.req('POST', `/v1/categories/${c.id}/start`);
  if (started.status !== 200) throw new Error(`start kategorii: ${JSON.stringify(started.body)}`);
  const tablet = await pairTablet(call, org, t.id);
  const jA = judges[0]!;
  const session = await judgeLogin(call, tablet.token, jA.id, jA.pin);
  return { t, c, judges, jA, entries, tablet, session };
}
