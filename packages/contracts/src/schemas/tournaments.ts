import { z } from 'zod';
import { CategoryListItem } from './categories.js';
import { Id, IsoDate, IsoDateTime, OptionalTrimmedString, Progress, TrimmedString } from './common.js';

/** Turnieje (03-api §3.2, FR-202, IMP-061). */
export const TournamentStatus = z.enum(['DRAFT', 'IN_PROGRESS', 'FINISHED']);

const dateRange = <T extends { startDate?: string | null; endDate?: string | null }>(
  value: T,
  ctx: z.RefinementCtx,
) => {
  // Data końcowa bez początkowej albo wcześniejsza niż początkowa (TC-CONTRACT-002).
  if (value.endDate && (value.startDate === null || (value.startDate && value.endDate < value.startDate))) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'DATE_RANGE' });
  }
};

const tournamentFields = {
  name: TrimmedString(3, 120),
  startDate: IsoDate.nullable(),
  endDate: IsoDate.nullable(),
  venue: OptionalTrimmedString(120),
};

export const TournamentCreate = z.strictObject(tournamentFields).superRefine(dateRange);
export const TournamentPatch = z
  .strictObject({
    name: tournamentFields.name.optional(),
    startDate: tournamentFields.startDate.optional(),
    endDate: tournamentFields.endDate.optional(),
    venue: tournamentFields.venue,
  })
  .superRefine(dateRange);

export const Tournament = z.object({
  id: Id,
  name: z.string(),
  status: TournamentStatus,
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  venue: z.string().nullable(),
  version: z.number().int().positive(),
});

export const TournamentListItem = Tournament.omit({ version: true }).extend({
  categoryCount: z.number().int().min(0),
  progress: Progress,
});

export const TournamentList = z.object({ items: z.array(TournamentListItem) });
export const TournamentListQuery = z.object({ status: z.enum(['active', 'finished']).default('active') });

export const TournamentDetails = Tournament.extend({
  stats: z.object({
    categories: z.number().int().min(0),
    athletes: z.number().int().min(0),
    judges: z.number().int().min(0),
  }),
  progress: Progress.extend({ startedCategories: z.number().int().min(0) }),
  pendingRejectedSubmissions: z.number().int().min(0),
  categories: z.array(CategoryListItem),
});

export const FinishResponse = z.object({
  id: Id,
  status: z.literal('FINISHED'),
  finishedAt: IsoDateTime,
  autoLockedCategoryIds: z.array(Id),
  unplayedCategoryIds: z.array(Id),
  version: z.number().int().positive(),
});

export type TournamentCreate = z.infer<typeof TournamentCreate>;
export type TournamentDetails = z.infer<typeof TournamentDetails>;
export type TournamentListItem = z.infer<typeof TournamentListItem>;
