/**
 * Zapytania Drizzle jedno po drugim (jak `Promise.all`, ale bez równoległości). Zapytania są leniwe,
 * więc start następuje dopiero tutaj – klient transakcji `pg` nie obsługuje zapytań równoległych (pg@9).
 */
export async function inSequence<T extends readonly unknown[] | []>(
  queries: T,
): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }> {
  const results: unknown[] = [];
  for (const query of queries) results.push(await query);
  return results as { -readonly [P in keyof T]: Awaited<T[P]> };
}
