import type { PipeTransform } from '@nestjs/common';
import { toFieldIssues } from '@polechamp/contracts';
import type { z } from 'zod';
import { validationFailed } from '../errors/domain-error.js';

/**
 * Walidacja wejścia schematem z `@polechamp/contracts` (IMP-102). Schematy żądań są `strict`,
 * więc pole spoza kontraktu daje `UNKNOWN_FIELD`. Błąd → `422 VALIDATION_FAILED` z `errors[]`.
 */
export class ZodPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    return parseOrThrow(this.schema, value ?? {});
  }
}

export function parseOrThrow<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) throw validationFailed(toFieldIssues(result.error));
  return result.data;
}

/** Skrót do dekoratorów parametrów: `@Body(zod(TournamentCreate))`. */
export const zod = <S extends z.ZodType>(schema: S) => new ZodPipe(schema);
