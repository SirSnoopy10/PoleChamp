import { storage } from '../../storage/mmkv';

/** Pojemność bufora cyklicznego (IMP-359). */
export const DIAG_CAPACITY = 1000;
const KEY = 'sync.diag';

export type DiagEvent =
  'push' | 'pull' | 'snapshot' | 'sync' | 'heartbeat' | 'rejected' | 'online' | 'offline';

/**
 * Wpis dziennika: wyłącznie pola techniczne – bez nazwisk, komentarzy, PIN-ów i tokenów (NFR-504).
 * Pola tekstowe są dodatkowo zawężane wzorcami, więc przypadkowo przekazana treść nie trafi do bufora.
 */
export interface DiagEntry {
  at: string;
  event: DiagEvent;
  status: string;
  mutationId?: string;
  code?: string;
  http?: number | null;
  pending?: number;
  sent?: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TOKEN = /^[A-Z][A-Z0-9_]{0,40}$|^[a-z][a-z_]{0,20}$/;

function sanitize(input: Omit<DiagEntry, 'at'>, at: string): DiagEntry {
  const entry: DiagEntry = {
    at,
    event: input.event,
    status: TOKEN.test(input.status) ? input.status : 'other',
  };
  if (input.mutationId && UUID.test(input.mutationId)) entry.mutationId = input.mutationId;
  if (input.code) entry.code = TOKEN.test(input.code) ? input.code : 'OTHER';
  if (typeof input.http === 'number' && Number.isInteger(input.http)) entry.http = input.http;
  if (Number.isInteger(input.pending)) entry.pending = input.pending;
  if (Number.isInteger(input.sent)) entry.sent = input.sent;
  return entry;
}

let cache: DiagEntry[] | null = null;

function load(): DiagEntry[] {
  if (cache) return cache;
  try {
    const raw = storage.getString(KEY);
    cache = raw ? (JSON.parse(raw) as DiagEntry[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

/** Dziennik synchronizacji tabletu w MMKV (bufor cykliczny 1 000 wpisów). */
export const diagLog = {
  add(input: Omit<DiagEntry, 'at'>, now = Date.now()): void {
    const entries = load();
    entries.push(sanitize(input, new Date(now).toISOString()));
    if (entries.length > DIAG_CAPACITY) entries.splice(0, entries.length - DIAG_CAPACITY);
    try {
      storage.set(KEY, JSON.stringify(entries));
    } catch {
      // Dziennik jest pomocniczy – błąd zapisu nie może przerwać synchronizacji.
    }
  },
  entries(): readonly DiagEntry[] {
    return load();
  },
  tail(n = 100): DiagEntry[] {
    return load().slice(-n);
  },
  /** Plik tekstowy dla wsparcia (jeden wpis na linię). */
  toText(): string {
    return load()
      .map((e) =>
        [e.at, e.event, e.status, e.code, e.http, e.mutationId, e.pending, e.sent]
          .map((v) => (v === undefined || v === null ? '-' : String(v)))
          .join('\t'),
      )
      .join('\n');
  },
  clear(): void {
    cache = [];
    storage.remove(KEY);
  },
};
