# Testy nadużyć (IMP-404)

> NFR-405, NFR-401, ADR-008. Dwa poziomy: **automatyczne w CI** (Vitest + Testcontainers, każdy PR z API) i **sieciowe
> na staging przed wydaniem** (`.github/workflows/security.yml`, ręcznie lub tag `v*`). Wyniki przebiegów staging
> dopisywać w tabeli „Przebiegi”.

| TC | Scenariusz | CI (API) | Staging (przed wydaniem) |
|---|---|---|---|
| TC-SEC-011 | IDOR – każdy zasób t1 tokenem innego organizatora → 404 | `apps/api/test/authz/matrix.test.ts` (macierz × 8 kontekstów) | pentest (IMP-408) |
| TC-SEC-012 | Enumeracja kont: `register`, `login`, `password/forgot` – treść i czas | `apps/api/test/integration/abuse.test.ts` (12 par, różnica median < 50 ms) | `tools/security/src/enumeration.ts` (do 200 prób, konta `SECURITY_ENUM_EMAILS`) |
| TC-SEC-013 | Brute force logowania: konto z rotacją IP, IP na różne konta | `apps/api/test/integration/abuse.test.ts`, TC-API-010 w `apps/api/test/integration/auth.test.ts` | `tools/security/k6/bruteforce-login.js` (rotacja IP tylko z wielu źródeł – WAF) |
| TC-SEC-014 | Brute force PIN-u: blokada 10 globalnie, 30 / 10 min urządzenie, bez tokenu 401 | `apps/api/test/integration/abuse.test.ts`, TC-API-071…073 w `apps/api/test/integration/devices.test.ts` | `tools/security/k6/bruteforce-pin.js` |
| TC-SEC-015 | Brute force kodu parowania: limit 10 / 10 min / IP | `apps/api/test/integration/devices.test.ts` | `tools/security/k6/bruteforce-pairing.js` (1 000 kodów) |
| TC-API-012 | Ponowne użycie refresh tokenu → unieważnienie rodziny | `apps/api/test/integration/auth.test.ts` | – |
| TC-SEC-021 | Linki głębokie: złośliwy `pair?c=`, token resetu z XSS / za długi, brak automatycznego parowania | `apps/mobile/src/features/pairing/__tests__/deep-links.test.ts`, `apps/mobile/src/features/system/__tests__/routing.test.tsx` | ręcznie na buildzie `preview` (`adb shell am start -d …`) |
| TC-SEC-022 | Wstrzyknięcia i fuzzing: każda trasa kontraktu × wrogie parametry i treści → brak 5xx | `apps/api/test/integration/abuse.test.ts` | Schemathesis 4.31.0 `--checks all` (`security.yml`) |

## Poprawki znalezione zestawem

- Link `polechamp://pair?c=…` parował tablet automatycznie – teraz tylko wypełnia formularz (TC-SEC-021).
- `t` w linku parowania przyjmowany bez walidacji – teraz tylko UUID; link > 512 znaków odrzucany.
- `POST /auth/login` przyjmował hasło dowolnej długości (do 1 MB treści) i liczył dla niego Argon2 – limit 128
  znaków jak przy rejestracji (ASVS V6, DoS CPU).
- Logi nieobsłużonych wyjątków zawierały parametry zapytań Drizzle i wartości z komunikatów PostgreSQL – `safeError`
  (IMP-403, TC-SEC-017).

## Ograniczenia

- k6 z jednej maszyny nie rotuje adresu źródłowego – scenariusz „konto z rotacją IP” w pełni tylko w CI (nagłówek
  `remoteAddress` w `inject`) albo z wielu agentów k6 / w pentescie.
- Staging, konta syntetyczne i sekrety workflow nie istnieją (brak AWS) – przebiegi sieciowe niewykonane.

## Przebiegi (staging)

| Data | Wersja | Wynik | Raport |
|---|---|---|---|
| – | – | niewykonane (brak staging) | – |
