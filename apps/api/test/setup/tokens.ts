import { judgeLogin, pairTablet } from '../support/tablet.js';
import { type Call, registerAndLogin } from '../support/http.js';
import { organizer } from '../support/scenario.js';

/** Konteksty tokenów TC-AUTHZ (05-bezpieczenstwo §4.1, IMP-451). */
export const AUTH_CONTEXTS = [
  'none',
  'orgOwner',
  'orgOther',
  'device',
  'deviceOther',
  'deviceRevoked',
  'judge',
  'judgeOther',
] as const;
export type AuthContext = (typeof AUTH_CONTEXTS)[number];

export type AuthWorld = Awaited<ReturnType<typeof authWorld>>;

/**
 * Dwa konta z turniejami (FX-ORG-OTHER), tablety, zalogowani sędziowie i tablet unieważniony.
 * Zasoby właściciela (`ids`) są celem żądań; konteksty „other” należą do drugiego organizatora.
 */
export async function authWorld(call: Call) {
  const owner = organizer(call, (await registerAndLogin(call)).accessToken);
  const other = organizer(call, (await registerAndLogin(call)).accessToken);

  const t = await owner.tournament();
  const judge = await owner.judge(t.id, 'Katarzyna Nowak');
  const c = await owner.category(t.id);
  const entry = await owner.entry(c.id, 47);
  await owner.req('POST', `/v1/categories/${c.id}/start`);
  const tablet = await pairTablet(call, owner, t.id);
  const revoked = await pairTablet(call, owner, t.id, 'Tablet unieważniony');
  await owner.req('DELETE', `/v1/devices/${revoked.deviceId}`);
  const session = await judgeLogin(call, tablet.token, judge.id, judge.pin);

  const ot = await other.tournament({ name: 'Turniej innego organizatora' });
  const otherJudge = await other.judge(ot.id, 'Ewa Zielińska');
  const otherTablet = await pairTablet(call, other, ot.id, 'Tablet obcy');
  const otherSession = await judgeLogin(call, otherTablet.token, otherJudge.id, otherJudge.pin);

  const tokens: Record<AuthContext, string | undefined> = {
    none: undefined,
    orgOwner: owner.token,
    orgOther: other.token,
    device: tablet.token,
    deviceOther: otherTablet.token,
    deviceRevoked: revoked.token,
    judge: session.judgeToken,
    judgeOther: otherSession.judgeToken,
  };
  return {
    owner,
    other,
    tokens,
    tablet,
    ids: {
      tournamentId: t.id,
      categoryId: c.id,
      criterionId: c.criteria[0]!.id,
      penaltyTypeId: c.penaltyTypes[0]!.id,
      entryId: entry.id,
      judgeId: judge.id,
      judgePin: judge.pin,
      deviceId: tablet.deviceId,
      judgeSessionId: session.sessionId,
      otherTournamentId: ot.id,
      otherJudgeId: otherJudge.id,
    },
  };
}
