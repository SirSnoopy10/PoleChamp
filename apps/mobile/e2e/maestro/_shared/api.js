/* global API_URL, http, json, output, ACTION, FIXTURE, TOURNAMENT, CATEGORY, ENTRY, JUDGE, NOTE, EMAIL, DEVICE_NAME */
// Helpery API dla przepływów Maestro (runScript, GraalJS): przygotowanie stanu przez `/__e2e/*`
// (API z E2E_HELPERS=1) i zwykłe trasy `/v1`. Wynik w `output.*` dla kolejnych kroków.
// Zmienne: API_URL (np. http://10.0.2.2:3000 z emulatora Androida), ACTION i parametry akcji
// (klucze seedu: TOURNAMENT=t1, CATEGORY=c3, ENTRY=u26, JUDGE=jA).
var base = API_URL;

function call(method, path, body, token) {
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  var opts = { headers: headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  var res =
    method === 'GET'
      ? http.get(base + path, opts)
      : http.request(base + path, Object.assign({ method: method }, opts));
  if (res.status >= 400) throw new Error(method + ' ' + path + ' → ' + res.status + ' ' + res.body);
  return res.body ? json(res.body) : {};
}
var post = function (path, body, token) {
  return call('POST', path, body || {}, token);
};

/** UUID v7 (znacznik czasu ms + losowe bity) – wymagany przez kontrakt mutacji. */
function uuid() {
  var h = '0123456789abcdef';
  var ts = Date.now().toString(16);
  while (ts.length < 12) ts = '0' + ts;
  var r = '';
  for (var i = 0; i < 20; i++) r += h[Math.floor(Math.random() * 16)];
  return (
    ts.slice(0, 8) +
    '-' +
    ts.slice(8, 12) +
    '-7' +
    r.slice(0, 3) +
    '-' +
    h[8 + Math.floor(Math.random() * 4)] +
    r.slice(3, 6) +
    '-' +
    r.slice(6, 18)
  );
}

function orgToken() {
  if (!output.orgToken)
    output.orgToken = post('/v1/auth/login', { email: output.email, password: output.password }).accessToken;
  return output.orgToken;
}

/** Syntetyczny tablet (urządzenie spoza testu) z zalogowanym sędzią – ocena wysyłana przez `sync/push`. */
function syntheticJudge(tournamentKey, judgeKey) {
  output.synthetic = output.synthetic || {};
  var key = tournamentKey + ':' + judgeKey;
  if (output.synthetic[key]) return output.synthetic[key];
  var code = post('/v1/tournaments/' + output.ids[tournamentKey] + '/pairing-codes', {}, orgToken()).code;
  var paired = post('/v1/devices/pair', {
    code: code,
    deviceName: typeof DEVICE_NAME !== 'undefined' ? DEVICE_NAME : 'Tablet stół 2',
    platform: 'android',
    model: 'E2E',
    osVersion: '14',
    appVersion: '1.0.0',
  });
  var device = post('/v1/devices/token', {
    deviceId: paired.deviceId,
    deviceSecret: paired.deviceSecret,
  }).deviceToken;
  var session = post(
    '/v1/judge-sessions',
    { judgeId: output.ids[judgeKey], pin: output.pins[judgeKey] },
    device,
  );
  output.synthetic[key] = { device: device, sessionId: session.sessionId };
  return output.synthetic[key];
}

if (ACTION === 'seed') {
  post('/__e2e/reset');
  var seeded = post('/__e2e/seed/' + FIXTURE);
  output.email = seeded.email;
  output.password = seeded.password;
  output.ids = seeded.ids;
  output.pins = seeded.pins;
  output.orgToken = null;
  output.synthetic = {};
} else if (ACTION === 'pairing-code') {
  output.pairingCode = post(
    '/v1/tournaments/' + output.ids[TOURNAMENT] + '/pairing-codes',
    {},
    orgToken(),
  ).code;
} else if (ACTION === 'submit') {
  // Ocena sędziego JUDGE dla startu ENTRY w kategorii CATEGORY: wszystkie noty = NOTE.
  var judge = syntheticJudge(TOURNAMENT, JUDGE);
  var category = call('GET', '/v1/categories/' + output.ids[CATEGORY], undefined, orgToken());
  var note = Number(typeof NOTE !== 'undefined' ? NOTE : 8);
  var res = post(
    '/v1/sync/push',
    {
      deviceTime: new Date().toISOString(),
      mutations: [
        {
          mutationId: uuid(),
          type: 'SUBMIT_SCORE_SHEET',
          judgeId: output.ids[JUDGE],
          judgeSessionId: judge.sessionId,
          authMode: 'ONLINE_PIN',
          createdAt: new Date().toISOString(),
          payload: {
            scoreSheetId: uuid(),
            categoryId: output.ids[CATEGORY],
            entryId: output.ids[ENTRY],
            baseRevision: 0,
            criteria: category.criteria.map(function (k) {
              return { criterionId: k.id, value: note };
            }),
            penalties: [],
            comment: '',
            clientTotal: category.criteria.reduce(function (sum, k) {
              return sum + note * k.weight;
            }, 0),
          },
        },
      ],
    },
    judge.device,
  );
  output.pushStatus = res.results[0].status;
} else if (ACTION === 'lock') {
  post('/v1/categories/' + output.ids[CATEGORY] + '/lock', { force: true }, orgToken());
} else if (ACTION === 'unlock') {
  post('/v1/categories/' + output.ids[CATEGORY] + '/unlock', { reason: 'E2E' }, orgToken());
} else if (ACTION === 'start-category') {
  post('/v1/categories/' + output.ids[CATEGORY] + '/start', {}, orgToken());
} else if (ACTION === 'add-entry') {
  // Nowa zawodniczka nr ENTRY (liczba) w kategorii CATEGORY.
  post(
    '/v1/categories/' + output.ids[CATEGORY] + '/entries',
    { startNumber: Number(ENTRY), fullName: 'Julia Kamińska' },
    orgToken(),
  );
} else if (ACTION === 'judge-on-other-device') {
  // Logowanie sędziego JUDGE na innym tablecie – zastępuje sesję na tablecie w teście.
  syntheticJudge(TOURNAMENT, JUDGE);
} else if (ACTION === 'reset-pin') {
  var reset = post('/v1/judges/' + output.ids[JUDGE] + '/pin/reset', {}, orgToken());
  output.pins[JUDGE] = reset.pin;
} else if (ACTION === 'revoke-device') {
  var devices = call(
    'GET',
    '/v1/tournaments/' + output.ids[TOURNAMENT] + '/devices',
    undefined,
    orgToken(),
  ).items;
  var target = devices.filter(function (d) {
    return d.name === (typeof DEVICE_NAME !== 'undefined' ? DEVICE_NAME : 'Tablet stół 1');
  })[0];
  call('DELETE', '/v1/devices/' + target.id, undefined, orgToken());
} else if (ACTION === 'finish-tournament') {
  var t = call('GET', '/v1/tournaments/' + output.ids[TOURNAMENT], undefined, orgToken());
  var headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + orgToken(),
    'If-Match': 'W/"' + t.version + '"',
  };
  http.request(base + '/v1/tournaments/' + output.ids[TOURNAMENT] + '/finish', {
    method: 'POST',
    headers: headers,
    body: '{}',
  });
} else if (ACTION === 'last-email-code') {
  var mail = call('GET', '/__e2e/emails/last?to=' + encodeURIComponent(EMAIL));
  output.emailCode = mail.params && mail.params.code;
} else {
  throw new Error('Nieznana akcja ' + ACTION);
}
