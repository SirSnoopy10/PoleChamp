import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { z } from 'zod';
import { toFieldIssues, type FieldIssue } from '../src/validation.js';

/** Wynik walidacji jako lista `pole:KOD` (pusta = poprawne). */
export function issues(schema: z.ZodType, input: unknown): string[] {
  const result = schema.safeParse(input);
  return result.success ? [] : toFieldIssues(result.error).map((i: FieldIssue) => `${i.field}:${i.code}`);
}

/** Pierwszy kod błędu albo 'OK'. */
export function code(schema: z.ZodType, input: unknown): string {
  const result = schema.safeParse(input);
  return result.success ? 'OK' : (toFieldIssues(result.error)[0]?.code ?? 'ERROR');
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** Dokumentacja projektu (testy zgodności kontraktu z docs/). */
export function readDoc(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

/** Sekcja Markdown od nagłówka `heading` do następnego nagłówka tego samego lub wyższego poziomu. */
export function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(heading);
  if (start < 0) throw new Error(`Brak sekcji ${heading}`);
  const level = /^#+/.exec(heading)?.[0].length ?? 2;
  const rest = markdown.slice(start + heading.length);
  const next = new RegExp(`\\n#{1,${level}} `).exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

export const v7 = (suffix: number) => `0192f2a1-5b7c-7e01-8c3a-${suffix.toString(16).padStart(12, '0')}`;
