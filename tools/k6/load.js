// Test obciążenia API (IMP-461): TC-PERF-002, TC-PERF-011 (profil 1x), TC-PERF-012 (2x), TC-SYNC-013.
// `k6 run -e API_URL=https://staging… -e PROFILE=1x tools/k6/load.js` (lub `tools/k6/run.sh staging 1x`).
import { organizer } from './organizer.js';
import { PROFILE, prepare } from './lib.js';
import { tablet } from './tablets.js';
import { realtime } from './ws.js';

export { organizer, tablet, realtime };

export const options = {
  setupTimeout: '30m',
  scenarios: {
    // Odczyty organizatorów – 1 aktywny organizator na turniej.
    organizer: {
      executor: 'constant-vus',
      exec: 'organizer',
      vus: PROFILE.tournaments,
      duration: PROFILE.duration,
    },
    // Oceny ze stałą częstością (50/s w 1x) – push + changes + heartbeat.
    tablets: {
      executor: 'constant-arrival-rate',
      exec: 'tablet',
      rate: PROFILE.scoresPerSecond,
      timeUnit: '1s',
      duration: PROFILE.duration,
      preAllocatedVUs: Math.max(10, PROFILE.scoresPerSecond * 2),
    },
    // Połączenia WS narastające do docelowej liczby i utrzymywane.
    realtime: {
      executor: 'ramping-vus',
      exec: 'realtime',
      startVUs: 0,
      stages: [
        { duration: '5m', target: PROFILE.ws },
        { duration: PROFILE.duration, target: PROFILE.ws },
      ],
    },
  },
  thresholds: {
    // NFR-102: odczyt p95 ≤ 300 ms, zapis (z przeliczeniem rankingu) p95 ≤ 500 ms; 5xx < 0,1% (1x).
    'http_req_duration{kind:read}': ['p(95)<300'],
    'http_req_duration{kind:write}': ['p(95)<500'],
    http_req_failed: [__ENV.PROFILE === '2x' ? 'rate<0.01' : 'rate<0.001'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  return prepare(PROFILE.tournaments);
}
