import { z } from 'zod';
import { Id, IntInRange, OptionalTrimmedString, TrimmedString } from './common.js';

/** Lista startowa (03-api §3.4; FR-402, FR-406; IMP-062). */
export const EntryStatus = z.enum(['ACTIVE', 'WITHDRAWN']);

const ADULT_AGE = 18;

/** Rok urodzenia 1920 – bieżący rok (sprawdzany w chwili walidacji). */
const BirthYear = z.number({ error: 'INVALID_FORMAT' }).superRefine((year, ctx) => {
  if (!Number.isInteger(year)) ctx.addIssue({ code: 'custom', message: 'INVALID_STEP' });
  else if (year < 1920 || year > new Date().getFullYear())
    ctx.addIssue({ code: 'custom', message: 'OUT_OF_RANGE' });
});

const entryFields = {
  startNumber: IntInRange(1, 9999),
  fullName: TrimmedString(2, 100),
  club: OptionalTrimmedString(100),
  birthYear: BirthYear.nullable().optional(),
  isMinor: z.boolean().optional(),
  guardianConsentConfirmed: z.boolean().optional(),
};

/** Niepełnoletnia (zaznaczona lub wynikająca z roku urodzenia) wymaga zgody opiekuna (RODO, FR-406). */
function requireGuardianConsent(
  value: {
    birthYear?: number | null | undefined;
    isMinor?: boolean | undefined;
    guardianConsentConfirmed?: boolean | undefined;
  },
  ctx: z.RefinementCtx,
) {
  const minorByYear = value.birthYear != null && new Date().getFullYear() - value.birthYear < ADULT_AGE;
  if ((value.isMinor === true || minorByYear) && value.guardianConsentConfirmed !== true) {
    ctx.addIssue({ code: 'custom', path: ['guardianConsentConfirmed'], message: 'REQUIRED' });
  }
}

export const EntryCreate = z.strictObject(entryFields).superRefine(requireGuardianConsent);

export const EntryPatch = z
  .strictObject({
    startNumber: entryFields.startNumber.optional(),
    fullName: entryFields.fullName.optional(),
    club: entryFields.club,
    birthYear: entryFields.birthYear,
    isMinor: entryFields.isMinor,
    guardianConsentConfirmed: entryFields.guardianConsentConfirmed,
  })
  .superRefine(requireGuardianConsent);

export const Athlete = z.object({
  id: Id,
  fullName: z.string(),
  club: z.string().nullable().optional(),
  isMinor: z.boolean(),
});

export const EntryRow = z.object({
  id: Id,
  startNumber: z.number().int(),
  startOrder: z.number().int().positive(),
  status: EntryStatus,
  athlete: Athlete,
  judged: z.object({ done: z.number().int().min(0), expected: z.number().int().min(0) }),
});

export const EntryList = z.object({ items: z.array(EntryRow) });

export type EntryCreate = z.infer<typeof EntryCreate>;
export type EntryRow = z.infer<typeof EntryRow>;
