// Brute force kodu parowania (IMP-404, TC-SEC-015, FR-504): 1 000 losowych kodów z jednego IP.
// Oczekiwane: limit 10 / 10 min / IP (429), żaden kod nie zostaje przyjęty. Przestrzeń 31^8 ≈ 8,5·10^11 przy
// ważności 10 min – P(trafienia) < 10^-8 także przy wielu IP (WAF).
// `k6 run -e API_URL=… tools/security/k6/bruteforce-pairing.js`
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const API = __ENV.API_URL;
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // PAIRING_ALPHABET z @polechamp/contracts (31 znaków)
const accepted = new Counter('pairing_accepted');
const notLimited = new Counter('bruteforce_accepted_after_limit');

export const options = {
  scenarios: { codes: { executor: 'shared-iterations', vus: 5, iterations: 1000 } },
  thresholds: { pairing_accepted: ['count==0'], bruteforce_accepted_after_limit: ['count<=5'] },
};

const randomCode = () => Array.from({ length: 8 }, () => ALPHABET[Math.floor(Math.random() * 31)]).join('');

export default function () {
  const res = http.post(
    `${API}/v1/devices/pair`,
    JSON.stringify({
      code: randomCode(),
      deviceName: 'Tablet testowy',
      platform: 'android',
      model: 'k6',
      osVersion: '14',
      appVersion: '1.0.0',
    }),
    { headers: { 'content-type': 'application/json' } },
  );
  if (res.status < 300) accepted.add(1);
  if (__ITER >= 10 && res.status !== 429) notLimited.add(1);
  check(res, { 'kod odrzucony': (r) => r.status >= 400 });
}
