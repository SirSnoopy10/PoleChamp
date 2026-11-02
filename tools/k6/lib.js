// Wspólne helpery k6 2.3 (IMP-461): przygotowanie danych przez API E2E staging (`E2E_HELPERS=1`),
// tokeny organizatorów, syntetyczne tablety z zalogowanymi sędziami, mutacje `sync/push`.
import http from 'k6/http';

export const API = __ENV.API_URL || 'http://localhost:3000';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function post(path, body, token, tags) {
  const headers = token ? { ...JSON_HEADERS, Authorization: `Bearer ${token}` } : JSON_HEADERS;
  return http.post(`${API}${path}`, JSON.stringify(body ?? {}), { headers, tags });
}

export function get(path, token, tags) {
  return http.get(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, tags });
}

/** UUID v7 (kontrakt mutacji). */
export function uuid7() {
  const hex = '0123456789abcdef';
  const ts = Date.now().toString(16).padStart(12, '0');
  let r = '';
  for (let i = 0; i < 20; i++) r += hex[Math.floor(Math.random() * 16)];
  return `${ts.slice(0, 8)}-${ts.slice(8, 12)}-7${r.slice(0, 3)}-${hex[8 + Math.floor(Math.random() * 4)]}${r.slice(3, 6)}-${r.slice(6, 18)}`;
}

/**
 * Turnieje syntetyczne: każdy `FX-SEED` to konto z trwającym turniejem t1 (8 kategorii, 61 startów, 5 sędziów).
 * Dla każdego turnieju jeden tablet z sędziami jA…jE zalogowanymi online.
 */
export function prepare(tournaments) {
  post('/__e2e/reset');
  const out = [];
  for (let i = 0; i < tournaments; i++) {
    // Limity parowania i logowania liczone per IP – generator k6 ma jeden adres.
    if (i % 10 === 9) post('/__e2e/reset');
    const seed = post('/__e2e/seed/FX-SEED').json();
    const org = post('/v1/auth/login', { email: seed.email, password: seed.password }).json().accessToken;
    const code = post(`/v1/tournaments/${seed.ids.t1}/pairing-codes`, {}, org).json().code;
    const paired = post('/v1/devices/pair', {
      code,
      deviceName: `k6 ${i + 1}`,
      platform: 'android',
      model: 'k6',
      osVersion: '14',
      appVersion: '1.0.0',
    }).json();
    const device = post('/v1/devices/token', {
      deviceId: paired.deviceId,
      deviceSecret: paired.deviceSecret,
    }).json().deviceToken;
    const judges = ['jA', 'jB', 'jC', 'jD', 'jE'].map((key) => {
      const s = post('/v1/judge-sessions', { judgeId: seed.ids[key], pin: seed.pins[key] }, device).json();
      return { id: seed.ids[key], sessionId: s.sessionId, token: s.judgeToken };
    });
    const categories = ['c3', 'c4', 'c5'].map((c) => {
      const details = get(`/v1/categories/${seed.ids[c]}`, org).json();
      const entries = get(`/v1/categories/${seed.ids[c]}/entries`, org)
        .json()
        .items.map((e) => e.id);
      return { id: seed.ids[c], criteria: details.criteria, entries };
    });
    out.push({ tournamentId: seed.ids.t1, org, device, judges, categories });
  }
  return out;
}

/** Mutacja oceny (noty 5–9,5, krok 0,5) z `baseRevision` z poprzedniej odpowiedzi. */
export function submitMutation(judge, category, entryId, baseRevision, scoreSheetId) {
  const criteria = category.criteria.map((k) => ({
    criterionId: k.id,
    value: 5 + Math.floor(Math.random() * 10) / 2,
  }));
  return {
    mutationId: uuid7(),
    type: 'SUBMIT_SCORE_SHEET',
    judgeId: judge.id,
    judgeSessionId: judge.sessionId,
    authMode: 'ONLINE_PIN',
    createdAt: new Date().toISOString(),
    payload: {
      scoreSheetId: scoreSheetId ?? uuid7(),
      categoryId: category.id,
      entryId,
      baseRevision,
      criteria,
      penalties: [],
      comment: '',
      clientTotal: category.criteria.reduce((s, k, i) => s + criteria[i].value * k.weight, 0),
    },
  };
}

/** Profile obciążenia: 1× (NFR-802) i 2× (NFR-804, przed wydaniem 1.0). */
export const PROFILES = {
  // Limit 120 zapytań/min na token: 2 oceny/s × (push + changes) = 240/min na 5 tabletów.
  smoke: { tournaments: 5, ws: 20, scoresPerSecond: 2, duration: '1m' },
  '1x': { tournaments: 100, ws: 3000, scoresPerSecond: 50, duration: '60m' },
  '2x': { tournaments: 200, ws: 6000, scoresPerSecond: 100, duration: '30m' },
};
export const PROFILE = PROFILES[__ENV.PROFILE || 'smoke'];
