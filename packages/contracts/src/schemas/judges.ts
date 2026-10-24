import { z } from 'zod';
import { Id, IsoDateTime, PersonName, TrimmedString } from './common.js';

/** Sędziowie, urządzenia i parowanie (03-api §3.5; FR-502, FR-504, FR-505, FR-806; IMP-062). */
export const JudgeCreate = z.strictObject({ fullName: PersonName(3, 80) });

export const JudgePatch = z.strictObject({
  fullName: PersonName(3, 80).optional(),
  initials: TrimmedString(1, 3).optional(),
  isActive: z.boolean().optional(),
});

export const JudgeRow = z.object({
  id: Id,
  fullName: z.string(),
  initials: z.string(),
  isActive: z.boolean(),
  pinLocked: z.boolean(),
  sheetCount: z.number().int().min(0),
});

/** Odpowiedź utworzenia sędziego / resetu PIN – PIN zwracany jednorazowo. */
export const JudgeCreated = z.object({
  id: Id,
  fullName: z.string(),
  initials: z.string(),
  isActive: z.boolean(),
  pin: z.string().regex(/^\d{4}$/),
  pinShownOnce: z.literal(true),
});

/** Alfabet kodów parowania bez znaków mylących (0/O, 1/I/L). */
export const PAIRING_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PAIRING_RE = new RegExp(`^[${PAIRING_ALPHABET}]{8}$`);

/** Kod parowania wpisany ręcznie: „k7qm 4ztx” / „K7QM-4ZTX” → „K7QM4ZTX”. */
export const PairingCode = z
  .string()
  .transform((v) => v.toUpperCase().replace(/[\s-]/g, ''))
  .pipe(z.string().regex(PAIRING_RE, { error: 'INVALID_FORMAT' }));

export const PairingCodeCreated = z.object({
  code: z.string(),
  qrPayload: z.string(),
  expiresAt: IsoDateTime,
});

export const Platform = z.enum(['ios', 'android']);

export const PairRequest = z.strictObject({
  code: PairingCode,
  deviceName: TrimmedString(1, 60),
  platform: Platform,
  model: z.string().max(100),
  osVersion: z.string().max(40),
  appVersion: z.string().max(40),
});

export const PairResponse = z.object({
  deviceId: Id,
  deviceSecret: z.string().min(32),
  /** 32 B w base64 – do SecureStore, klucz do odszyfrowania weryfikatorów PIN (TL-04, TL-05). */
  pinPepper: z.base64().refine((v) => v.length === 44, { message: 'INVALID_FORMAT' }),
  tournament: z.object({ id: Id, name: z.string() }),
});

export const DeviceTokenRequest = z.strictObject({ deviceId: Id, deviceSecret: z.string().min(1) });
export const DeviceTokenResponse = z.object({
  deviceToken: z.string(),
  expiresIn: z.number().int().positive(),
});

export const DeviceRow = z.object({
  id: Id,
  name: z.string(),
  platform: Platform,
  online: z.boolean(),
  lastSeenAt: IsoDateTime.nullable(),
  lastSyncAt: IsoDateTime.nullable(),
  pendingMutations: z.number().int().min(0),
  batteryLevel: z.number().min(0).max(1).nullable(),
  activeJudge: z.object({ id: Id, fullName: z.string() }).nullable(),
});

export const DevicePatch = z.strictObject({ name: TrimmedString(1, 60) });

export const Heartbeat = z.strictObject({
  pendingMutations: z.number().int().min(0),
  lastSyncCursor: z.number().int().min(0).nullable(),
  batteryLevel: z.number().min(0).max(1).nullable(),
  activeJudgeId: Id.nullable(),
});

export type JudgeRow = z.infer<typeof JudgeRow>;
export type PairRequest = z.infer<typeof PairRequest>;
export type PairResponse = z.infer<typeof PairResponse>;
export type DeviceRow = z.infer<typeof DeviceRow>;
export type Heartbeat = z.infer<typeof Heartbeat>;
