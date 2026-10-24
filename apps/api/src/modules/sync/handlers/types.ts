import type { Mutation, SYNC_REJECTION_CODES } from '@polechamp/contracts';
import type { Tx } from '../../../db/client.js';

export type RejectionCode = (typeof SYNC_REJECTION_CODES)[number];

/** Kontekst paczki: urządzenie i jego turniej, czas serwera i zegar tabletu (03-api §5.1). */
export interface PushContext {
  deviceId: string;
  tournamentId: string;
  receivedAt: Date;
  deviceTime: Date;
}

export type HandlerResult =
  | { status: 'APPLIED'; scoreSheetId?: string; revision?: number; serverTotal?: number }
  | { status: 'REJECTED'; code: RejectionCode };

export const rejected = (code: RejectionCode): HandlerResult => ({ status: 'REJECTED', code });

/** Handler jednego typu mutacji – działa w transakcji mutacji, odrzucenie zwraca (nie rzuca). */
export interface MutationHandler<M extends Mutation = Mutation> {
  handle(tx: Tx, ctx: PushContext, mutation: M): Promise<HandlerResult>;
}

export type MutationOf<T extends Mutation['type']> = Extract<Mutation, { type: T }>;
