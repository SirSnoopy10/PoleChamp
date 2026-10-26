import type { z } from 'zod';
import type {
  EntryScoreSheets as EntryScoreSheetsSchema,
  ScoreSheetRevision as ScoreSheetRevisionSchema,
  TournamentResults as TournamentResultsSchema,
} from '@polechamp/contracts';

/** Typy odpowiedzi bez aliasów w `@polechamp/contracts`. */
export type TournamentResults = z.infer<typeof TournamentResultsSchema>;
export type EntryScoreSheets = z.infer<typeof EntryScoreSheetsSchema>;
export type ScoreSheetRevision = z.infer<typeof ScoreSheetRevisionSchema>;
