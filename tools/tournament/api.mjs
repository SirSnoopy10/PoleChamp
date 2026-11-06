#!/usr/bin/env node
// Pomocnik API organizatora do próby turnieju: weryfikacja stanu po akcjach w aplikacji i dane zbiorcze.
// Token trzymany w .rc/org-token.json (logowanie ma limit prób – nie logujemy się przy każdym wywołaniu).
//
//   node tools/tournament/api.mjs login <email> <hasło>
//   node tools/tournament/api.mjs get <ścieżka>               np. /v1/tournaments
//   node tools/tournament/api.mjs post|patch|delete <ścieżka> [json] [If-Match]
//   node tools/tournament/api.mjs mail <email>               – ostatni e-mail z Mailpit (temat + treść)
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const API = process.env.RC_API ?? 'http://localhost:3000';
const MAILPIT = process.env.RC_MAILPIT ?? 'http://localhost:8025';
const TOKEN_FILE = resolve(process.env.RC_TOKEN ?? '.rc/org-token.json');
const [cmd, ...args] = process.argv.slice(2);

const save = (t) => {
  mkdirSync(dirname(TOKEN_FILE), { recursive: true });
  writeFileSync(TOKEN_FILE, JSON.stringify(t, null, 2));
};
const load = () => (existsSync(TOKEN_FILE) ? JSON.parse(readFileSync(TOKEN_FILE, 'utf8')) : null);

async function call(method, path, body, ifMatch, retry = true) {
  const t = load();
  // Fastify odrzuca `content-type: application/json` z pustą treścią (DELETE, POST bez body).
  const headers = { 'idempotency-key': randomUUID() };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (t?.accessToken) headers.authorization = `Bearer ${t.accessToken}`;
  if (ifMatch) headers['if-match'] = ifMatch;
  const res = await fetch(API + path, {
    method: method.toUpperCase(),
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401 && retry && t?.refreshToken) {
    const r = await fetch(`${API}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: t.refreshToken }),
    });
    if (r.ok) {
      save({ ...t, ...(await r.json()) });
      return call(method, path, body, ifMatch, false);
    }
  }
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, etag: res.headers.get('etag'), body: json };
}

async function main() {
  switch (cmd) {
    case 'login': {
      const res = await fetch(`${API}/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: args[0], password: args[1] }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body)}`);
      save(body);
      console.log('zalogowano', res.status);
      return;
    }
    case 'get':
    case 'post':
    case 'patch':
    case 'put':
    case 'delete': {
      const body = args[1] ? JSON.parse(args[1]) : cmd === 'get' || cmd === 'delete' ? undefined : {};
      const r = await call(cmd, args[0], body, args[2]);
      console.log(JSON.stringify(r, null, 2));
      if (r.status >= 400) process.exitCode = 1;
      return;
    }
    case 'mail': {
      const list = await (
        await fetch(`${MAILPIT}/api/v1/search?query=to:${encodeURIComponent(args[0])}&limit=1`)
      ).json();
      const id = list.messages?.[0]?.ID;
      if (!id) throw new Error('brak e-maili');
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json();
      console.log(`${msg.Subject}\n${msg.Text}`);
      return;
    }
    default:
      console.error('Polecenia: login, get, post, patch, put, delete, mail');
      process.exit(2);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
