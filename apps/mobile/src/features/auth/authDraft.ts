/**
 * Adres e-mail przekazywany z logowania do „Nie pamiętasz hasła?” (UX-45) – w pamięci, nie w parametrach
 * trasy (dane osobowe poza adresem URL). Odczyt czyści wartość.
 */
let email = '';

export const authDraft = {
  setEmail(value: string) {
    email = value;
  },
  takeEmail(): string {
    const value = email;
    email = '';
    return value;
  },
};
