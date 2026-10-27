// Tablety (IMP-461, TC-SYNC-013): `sync/push` oceny, `sync/changes`, heartbeat co 30 s.
import { check } from 'k6';
import { get, post, submitMutation } from './lib.js';

/** Stan arkuszy VU: klucz `${entry}:${judge}` → { scoreSheetId, revision }. */
const sheets = new Map();
const cursors = {};
const lastBeat = {};

export function tablet(data) {
  const t = data[(__VU + __ITER) % data.length];
  const judge = t.judges[Math.floor(Math.random() * t.judges.length)];
  const c = t.categories[Math.floor(Math.random() * t.categories.length)];
  const entryId = c.entries[Math.floor(Math.random() * c.entries.length)];
  const key = `${entryId}:${judge.id}`;
  const prev = sheets.get(key);
  const m = submitMutation(judge, c, entryId, prev ? prev.revision : 0, prev ? prev.scoreSheetId : undefined);
  const res = post('/v1/sync/push', { deviceTime: new Date().toISOString(), mutations: [m] }, t.device, {
    kind: 'write',
  });
  const result = res.status === 200 ? res.json().results[0] : null;
  check(res, { 'push 200': (r) => r.status === 200 });
  check(result, { 'ocena przyjęta lub odrzucona regułą': (r) => r !== null && r.status !== 'RETRY' });
  if (result && result.status === 'APPLIED')
    sheets.set(key, { scoreSheetId: result.scoreSheetId, revision: result.revision });
  else if (result && result.code === 'STALE_REVISION') sheets.delete(key);

  const since = cursors[t.tournamentId] || 0;
  const changes = get(`/v1/sync/changes?since=${since}`, t.device, { kind: 'read' });
  check(changes, { 'changes 200': (r) => r.status === 200 });
  if (changes.status === 200) cursors[t.tournamentId] = changes.json().cursor;

  if (!lastBeat[t.device] || Date.now() - lastBeat[t.device] > 30_000) {
    lastBeat[t.device] = Date.now();
    post(
      '/v1/devices/me/heartbeat',
      { pendingMutations: 0, lastSyncCursor: since, batteryLevel: 0.8, activeJudgeId: judge.id },
      t.device,
      { kind: 'write' },
    );
  }
}
