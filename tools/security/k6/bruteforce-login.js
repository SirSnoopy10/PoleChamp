// Brute force logowania (IMP-404, TC-SEC-013): 100 prób na jedno konto i 100 prób z jednego IP na różne konta.
// `k6 run -e API_URL=https://api.staging… -e EMAIL=<konto testowe> tools/security/k6/bruteforce-login.js`
// Oczekiwane: blokada konta po 5 (423 ACCOUNT_LOCKED lub 429), limit IP po 20 / 15 min (429), WAF blokuje zalew.
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const API = __ENV.API_URL;
const accepted = new Counter('bruteforce_accepted_after_limit');

export const options = {
  scenarios: {
    account: { executor: 'shared-iterations', exec: 'account', vus: 1, iterations: 100 },
    ip: { executor: 'shared-iterations', exec: 'ip', vus: 1, iterations: 100, startTime: '30s' },
  },
  thresholds: { bruteforce_accepted_after_limit: ['count==0'] },
};

const login = (email) =>
  http.post(`${API}/v1/auth/login`, JSON.stringify({ email, password: `zle-haslo-${__ITER}` }), {
    headers: { 'content-type': 'application/json' },
  });

export function account() {
  const res = login(__ENV.EMAIL);
  if (__ITER >= 5 && res.status === 401) accepted.add(1);
  check(res, { 'po 5 próbach blokada (423/429)': (r) => __ITER < 5 || [423, 429].includes(r.status) });
}

export function ip() {
  const res = login(`bf-${__ITER}-${Date.now()}@example.com`);
  if (__ITER >= 20 && res.status === 401) accepted.add(1);
  check(res, { 'po 20 próbach z IP – 429/403 WAF': (r) => __ITER < 20 || [429, 403].includes(r.status) });
}
