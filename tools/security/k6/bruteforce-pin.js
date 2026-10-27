// Brute force PIN-u (IMP-404, TC-SEC-014, ADR-005): tokenem sparowanego tabletu testowego próby PIN-ów dla
// jednego profilu (blokada globalna po 10) i wielu profili (blokada urządzenia po 30 / 10 min), bez tokenu – 401.
// `k6 run -e API_URL=… -e DEVICE_TOKEN=… -e JUDGE_IDS=id1,id2,id3,id4 tools/security/k6/bruteforce-pin.js`
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const API = __ENV.API_URL;
const JUDGES = (__ENV.JUDGE_IDS || '').split(',').filter(Boolean);
const accepted = new Counter('bruteforce_accepted_after_limit');

export const options = {
  scenarios: {
    single: { executor: 'shared-iterations', exec: 'single', vus: 1, iterations: 15 },
    many: { executor: 'shared-iterations', exec: 'many', vus: 1, iterations: 40, startTime: '20s' },
    anonymous: { executor: 'shared-iterations', exec: 'anonymous', vus: 1, iterations: 5 },
  },
  thresholds: { bruteforce_accepted_after_limit: ['count==0'] },
};

const attempt = (judgeId, token) =>
  http.post(`${API}/v1/judge-sessions`, JSON.stringify({ judgeId, pin: String(1000 + __ITER).slice(-4) }), {
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });

export function single() {
  const res = attempt(JUDGES[0], __ENV.DEVICE_TOKEN);
  if (__ITER >= 10 && res.status === 401) accepted.add(1);
  check(res, { 'po 10 błędach PIN zablokowany': (r) => __ITER < 10 || r.status === 423 || r.status === 429 });
}

export function many() {
  const res = attempt(JUDGES[1 + (__ITER % (JUDGES.length - 1))], __ENV.DEVICE_TOKEN);
  if (__ITER >= 30 && ![423, 429].includes(res.status)) accepted.add(1);
  check(res, { 'po 30 błędach urządzenie zablokowane': (r) => __ITER < 30 || [423, 429].includes(r.status) });
}

export function anonymous() {
  check(attempt(JUDGES[0]), { 'bez tokenu urządzenia – 401': (r) => r.status === 401 });
}
