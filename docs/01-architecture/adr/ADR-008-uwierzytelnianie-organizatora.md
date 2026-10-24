# ADR-008: Uwierzytelnianie organizatora – własny moduł (e-mail + hasło, Argon2id, JWT + rotowany refresh token)

- **Status:** Zaakceptowana – potwierdzona przez Tech Leada 23.10.2026 (Q-12 zamknięte; uzupełnienia na końcu)
- **Data:** 2026-10-23
- **Powiązane:** [05-bezpieczenstwo.md §2](../05-bezpieczenstwo.md#2-uwierzytelnianie-organizatora), SCR-ORG-13, FR-101…107

## Kontekst
- Design nie zawiera ekranu logowania organizatora (luka G-01), a system musi rozróżniać właścicieli turniejów.
- Sędziowie mają zupełnie inny model (urządzenie + PIN, [ADR-005](ADR-005-uwierzytelnianie-sedziego-pin.md)), który i tak jest implementowany w backendzie.
- Dane mają zostać w UE. Liczba organizatorów w pierwszym roku: dziesiątki do setek.

## Decyzja
- Własny moduł `auth` w NestJS: rejestracja e-mail + hasło (min. 10 znaków, odrzucanie haseł z wycieków), **Argon2id**, weryfikacja e-maila kodem 6-cyfrowym, reset hasła linkiem (1 h).
- **JWT ES256** (access 15 min, `kid` + rotacja kluczy co 90 dni) i **nieprzezroczysty refresh token** (30 dni) rotowany przy każdym użyciu, z wykrywaniem ponownego użycia (unieważnienie rodziny).
- Jedna warstwa tokenów i guardów dla trzech typów podmiotów: `org`, `device`, `judge`.
- v1.1: Sign in with Apple / Google (wymóg App Store przy logowaniu społecznościowym), opcjonalne TOTP.

## Rozważane alternatywy
| Opcja | Za | Przeciw | Werdykt |
|---|---|---|---|
| **Auth0 / Clerk** | Gotowe UI, MFA, social login | Koszt per MAU, dane poza naszą kontrolą (region UE dostępny w planach płatnych), drugi model tożsamości obok urządzeń/PIN | Odrzucona |
| **AWS Cognito** | Ten sam dostawca chmury | Ograniczona elastyczność przepływów, trudna migracja użytkowników, słabe DX | Odrzucona |
| **Supabase Auth / Firebase Auth** | Proste | Wiąże z platformą odrzuconą w ADR-002 | Odrzucona |
| **Tylko magic link (bez hasła)** | Brak haseł do wycieku | Organizator w hali z zawodnym zasięgiem może nie odebrać maila – ryzyko utraty dostępu w dniu zawodów | Odrzucona dla MVP (opcja dodatkowa v1.1) |

## Konsekwencje
- ➕ Pełna kontrola, brak kosztów per użytkownik, jeden model tokenów.
- ➖ Odpowiedzialność za bezpieczeństwo implementacji (testy, przegląd, pentest przed produkcją).
- ⚠ Wymagane: biblioteki sprawdzone (`argon2`, `jose`), brak własnej kryptografii, testy przypadków nadużyć (enumeracja kont, brute force, reuse refresh tokenu).

## Weryfikacja Tech Leada (23.10.2026)

- **Q-12 – rozstrzygnięte:** hasła sprawdzane k-anonimowo w HIBP Pwned Passwords (bez klucza API i limitów, `Add-Padding: true`, timeout 1,5 s), z lokalną listą 100 000 haseł jako zapasem przy niedostępności HIBP ([05-bezpieczenstwo.md §2](../05-bezpieczenstwo.md#2-uwierzytelnianie-organizatora)).
- Biblioteki: `argon2` 0.45 (N-API, prebuildy), `jose` 6.x (ES256, `kid`).
- Usunięcie konta jest **Must** (App Store Review Guideline 5.1.1(v)) – FR-106 podniesione (TL-22). Dodatkowo strona WWW z wnioskiem o usunięcie konta (wymóg Google Play) – IMP-179.
- Linki z e-maili (reset hasła) jako linki uniwersalne `https://polechamp.app/reset?token=…` (pliki `.well-known` na stronie statycznej – IMP-179), z zapasowym schematem `polechamp://`.
