import { describe, expect, it } from 'vitest';
import {
  CategoryCreate,
  CriterionInput,
  DecimalStep05,
  EntryCreate,
  IdempotencyKey,
  JudgeCreate,
  JudgePatch,
  PairingCode,
  PenaltyTypeInput,
  Problem,
  PushRequest,
  RegisterRequest,
  ScoreSheetPayload,
  TournamentCreate,
  UuidV7,
} from '../src/index.js';
import { code, issues, v7 } from './helpers.js';

const x = (n: number) => 'x'.repeat(n);
const tournament = {
  name: 'Puchar Wiosny PoleChamp',
  startDate: '2027-04-18',
  endDate: null,
  venue: 'Poznań, Arena',
};
const criterion = { name: 'Technika', scaleMax: 10, weight: 2, description: 'Siła, elementy na rurze' };
const penalty = { name: 'Upadek', points: 2, maxOccurrences: 3 };
const entry = { startNumber: 47, fullName: 'Natalia Sikora', club: 'Studio Vertical Wrocław' };
const year = new Date().getFullYear();

const sheet = {
  scoreSheetId: v7(0xaaaa),
  categoryId: 'c3',
  entryId: 'e45',
  baseRevision: 0,
  criteria: [
    { criterionId: 'c3_k1', value: 8.5 },
    { criterionId: 'c3_k2', value: 8.5 },
  ],
  penalties: [{ penaltyTypeId: 'c3_p1', count: 0 }],
  comment: 'Ładna interpretacja muzyki.',
  clientTotal: 54.25,
};

const mutations = {
  submit: {
    mutationId: v7(1),
    type: 'SUBMIT_SCORE_SHEET',
    judgeId: 'jA',
    judgeSessionId: v7(2),
    authMode: 'OFFLINE_PIN',
    createdAt: '2026-10-03T13:57:41Z',
    payload: sheet,
  },
  started: {
    mutationId: v7(3),
    type: 'JUDGE_SESSION_STARTED',
    judgeId: 'jA',
    authMode: 'OFFLINE_PIN',
    createdAt: '2026-10-03T13:50:02Z',
    payload: { judgeSessionId: v7(2), pinVersion: 3 },
  },
  ended: {
    mutationId: v7(4),
    type: 'JUDGE_SESSION_ENDED',
    judgeId: 'jA',
    authMode: 'ONLINE_PIN',
    createdAt: '2026-10-03T15:00:00Z',
    payload: { judgeSessionId: v7(2) },
  },
  pin: {
    mutationId: v7(5),
    type: 'PIN_ATTEMPTS_REPORT',
    judgeId: 'jA',
    authMode: 'OFFLINE_PIN',
    createdAt: '2026-10-03T15:00:00Z',
    payload: { failedCount: 3, lockedUntil: '2026-10-03T15:01:00Z' },
  },
};

describe('kontrakty – walidacja pól', () => {
  it('TC-CONTRACT-001: pola dziesiętne z krokiem 0,5', () => {
    const decimal = DecimalStep05(0, 10);
    expect([8.5, 8.3, 0, 0.25].map((v) => code(decimal, v))).toEqual([
      'OK',
      'INVALID_STEP',
      'OK',
      'INVALID_STEP',
    ]);
    expect(issues(CriterionInput, { ...criterion, weight: 0.25 })).toEqual(['weight:INVALID_STEP']);
    expect(issues(PenaltyTypeInput, { ...penalty, points: 8.3 })).toEqual(['points:INVALID_STEP']);
  });

  it('TC-CONTRACT-002: turniej – nazwa, miejsce, daty', () => {
    expect(code(TournamentCreate, { ...tournament, name: 'ab' })).toBe('TOO_SHORT');
    expect(TournamentCreate.parse({ ...tournament, name: '  abc  ' }).name).toBe('abc');
    expect(code(TournamentCreate, { ...tournament, name: x(121) })).toBe('TOO_LONG');
    expect(issues(TournamentCreate, { ...tournament, venue: x(121) })).toEqual(['venue:TOO_LONG']);
    expect(issues(TournamentCreate, { ...tournament, endDate: '2027-04-17' })).toEqual([
      'endDate:DATE_RANGE',
    ]);
    expect(issues(TournamentCreate, { ...tournament, startDate: null, endDate: '2027-04-19' })).toEqual([
      'endDate:DATE_RANGE',
    ]);
    expect(code(TournamentCreate, { ...tournament, endDate: '2027-04-19' })).toBe('OK');
    expect(code(TournamentCreate, { ...tournament, name: '   ' })).toBe('REQUIRED');
  });

  it('TC-CONTRACT-003: kategoria – nazwa, grupa wiekowa, enumy', () => {
    const base = {
      name: 'Pole Sport Advanced',
      style: 'POLE_SPORT',
      level: 'ADVANCED',
      ageGroup: 'Senior 18+',
    };
    expect(code(CategoryCreate, { ...base, name: '' })).toBe('REQUIRED');
    expect(code(CategoryCreate, { ...base, name: x(81) })).toBe('TOO_LONG');
    expect(CategoryCreate.parse({ ...base, ageGroup: '' }).ageGroup).toBe('Open');
    expect(CategoryCreate.parse({ name: 'X', style: 'EXOTIC', level: 'PRO' }).ageGroup).toBe('Open');
    expect(code(CategoryCreate, { ...base, ageGroup: x(41) })).toBe('TOO_LONG');
    expect(issues(CategoryCreate, { ...base, style: 'Breaking' })).toEqual(['style:INVALID_FORMAT']);
  });

  it('TC-CONTRACT-004: kryterium – skala, waga, opis', () => {
    const codes = (patch: object) => code(CriterionInput, { ...criterion, ...patch });
    expect([0, 21, 7.5].map((scaleMax) => codes({ scaleMax }))).toEqual([
      'OUT_OF_RANGE',
      'OUT_OF_RANGE',
      'INVALID_STEP',
    ]);
    expect([0.3, 5.5, 1.5].map((weight) => codes({ weight }))).toEqual([
      'INVALID_STEP',
      'OUT_OF_RANGE',
      'OK',
    ]);
    expect(codes({ description: x(201) })).toBe('TOO_LONG');
  });

  it('TC-CONTRACT-005: kara – punkty i maks. wystąpień', () => {
    const codes = (patch: object) => code(PenaltyTypeInput, { ...penalty, ...patch });
    expect([0, 0.5, 50, 50.5].map((points) => codes({ points }))).toEqual([
      'OUT_OF_RANGE',
      'OK',
      'OK',
      'OUT_OF_RANGE',
    ]);
    expect([0, 1, 10, 11].map((maxOccurrences) => codes({ maxOccurrences }))).toEqual([
      'OUT_OF_RANGE',
      'OK',
      'OK',
      'OUT_OF_RANGE',
    ]);
  });

  it('TC-CONTRACT-006: zawodniczka – numer, nazwisko, rok, zgoda opiekuna', () => {
    const codes = (patch: object) => code(EntryCreate, { ...entry, ...patch });
    expect([0, 10000, 47].map((startNumber) => codes({ startNumber }))).toEqual([
      'OUT_OF_RANGE',
      'OUT_OF_RANGE',
      'OK',
    ]);
    expect([x(1), x(101)].map((fullName) => codes({ fullName }))).toEqual(['TOO_SHORT', 'TOO_LONG']);
    expect([1919, year + 1].map((birthYear) => codes({ birthYear }))).toEqual([
      'OUT_OF_RANGE',
      'OUT_OF_RANGE',
    ]);
    expect(issues(EntryCreate, { ...entry, birthYear: year - 16 })).toEqual([
      'guardianConsentConfirmed:REQUIRED',
    ]);
    expect(codes({ birthYear: year - 16, guardianConsentConfirmed: true })).toBe('OK');
    expect(issues(EntryCreate, { ...entry, isMinor: true })).toEqual(['guardianConsentConfirmed:REQUIRED']);
    expect(EntryCreate.parse({ ...entry, club: '  ' }).club).toBeNull();
  });

  it('TC-CONTRACT-007: sędzia – imię i nazwisko, inicjały', () => {
    expect([x(2), x(81)].map((fullName) => code(JudgeCreate, { fullName }))).toEqual([
      'TOO_SHORT',
      'TOO_LONG',
    ]);
    expect(code(JudgePatch, { initials: 'ABCD' })).toBe('TOO_LONG');
  });

  it('TC-CONTRACT-008: arkusz oceny w mutacji', () => {
    const codes = (patch: object) => code(ScoreSheetPayload, { ...sheet, ...patch });
    expect(codes({})).toBe('OK');
    expect(codes({ comment: x(501) })).toBe('TOO_LONG');
    expect(codes({ criteria: [sheet.criteria[0], sheet.criteria[0]] })).toBe('INVALID_FORMAT');
    expect(codes({ penalties: [{ penaltyTypeId: 'c3_p1', count: -1 }] })).toBe('OUT_OF_RANGE');
    expect(codes({ penalties: [{ penaltyTypeId: 'c3_p1', count: 11 }] })).toBe('OUT_OF_RANGE');
    expect(codes({ clientTotal: 54.255 })).toBe('INVALID_FORMAT');
  });

  it('TC-CONTRACT-009: ścisłe schematy – nieznane pola', () => {
    expect(issues(TournamentCreate, { ...tournament, status: 'FINISHED' })).toEqual(['status:UNKNOWN_FIELD']);
    expect(
      issues(RegisterRequest, {
        email: 'a@b.pl',
        password: x(9),
        displayName: 'Marta',
        acceptTerms: false,
        termsVersion: '1',
      }),
    ).toEqual(['password:TOO_SHORT', 'acceptTerms:REQUIRED']);
  });

  it('TC-CONTRACT-010: unia mutacji sync/push', () => {
    const push = (list: unknown[]) => ({ deviceTime: '2026-10-03T13:59:58Z', mutations: list });
    expect(code(PushRequest, push(Object.values(mutations)))).toBe('OK');
    expect(code(PushRequest, push([{ ...mutations.pin, type: 'DELETE_EVERYTHING' }]))).not.toBe('OK');
    expect(code(PushRequest, push(Array.from({ length: 101 }, () => mutations.started)))).toBe('TOO_LONG');
    const { mutationId: _omit, ...withoutId } = mutations.started;
    expect(issues(PushRequest, push([withoutId]))).toEqual(['mutations[0].mutationId:REQUIRED']);
  });

  it('TC-CONTRACT-014: format problem+json', () => {
    const problem = {
      type: 'https://api.polechamp.app/problems/category-locked',
      title: 'Kategoria jest zablokowana',
      status: 409,
      code: 'CATEGORY_LOCKED',
      detail: 'Kategoria c3 została zablokowana 2026-10-03T14:02:11Z.',
      instance: '/v1/sync/push',
      requestId: '0192f1d4-7a1e-7c3b-9a55-3c1f0e2b8d10',
      errors: [{ field: 'criteria[0].value', code: 'OUT_OF_RANGE' }],
    };
    expect(code(Problem, problem)).toBe('OK');
    expect(code(Problem, { ...problem, code: 'NOPE' })).not.toBe('OK');
    expect(Problem.parse({ ...problem, missingSheets: 15 })).toHaveProperty('missingSheets', 15);
  });

  it('TC-CONTRACT-015: normalizacja kodu parowania', () => {
    expect(['k7qm4ztx', 'K7QM-4ZTX', 'K7QM 4ZTX'].map((c) => PairingCode.parse(c))).toEqual([
      'K7QM4ZTX',
      'K7QM4ZTX',
      'K7QM4ZTX',
    ]);
    expect(['K7QM-4ZT0', 'K7QM-4ZT'].map((c) => code(PairingCode, c))).toEqual([
      'INVALID_FORMAT',
      'INVALID_FORMAT',
    ]);
  });

  it('TC-CONTRACT-016: identyfikatory klienta', () => {
    expect(code(IdempotencyKey, 'f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe('OK');
    expect(code(IdempotencyKey, v7(9))).toBe('OK');
    expect(code(IdempotencyKey, 'abc')).toBe('INVALID_FORMAT');
    expect(code(UuidV7, 'f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe('INVALID_FORMAT');
    expect(code(UuidV7, v7(9))).toBe('OK');
  });
});
