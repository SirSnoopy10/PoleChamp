# Inwentarz danych osobowych

> IMP-406 · NFR-501, NFR-502, NFR-507 · stan schematu: migracje `apps/api/migrations` (test TC-RODO-003 porównuje
> kolumny `athlete`, `judge`, `app_user` z tym dokumentem). Podstawy prawne i retencja – do potwierdzenia przez
> prawnika (Q-10). Role: organizator = administrator danych zawodniczek i sędziów; PoleChamp = podmiot
> przetwarzający (art. 28) oraz administrator danych kont organizatorów (05-bezpieczenstwo §5.1).

## Baza API (PostgreSQL, AWS RDS eu-central-1; kopie eu-west-1)

| Tabela | Kolumny z danymi osobowymi | Osoba | Cel | Podstawa (propozycja) | Retencja | Realizacja |
|---|---|---|---|---|---|---|
| `app_user` | `email`, `display_name`, `password_hash`, `locale`, `terms_accepted_at`, `terms_version` | organizator | konto, logowanie, komunikacja | art. 6 ust. 1 lit. b | do usunięcia konta + 30 dni | `purge_account` (`apps/api/src/worker/retention/retention.job.ts`) |
| `auth_refresh_token`, `auth_email_token` | skróty tokenów, czasy | organizator | sesje, weryfikacja e-maila, reset hasła | lit. b | do wygaśnięcia / usunięcia konta | kaskada z `app_user` |
| `athlete` | `full_name`, `club`, `birth_year`, `is_minor`, `guardian_consent_confirmed` | zawodniczka | przeprowadzenie zawodów, wyniki | organizator: lit. b i f | pseudonimizacja 24 mies. po zakończeniu turnieju (`RETENTION_PSEUDONYMIZE_MONTHS`) | `scrub_athlete_pii`, `pseudonymized_at` |
| `entry` | `start_number` (w powiązaniu z zawodniczką) | zawodniczka | lista startowa | lit. b | jak turniej | – |
| `judge` | `full_name`, `initials`, `pin_hash`, `pin_fingerprint`, `pin_offline_salt`, `pin_offline_verifier` | sędzia | uwierzytelnienie i przypisanie ocen | organizator: lit. b / f | pseudonimizacja jak zawodniczki | retencja turnieju |
| `judge_session`, `device` | identyfikatory, czasy, `model`, `os_version`, `battery_level` | sędzia (pośrednio) | rozliczalność ocen, diagnostyka tabletu | lit. f | jak turniej | – |
| `score_sheet` | `comment`, noty | zawodniczka, sędzia | ocena | lit. b | jak turniej; komentarz czyszczony przy pseudonimizacji | retencja |
| `score_sheet_revision` | `snapshot` (noty, komentarz) | zawodniczka, sędzia | rozliczalność | lit. f | dane osobowe usuwane z `snapshot` przy pseudonimizacji (TL-16) | retencja |
| `audit_log` | `before`, `after`, `ip`, `actor_id` | organizator, zawodniczka, sędzia | audyt zmian (NFR-409) | lit. f / art. 32 | 36 mies. (partycje), `ip` zerowane po 90 dniach | `drop_old_audit_partitions` |
| `rejected_submission` | treść odrzuconej oceny | zawodniczka, sędzia | rozstrzygnięcie konfliktów | lit. b | jak turniej | retencja |
| `change_log`, `domain_event` | kopie zmian encji | jak wyżej | synchronizacja tabletów, zdarzenia | lit. b | 30 dni po zakończeniu / 7 dni po publikacji | retencja |

## Pozostałe lokalizacje

| Lokalizacja | Dane | Retencja | Uwagi |
|---|---|---|---|
| S3 eu-central-1 (eksporty PDF/CSV) | wyniki z nazwiskami | 7 dni (tag `expires=7d`) | podpisane URL; SSE-KMS (`S3_KMS_KEY_ID`) |
| CloudWatch Logs eu-central-1 | logi API bez PII (redakcja pino, `scrubText`) | 30 dni | TC-SEC-017 |
| Valkey (ElastiCache) eu-central-1 | liczniki limitów (e-mail jako skrót), kolejki (treść e-maila do wysłania) | minuty – godziny | bez trwałości |
| SES eu-central-1 | e-mail organizatora, kod weryfikacyjny | wg SES | tylko organizatorzy |
| Sentry (region UE) | zdarzenia błędów aplikacji bez PII (`scrubPii`, `beforeSend`) | 90 dni (plan Sentry) | `apps/mobile/src/observability/scrub.ts` |
| Tablet (SQLite) | imiona, nazwiska, kluby, numery, oceny, komentarze własne sędziego | 7 dni po zakończeniu turnieju / odłączenie | bez roku urodzenia; R-06 |
| Telefon organizatora (MMKV) | cache zapytań (listy, wyniki) | do wylogowania | czyszczony przy wylogowaniu |
| Kopie RDS (PITR, eu-west-1) | jak baza | 35 dni | po 35 dniach brak danych sprzed pseudonimizacji |

## Czego nie zbieramy (05-bezpieczenstwo §5.2)

PESEL, adres, telefon, e-mail zawodniczki, pełna data urodzenia, zdjęcia, wideo, dane o zdrowiu, kontakt sędziego.
