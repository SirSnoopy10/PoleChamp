# Model zagrożeń STRIDE – stan po zmianach Tech Leada

> IMP-400 · podstawa: `docs/01-architecture/05-bezpieczenstwo.md` §1 · uzupełnienia TL-04, TL-05, TL-06, TL-12, TL-13.
> Aktualizuj przy każdej zmianie oznaczonej w szablonie PR jako „zmiana bezpieczeństwa”.

## Zasoby i granice zaufania

| Zasób | Gdzie | Granica |
|---|---|---|
| Konto organizatora (e-mail, hasło, tokeny) | API (`app_user`), telefon (SecureStore) | Internet ↔ ALB ↔ API |
| Dane zawodniczek (imię, nazwisko, klub, rok urodzenia, niepełnoletność) | API (`athlete`), tablet (SQLite), PDF/CSV (S3) | API ↔ tablet; S3 podpisane URL |
| Oceny i komentarze sędziów | `score_sheet`, `score_sheet_revision`, outbox tabletu | Tablet ↔ API (`sync/push`) |
| PIN sędziego i weryfikator offline | `judge.pin_hash`, `pin_fingerprint`, weryfikator AES-GCM w SQLite | Tablet (offline) |
| Sekret i pepper urządzenia | SecureStore/Keystore tabletu, `device.secret_hash` | Parowanie |
| Klucze JWT, klucz HMAC `pin_fingerprint` | Secrets Manager (`jwt-signing`, `pin-fingerprint-hmac`) | IAM roli zadania ECS |

## STRIDE

| Kat. | Zagrożenie | Środki zaradcze | Weryfikacja |
|---|---|---|---|
| S | Obcy telefon zgaduje PIN-y przez API | Token urządzenia wymagany przed PIN-em; limity 10 globalnie / 30 na 10 min na urządzenie | TC-SEC-014, TC-AUTHZ-001 |
| S | Kradzież tabletu i logowanie offline (TL-04) | Weryfikator PBKDF2-SHA256 600 000 it. zaszyfrowany kluczem z HKDF(pepper urządzenia) z `aad = judgeId ‖ pinVersion`; okno 24 h od synchronizacji (TL-21); limit prób lokalnych; zdalne unieważnienie urządzenia | TC-SEC-016, TC-SEC-025, `apps/api/test/unit/pin-wrap.test.ts` |
| S | Wyciek bazy tabletu bez peppera (TL-05) | Pepper tylko w Keystore/Keychain (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`), nie w SQLite ani MMKV; bez kopii zapasowej | TC-SEC-016, MASVS-STORAGE |
| S | Ponowne użycie refresh tokenu | Rotacja, unieważnienie rodziny (`TOKEN_REUSED`) | TC-API-012 |
| T | Zmiana noty po fakcie / podmiana treści w outboxie | Wynik liczony na serwerze; rewizje tylko do dopisywania; `baseRevision` i `STALE_REVISION`; blokada kategorii | TC-API-090, TC-INT-008 |
| T | Odrzucone zgłoszenia (TL-13) przyjmowane bez kontroli | Przyjęcie tylko przez organizatora (`modules/rejected`), z audytem, treść od sędziego | TC-AUTHZ-001 |
| R | Sędzia zaprzecza ocenie | Rewizja z sesją (TL-12: `judge_session` z trybem `ONLINE_PIN`/`OFFLINE_PIN`), urządzeniem, czasem klienta i serwera; `CLOCK_SKEW` w audycie | TC-AUDIT-003 |
| I | Odtworzenie PIN-u z `pin_fingerprint` (TL-06) | HMAC-SHA256 kluczem z Secrets Manager (nie hash bez klucza); służy tylko do wykrycia duplikatów | TC-SEC-025 |
| I | Wyciek PII do logów / Sentry | `scrubPii`/`scrubText`, redakcja pino, `beforeSend` w aplikacji | TC-SEC-017, TC-AUDIT-002 |
| I | Sędzia czyta arkusze innych | `change_log.audience`, filtr `judge_id` | TC-RODO-004 |
| I | Formuły w CSV otwieranym w Excelu | Neutralizacja pól (`field` w `results-csv.ts`) | `apps/api/test/unit/csv-injection.test.ts` |
| D | Zalew logowań, PIN-ów, kodów parowania | Limity Valkey sprawdzane przed Argon2; WAF (SEC-GAP-01) | TC-SEC-013, TC-SEC-015 |
| D | Zawieszony Valkey | `commandTimeout` 500 ms (adapter Socket.IO bez – SEC-GAP-05) | TC-SYNC-019 |
| E | Token urządzenia/sędziego na trasach organizatora | `typ` w JWT, `@Auth` per trasa, domyślna odmowa | TC-SEC-010, macierz TC-AUTHZ |
| E | Organizator B na zasobach A | `OwnershipRepository` → 404 | TC-SEC-011 |
| E | Sesje sędziów po zmianie PIN-u (TL-12) | `PIN_VERSION_OUTDATED`, sesja offline ze starym PIN-em zapisywana jako `REVOKED` | TC-API-070 |

## Ryzyka zaakceptowane

- R-06: SQLite tabletu bez SQLCipher (mitygacje w `masvs-mapping.md`).
- Brak przypinania certyfikatów w MVP (05 §7).
