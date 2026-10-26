/* global API_URL, http, json, output, ACTION, FIXTURE, TOURNAMENT, EMAIL */
// Helpery API dla przepływów Maestro (runScript, GraalJS): przygotowanie stanu przez `/__e2e/*`
// (API z E2E_HELPERS=1) i zwykłe trasy `/v1`. Wynik w `output.*` dla kolejnych kroków.
// Zmienne: API_URL (np. http://10.0.2.2:3000 z emulatora Androida), FIXTURE, ACTION.
var base = API_URL;

function post(path, body, token) {
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  var res = http.post(base + path, { headers: headers, body: JSON.stringify(body || {}) });
  if (res.status >= 400) throw new Error(path + ' → ' + res.status + ' ' + res.body);
  return res.body ? json(res.body) : {};
}

if (ACTION === 'seed') {
  post('/__e2e/reset');
  var seeded = post('/__e2e/seed/' + FIXTURE);
  output.email = seeded.email;
  output.password = seeded.password;
  output.ids = seeded.ids;
  output.pins = seeded.pins;
} else if (ACTION === 'pairing-code') {
  var login = post('/v1/auth/login', { email: output.email, password: output.password });
  var code = post('/v1/tournaments/' + output.ids[TOURNAMENT] + '/pairing-codes', {}, login.accessToken);
  output.pairingCode = code.code;
} else if (ACTION === 'last-email-code') {
  var mail = json(http.get(base + '/__e2e/emails/last?to=' + encodeURIComponent(EMAIL)).body);
  output.emailCode = mail.params && mail.params.code;
} else {
  throw new Error('Nieznana akcja ' + ACTION);
}
