import { describe, expect, it } from 'vitest';
import { buildOpenApiDocument } from '../src/openapi/index.js';
import {
  ERROR_CODES,
  EVENT_ROOM,
  FIELD_ERROR_CODES,
  errorHttpStatus,
  routes,
  serverEvents,
} from '../src/index.js';
import { readDoc, section } from './helpers.js';

const api = readDoc('docs/01-architecture/03-api.md');

/** Wiersze tabeli Markdown jako tablice komórek (bez nagłówka i separatora). */
function tableRows(markdown: string): string[][] {
  return (
    markdown
      .split('\n')
      .filter((l) => l.startsWith('|') && !/^\|\s*-/.test(l))
      .slice(1)
      // Komórki dzielone tylko na niezescapowanych „|” (np. `?status=active\|finished`).
      .map((l) =>
        l
          .split(/(?<!\\)\|/)
          .slice(1, -1)
          .map((c) => c.trim()),
      )
  );
}

describe('zgodność kontraktu z docs/01-architecture/03-api.md', () => {
  it('TC-CONTRACT-011: katalog kodów błędów i kodów pól', () => {
    const rows = tableRows(section(api, '### 1.2 Katalog kodów błędów'));
    const documented = new Map<string, number | null>();
    for (const [codeCell = '', http = ''] of rows) {
      for (const c of codeCell.match(/`([A-Z_]+)`/g) ?? []) {
        documented.set(c.replaceAll('`', ''), /^\d+$/.test(http) ? Number(http) : null);
      }
    }
    expect([...documented.keys()].sort()).toEqual([...ERROR_CODES].sort());
    for (const [c, http] of documented)
      expect(errorHttpStatus[c as keyof typeof errorHttpStatus], c).toBe(http);

    const fieldRows = tableRows(section(api, '### 1.3 Kody błędów pól'));
    const fieldCodes = fieldRows.flatMap(([c = '']) =>
      (c.match(/`([A-Z_]+)`/g) ?? []).map((m) => m.replaceAll('`', '')),
    );
    expect(fieldCodes.sort()).toEqual([...FIELD_ERROR_CODES].sort());
  });

  it('TC-CONTRACT-013: OpenAPI 3.1 zawiera każdą ścieżkę MVP z 03-api §3–4', () => {
    const endpoints = new Set<string>();
    for (const heading of ['## 3. Endpointy – organizator', '## 4. Endpointy – urządzenie i sędzia']) {
      for (const [method = '', pathCell = '', , description = ''] of tableRows(section(api, heading))) {
        if (!/^(GET|POST|PUT|PATCH|DELETE)$/.test(method)) continue;
        if (/\(v1\.1\)|Poza MVP/.test(description)) continue;
        const path = (/`([^`]+)`/.exec(pathCell)?.[1] ?? '')
          .replace(/\?.*$/, '')
          .replace('{id}', '{rejectedId}');
        endpoints.add(`${method} ${path}`);
      }
    }
    const implemented = new Set(routes.map((r) => `${r.method.toUpperCase()} ${r.path}`));
    expect([...implemented].sort()).toEqual([...endpoints].sort());

    const doc = buildOpenApiDocument();
    expect(doc.openapi).toBe('3.1.0');
    for (const [path, item] of Object.entries(doc.paths ?? {})) {
      for (const [method, op] of Object.entries(item as Record<string, Record<string, unknown>>)) {
        expect(op['x-permissions'], `${method} ${path}`).toBeTypeOf('string');
        expect(op.operationId, `${method} ${path}`).toBeTypeOf('string');
        const responses = Object.keys(op.responses as object);
        expect(
          responses.some((s) => s.startsWith('4') || s.startsWith('5')),
          `${method} ${path}`,
        ).toBe(true);
      }
    }
  });

  it('TC-CONTRACT-012: zdarzenia WebSocket i pokoje', () => {
    const rows = tableRows(section(api, '## 6. Kanał realtime (Socket.IO)')).filter(([name = '']) =>
      /^`[a-z]+\.[a-z]+`$/.test(name),
    );
    const documented = Object.fromEntries(
      rows.map(([name = '', room = '']) => [name.replaceAll('`', ''), room]),
    );
    expect(Object.keys(serverEvents).sort()).toEqual(Object.keys(documented).sort());
    expect(EVENT_ROOM).toEqual(documented);
    const forbidden = /fullName|club|email|comment|pin\b/;
    for (const [name, schema] of Object.entries(serverEvents)) {
      expect(Object.keys(schema.shape).join(','), name).not.toMatch(forbidden);
    }
    expect(serverEvents['session.revoked'].parse({ reason: 'TOURNAMENT_FINISHED' })).toEqual({
      reason: 'TOURNAMENT_FINISHED',
    });
    expect(
      serverEvents['device.paired'].safeParse({ deviceId: 'd2', name: 'Tablet stół 2', platform: 'android' })
        .success,
    ).toBe(true);
  });
});
