/* global API_URL, http, json, output, ACTION, EMAIL, PASSWORD, ID_t1 */
// Helper przepływów full/ (IMP-457): dane konta i identyfikatory przychodzą z orkiestratora jako zmienne.
function post(path, body, token) {
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  var res = http.post(API_URL + path, { headers: headers, body: JSON.stringify(body || {}) });
  if (res.status >= 400) throw new Error(path + ' → ' + res.status + ' ' + res.body);
  return json(res.body);
}

if (ACTION === 'pairing-code') {
  var token = post('/v1/auth/login', { email: EMAIL, password: PASSWORD }).accessToken;
  output.pairingCode = post('/v1/tournaments/' + ID_t1 + '/pairing-codes', {}, token).code;
} else {
  throw new Error('Nieznana akcja ' + ACTION);
}
