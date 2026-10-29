import type { Permission } from '@polechamp/contracts';
import type { AuthContext } from '../setup/tokens.js';

/**
 * Macierz endpoint × kontekst tokenu (05-bezpieczenstwo §4.1, IMP-453) jako dane.
 * `ok` = autoryzacja przepuszcza (status ≠ 401/403/404 – błędy walidacji i stanu są dozwolone).
 * Kontekst `deviceOther`/`judgeOther` dotyczy tabletu i sędziego turnieju innego organizatora.
 */
export type Expect = 'ok' | 401 | 403 | 404;

export interface ResourceIds {
  tournamentId: string;
  categoryId: string;
  criterionId: string;
  penaltyTypeId: string;
  entryId: string;
  judgeId: string;
  judgePin: string;
  deviceId: string;
  scoreSheetId: string;
  rejectedId: string;
  exportId: string;
}

export interface MatrixRow {
  tc: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  /** Oczekiwane `x-permissions` w OpenAPI. */
  permission: Permission;
  expect: Record<AuthContext, Expect>;
  /** Zmienia stan konta, turnieju lub tokenu – kontekst `ok` biegnie na świeżych danych. */
  destructive?: boolean;
  body?: (ids: ResourceIds) => unknown;
}

const all = (e: Expect): Record<AuthContext, Expect> => ({
  none: e,
  orgOwner: e,
  orgOther: e,
  device: e,
  deviceOther: e,
  deviceRevoked: e,
  judge: e,
  judgeOther: e,
});

/** Konto i listy organizatora (własne konto, „tylko własne”). */
const ORG_ACCOUNT: Record<AuthContext, Expect> = {
  ...all(403),
  none: 401,
  deviceRevoked: 401,
  orgOwner: 'ok',
  orgOther: 'ok',
};

/** Zasób turnieju właściciela: inny organizator → 404 (bez ujawniania istnienia – TC-SEC-011). */
const OWNER: Record<AuthContext, Expect> = { ...ORG_ACCOUNT, orgOther: 404 };

/** Tablet i sędzia: każdy w obrębie własnego turnieju. */
const DEVICE_OR_JUDGE: Record<AuthContext, Expect> = {
  ...all('ok'),
  none: 401,
  deviceRevoked: 401,
  orgOwner: 403,
  orgOther: 403,
};

const JUDGE_ONLY: Record<AuthContext, Expect> = { ...DEVICE_OR_JUDGE, device: 403, deviceOther: 403 };

const PUBLIC = all('ok');
const empty = () => ({});

const row = (
  tc: string,
  method: MatrixRow['method'],
  path: string,
  permission: Permission,
  expect: Record<AuthContext, Expect>,
  extra: Partial<MatrixRow> = {},
): MatrixRow => ({ tc, method, path, permission, expect, ...extra });

export const MATRIX: MatrixRow[] = [
  row('TC-AUTHZ-001', 'POST', '/v1/auth/register', 'PUBLIC', PUBLIC, { body: empty }),
  row('TC-AUTHZ-002', 'POST', '/v1/auth/verify-email', 'PUBLIC', PUBLIC, { body: empty }),
  row('TC-AUTHZ-003', 'POST', '/v1/auth/verify-email/resend', 'ORG', ORG_ACCOUNT),
  row('TC-AUTHZ-004', 'POST', '/v1/auth/login', 'PUBLIC', PUBLIC, { body: empty }),
  row('TC-AUTHZ-005', 'POST', '/v1/auth/refresh', 'PUBLIC', PUBLIC, { body: empty }),
  row('TC-AUTHZ-006', 'POST', '/v1/auth/logout', 'ORG', ORG_ACCOUNT, { destructive: true, body: empty }),
  row('TC-AUTHZ-007', 'POST', '/v1/auth/password/forgot', 'PUBLIC', PUBLIC, { body: empty }),
  row('TC-AUTHZ-008', 'POST', '/v1/auth/password/reset', 'PUBLIC', PUBLIC, { body: empty }),
  row('TC-AUTHZ-009', 'GET', '/v1/me', 'ORG', ORG_ACCOUNT),
  row('TC-AUTHZ-009', 'PATCH', '/v1/me', 'ORG', ORG_ACCOUNT, { body: empty }),
  row('TC-AUTHZ-009', 'PUT', '/v1/me/email', 'ORG', ORG_ACCOUNT, { body: empty }),
  row('TC-AUTHZ-009', 'DELETE', '/v1/me', 'ORG', ORG_ACCOUNT, { destructive: true, body: empty }),
  row('TC-AUTHZ-010', 'GET', '/v1/app-config', 'PUBLIC', PUBLIC),
  row('TC-AUTHZ-011', 'GET', '/v1/tournaments', 'ORG', ORG_ACCOUNT),
  row('TC-AUTHZ-012', 'POST', '/v1/tournaments', 'ORG', ORG_ACCOUNT, { body: empty }),
  row('TC-AUTHZ-013', 'GET', '/v1/tournaments/{tournamentId}', 'ORG:owner', OWNER),
  row('TC-AUTHZ-014', 'PATCH', '/v1/tournaments/{tournamentId}', 'ORG:owner', OWNER, {
    body: () => ({ venue: 'Kraków' }),
  }),
  row('TC-AUTHZ-015', 'DELETE', '/v1/tournaments/{tournamentId}', 'ORG:owner', OWNER, { destructive: true }),
  row('TC-AUTHZ-016', 'POST', '/v1/tournaments/{tournamentId}/start', 'ORG:owner', OWNER, {
    destructive: true,
  }),
  row('TC-AUTHZ-017', 'POST', '/v1/tournaments/{tournamentId}/finish', 'ORG:owner', OWNER, {
    destructive: true,
    body: empty,
  }),
  row('TC-AUTHZ-018', 'GET', '/v1/tournaments/{tournamentId}/categories', 'ORG:owner', OWNER),
  row('TC-AUTHZ-019', 'POST', '/v1/tournaments/{tournamentId}/categories', 'ORG:owner', OWNER, {
    body: () => ({ name: 'Exotic Open', style: 'EXOTIC', level: 'PRO' }),
  }),
  row('TC-AUTHZ-020', 'GET', '/v1/categories/{categoryId}', 'ORG:owner', OWNER),
  row('TC-AUTHZ-021', 'PATCH', '/v1/categories/{categoryId}', 'ORG:owner', OWNER, {
    body: () => ({ name: 'Pole Sport Elite' }),
  }),
  row('TC-AUTHZ-022', 'DELETE', '/v1/categories/{categoryId}', 'ORG:owner', OWNER, { destructive: true }),
  row('TC-AUTHZ-023', 'POST', '/v1/categories/{categoryId}/start', 'ORG:owner', OWNER, { destructive: true }),
  row('TC-AUTHZ-024', 'POST', '/v1/categories/{categoryId}/lock', 'ORG:owner', OWNER, {
    destructive: true,
    body: empty,
  }),
  row('TC-AUTHZ-025', 'POST', '/v1/categories/{categoryId}/unlock', 'ORG:owner', OWNER, {
    destructive: true,
    body: empty,
  }),
  row('TC-AUTHZ-026', 'POST', '/v1/categories/{categoryId}/criteria', 'ORG:owner', OWNER, {
    body: () => ({ name: 'Siła', scaleMax: 10, weight: 1 }),
  }),
  row('TC-AUTHZ-027', 'PATCH', '/v1/criteria/{criterionId}', 'ORG:owner', OWNER, {
    body: () => ({ name: 'Siła' }),
  }),
  row('TC-AUTHZ-027', 'DELETE', '/v1/criteria/{criterionId}', 'ORG:owner', OWNER, { destructive: true }),
  row('TC-AUTHZ-028', 'POST', '/v1/categories/{categoryId}/penalty-types', 'ORG:owner', OWNER, {
    body: () => ({ name: 'Dotknięcie podłogi', points: 1, maxOccurrences: 2 }),
  }),
  row('TC-AUTHZ-029', 'PATCH', '/v1/penalty-types/{penaltyTypeId}', 'ORG:owner', OWNER, {
    body: () => ({ name: 'Upadek' }),
  }),
  row('TC-AUTHZ-029', 'DELETE', '/v1/penalty-types/{penaltyTypeId}', 'ORG:owner', OWNER, {
    destructive: true,
  }),
  row('TC-AUTHZ-030', 'GET', '/v1/categories/{categoryId}/entries', 'ORG:owner', OWNER),
  row('TC-AUTHZ-031', 'POST', '/v1/categories/{categoryId}/entries', 'ORG:owner', OWNER, {
    body: () => ({ startNumber: 99, fullName: 'Ida Baran' }),
  }),
  row('TC-AUTHZ-032', 'PATCH', '/v1/entries/{entryId}', 'ORG:owner', OWNER, {
    body: () => ({ fullName: 'Ida Baran' }),
  }),
  row('TC-AUTHZ-032', 'DELETE', '/v1/entries/{entryId}', 'ORG:owner', OWNER, { destructive: true }),
  row('TC-AUTHZ-033', 'POST', '/v1/entries/{entryId}/withdraw', 'ORG:owner', OWNER, {
    destructive: true,
    body: empty,
  }),
  row('TC-AUTHZ-034', 'POST', '/v1/entries/{entryId}/restore', 'ORG:owner', OWNER, {
    destructive: true,
    body: empty,
  }),
  row('TC-AUTHZ-035', 'POST', '/v1/entries/{entryId}/anonymize', 'ORG:owner', OWNER, {
    destructive: true,
    body: empty,
  }),
  row('TC-AUTHZ-036', 'GET', '/v1/tournaments/{tournamentId}/judges', 'ORG:owner', OWNER),
  row('TC-AUTHZ-037', 'POST', '/v1/tournaments/{tournamentId}/judges', 'ORG:owner', OWNER, {
    body: () => ({ fullName: 'Ida Baran' }),
  }),
  row('TC-AUTHZ-038', 'PATCH', '/v1/judges/{judgeId}', 'ORG:owner', OWNER, {
    body: () => ({ fullName: 'Ida Baran' }),
  }),
  row('TC-AUTHZ-038', 'DELETE', '/v1/judges/{judgeId}', 'ORG:owner', OWNER, { destructive: true }),
  row('TC-AUTHZ-039', 'POST', '/v1/judges/{judgeId}/pin/reset', 'ORG:owner', OWNER, { destructive: true }),
  row('TC-AUTHZ-040', 'POST', '/v1/tournaments/{tournamentId}/pairing-codes', 'ORG:owner', OWNER),
  row('TC-AUTHZ-041', 'POST', '/v1/devices/pair', 'PUBLIC', PUBLIC, { body: empty }),
  row('TC-AUTHZ-042', 'POST', '/v1/devices/token', 'PUBLIC', PUBLIC, { body: empty }),
  row('TC-AUTHZ-043', 'GET', '/v1/tournaments/{tournamentId}/devices', 'ORG:owner', OWNER),
  row('TC-AUTHZ-044', 'PATCH', '/v1/devices/{deviceId}', 'ORG:owner', OWNER, {
    body: () => ({ name: 'Tablet stół 2' }),
  }),
  row('TC-AUTHZ-044', 'DELETE', '/v1/devices/{deviceId}', 'ORG:owner', OWNER, { destructive: true }),
  row('TC-AUTHZ-045', 'POST', '/v1/devices/me/heartbeat', 'DEV|JDG', DEVICE_OR_JUDGE, { body: empty }),
  row('TC-AUTHZ-046', 'GET', '/v1/categories/{categoryId}/results', 'ORG:owner', OWNER),
  row('TC-AUTHZ-047', 'GET', '/v1/tournaments/{tournamentId}/results', 'ORG:owner', OWNER),
  row('TC-AUTHZ-048', 'GET', '/v1/entries/{entryId}/score-sheets', 'ORG:owner', OWNER),
  row('TC-AUTHZ-049', 'GET', '/v1/score-sheets/{scoreSheetId}/revisions', 'ORG:owner', OWNER),
  row('TC-AUTHZ-050', 'GET', '/v1/tournaments/{tournamentId}/rejected-submissions', 'ORG:owner', OWNER),
  row('TC-AUTHZ-051', 'POST', '/v1/rejected-submissions/{rejectedId}/accept', 'ORG:owner', OWNER, {
    destructive: true,
    body: empty,
  }),
  row('TC-AUTHZ-052', 'POST', '/v1/rejected-submissions/{rejectedId}/discard', 'ORG:owner', OWNER, {
    destructive: true,
    body: empty,
  }),
  row('TC-AUTHZ-053', 'POST', '/v1/exports', 'ORG:owner', OWNER, {
    body: (ids) => ({ scope: 'TOURNAMENT', tournamentId: ids.tournamentId }),
  }),
  row('TC-AUTHZ-054', 'GET', '/v1/exports/{exportId}', 'ORG:owner', OWNER),
  row('TC-AUTHZ-055', 'GET', '/v1/tournaments/{tournamentId}/audit-log', 'ORG:owner', OWNER),
  row('TC-AUTHZ-056', 'GET', '/v1/sync/snapshot', 'DEV|JDG', DEVICE_OR_JUDGE),
  row('TC-AUTHZ-057', 'GET', '/v1/sync/changes?since=0', 'DEV|JDG', DEVICE_OR_JUDGE),
  row(
    'TC-AUTHZ-058',
    'POST',
    '/v1/judge-sessions',
    'DEV',
    // Trasa tabletu (DEV): tablet innego turnieju → 404, token sędziego → 403.
    { ...DEVICE_OR_JUDGE, deviceOther: 404, judge: 403, judgeOther: 403 },
    // Nowa sesja kończy poprzednią sesję sędziego – kontekst `ok` na świeżych danych.
    { destructive: true, body: (ids) => ({ judgeId: ids.judgeId, pin: ids.judgePin }) },
  ),
  row('TC-AUTHZ-059', 'DELETE', '/v1/judge-sessions/current', 'JDG', JUDGE_ONLY, { destructive: true }),
  row('TC-AUTHZ-060', 'GET', '/v1/judge/me/score-sheets', 'JDG', JUDGE_ONLY),
  row('TC-AUTHZ-061', 'POST', '/v1/sync/push', 'DEV|JDG', DEVICE_OR_JUDGE, {
    body: () => ({ deviceTime: new Date().toISOString(), mutations: [] }),
  }),
];

/** Ścieżka z podstawionymi identyfikatorami zasobów właściciela. */
export function resolvePath(path: string, ids: ResourceIds): string {
  return path.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = (ids as unknown as Record<string, string>)[name];
    if (!value) throw new Error(`Brak identyfikatora ${name}`);
    return value;
  });
}
