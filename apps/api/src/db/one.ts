/** Jedyny wiersz wyniku (`INSERT … RETURNING`, wyszukanie po kluczu) – brak wiersza to błąd programisty. */
export function one<T>(rows: readonly T[]): T {
  const [row] = rows;
  if (row === undefined) throw new Error('Oczekiwano jednego wiersza, zapytanie nie zwróciło wyniku');
  return row;
}
