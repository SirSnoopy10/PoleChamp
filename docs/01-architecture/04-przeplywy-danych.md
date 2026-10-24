# Przepływy danych – kluczowe scenariusze

> Dokument: `01-architecture/04-przeplywy-danych.md` · Wersja 1.0 · 23.10.2026
> Endpointy: [03-api.md](03-api.md). Offline: [06-offline-i-synchronizacja.md](06-offline-i-synchronizacja.md). Reguły punktacji: [07-reguly-punktacji.md](../02-specification/07-reguly-punktacji.md).

Oznaczenia uczestników w diagramach: **OA** – aplikacja organizatora (telefon), **TA** – aplikacja sędziego (tablet), **LDB** – lokalna baza SQLite tabletu, **API** – backend REST, **DB** – PostgreSQL, **RT** – gateway Socket.IO, **WRK** – worker zadań, **S3** – magazyn plików.

## 1. Konfiguracja turnieju

```mermaid
sequenceDiagram
    autonumber
    actor O as Organizator
    participant OA as Aplikacja organizatora
    participant API as API
    participant DB as PostgreSQL
    O->>OA: SCR-ORG-02 wypełnia „Nowy turniej”
    OA->>API: POST /v1/tournaments (Idempotency-Key)
    API->>DB: INSERT tournament (DRAFT) + audit_log + change_log
    API-->>OA: 201 turniej
    OA-->>O: toast „Utworzono turniej”, SCR-ORG-03
    O->>OA: SCR-ORG-05 „Nowa kategoria” (styl Exotic)
    OA->>API: POST /v1/tournaments/t/categories
    API->>DB: INSERT category + 6 kryteriów + 2 kary z szablonu stylu
    API-->>OA: 201 kategoria
    O->>OA: SCR-ORG-09/10 korekta kryteriów i kar
    OA->>API: PATCH /v1/criteria/k (If-Match)
    API->>DB: UPDATE (tylko gdy kategoria DRAFT)
    API-->>OA: 200
    O->>OA: SCR-ORG-11 „Nowa zawodniczka”
    OA->>API: POST /v1/categories/c/entries
    API->>DB: INSERT athlete + entry (unikalny numer w turnieju)
    API-->>OA: 201 (lub 409 START_NUMBER_TAKEN)
    O->>OA: SCR-ORG-15 „Nowy sędzia”
    OA->>API: POST /v1/tournaments/t/judges
    API->>API: losuje PIN (bez trywialnych, unikalny w turnieju – pin_fingerprint)
    API->>API: pin_hash (Argon2id) + pin_offline_verifier (PBKDF2 600k, raz – TL-04)
    API->>DB: INSERT judge (pin_hash, pin_fingerprint, pin_offline_salt, pin_offline_verifier)
    API-->>OA: 201 + PIN jednorazowo
    OA-->>O: pokazuje PIN do przekazania sędziemu
```

## 2. Parowanie tabletu z turniejem

```mermaid
sequenceDiagram
    autonumber
    actor O as Organizator
    participant OA as Aplikacja organizatora
    participant API as API
    participant DB as PostgreSQL
    participant TA as Tablet
    participant LDB as SQLite tabletu
    O->>OA: SCR-ORG-16 „Sparuj tablet”
    OA->>API: POST /v1/tournaments/t/pairing-codes
    API->>DB: INSERT pairing_code (hash, ważny 10 min)
    API-->>OA: kod K7QM-4ZTX + QR
    TA->>TA: SCR-JDG-06 skan QR lub wpisanie kodu
    TA->>API: POST /v1/devices/pair (kod, nazwa, platforma)
    API->>DB: weryfikacja kodu, INSERT device (secret_hash, pepper)
    API-->>TA: deviceId + deviceSecret + pinPepper
    TA->>TA: zapis sekretu i peppera w SecureStore / Keystore
    TA->>API: POST /v1/devices/token
    API-->>TA: deviceToken (1 h)
    TA->>API: GET /v1/sync/snapshot
    API->>DB: odczyt turnieju, kategorii, list, sędziów
    API->>API: szyfrowanie zapisanych weryfikatorów PIN kluczem z peppera urządzenia (AES-256-GCM, TL-04)
    API-->>TA: migawka + kursor
    TA->>LDB: zapis migawki (transakcja)
    TA-->>TA: SCR-JDG-01 wybór profilu
```

## 3. Logowanie sędziego PIN-em (online i offline)

```mermaid
sequenceDiagram
    autonumber
    actor S as Sędzia
    participant TA as Tablet
    participant LDB as SQLite tabletu
    participant API as API
    participant DB as PostgreSQL
    S->>TA: SCR-JDG-01 wybiera profil „Katarzyna Nowak”
    S->>TA: SCR-JDG-02 wpisuje 4 cyfry (autozatwierdzenie)
    TA->>LDB: sprawdź lokalną blokadę prób
    alt Blokada lokalna aktywna
        TA-->>S: „Zbyt wiele prób. Spróbuj za 30 s.”
    else Sieć dostępna
        TA->>API: POST /v1/judge-sessions (judgeId, pin)
        API->>DB: weryfikacja Argon2id, licznik prób, pin_locked_at
        alt PIN poprawny
            API->>DB: INSERT judge_session (ONLINE_PIN), zamknięcie poprzedniej sesji sędziego
            API-->>TA: judgeToken + sessionId
            TA->>API: GET /v1/judge/me/score-sheets
            API-->>TA: własne arkusze sędziego
            TA->>LDB: uzupełnienie arkuszy, reset licznika prób
            TA-->>S: SCR-JDG-03 „Dzień dobry, Katarzyna”
        else PIN błędny
            API-->>TA: 401 PIN_INVALID (remainingAttempts)
            TA-->>S: „Nieprawidłowy PIN — spróbuj ponownie”
        else Sędzia zablokowany
            API-->>TA: 423 PIN_LOCKED (requiresReset)
            TA-->>S: SCR-JDG-08 „PIN zablokowany. Poproś organizatora o reset.”
        end
    else Brak sieci (fallback offline)
        TA->>LDB: odszyfrowanie weryfikatora (pepper z Keystore), PBKDF2(PIN, salt) i porównanie stałoczasowe, pinVersion
        alt Zgodny, logowanie offline dozwolone i migawka młodsza niż 24 h
            TA->>LDB: local_judge_session (OFFLINE_PIN) + mutacja JUDGE_SESSION_STARTED do outboxu
            TA-->>S: SCR-JDG-03 + wskaźnik „Offline”
        else Niezgodny
            TA->>LDB: licznik prób +1 (eskalacja blokady)
            TA-->>S: „Nieprawidłowy PIN — spróbuj ponownie”
        end
    end
```

## 4. Start kategorii

```mermaid
sequenceDiagram
    autonumber
    actor O as Organizator
    participant OA as Aplikacja organizatora
    participant API as API
    participant DB as PostgreSQL
    participant RT as Realtime
    participant TA as Tablety
    participant LDB as SQLite tabletów
    O->>OA: SCR-ORG-06 „Rozpocznij kategorię”
    OA->>API: POST /v1/categories/c/start
    API->>DB: BEGIN, SELECT category FOR UPDATE
    API->>API: walidacja (kryteria, aktywne starty, sędziowie, turniej nie FINISHED)
    alt Warunki spełnione
        API->>DB: category IN_PROGRESS, category_judge = aktywni sędziowie, turniej DRAFT na IN_PROGRESS (jeśli trzeba)
        API->>DB: audit_log, change_log, domain_event, COMMIT
        API-->>OA: 200
        OA-->>O: toast „Kategoria rozpoczęta”, dolny pasek „Zakończ i zablokuj” + „Eksport PDF”
        RT-->>TA: category.updated (c, IN_PROGRESS) + sync.hint
        TA->>API: GET /v1/sync/changes?since=kursor
        API-->>TA: zmiany
        TA->>LDB: kategoria Trwa (karta przestaje być przygaszona)
    else Brak warunków
        API-->>OA: 409 START_REQUIREMENTS_NOT_MET (np. brak zawodniczek)
        OA-->>O: toast „Dodaj co najmniej jedną zawodniczkę.”
    end
```

## 5. Ocena online i przeliczenie wyników

```mermaid
sequenceDiagram
    autonumber
    actor S as Sędzia
    participant TA as Tablet
    participant LDB as SQLite tabletu
    participant API as API
    participant DB as PostgreSQL
    participant RT as Realtime
    participant OA as Aplikacja organizatora
    S->>TA: SCR-JDG-05 ustawia noty i kary
    TA->>TA: @polechamp/scoring liczy „Twój wynik” na żywo
    S->>TA: „Zatwierdź i dalej”
    TA->>LDB: BEGIN, upsert local_score_sheet (PENDING, revision+1), INSERT outbox, COMMIT
    TA-->>S: toast „Zapisano ocenę: Magdalena Kaczmarek”, następna nieoceniona
    TA->>API: POST /v1/sync/push (mutacja SUBMIT_SCORE_SHEET)
    API->>DB: BEGIN, sprawdzenie processed_mutation (idempotencja)
    API->>DB: SELECT category FOR SHARE (status IN_PROGRESS), panel, start ACTIVE
    API->>API: walidacja zakresów i kompletności, liczenie sumy sędziego
    API->>DB: upsert score_sheet + score_value + score_penalty, INSERT score_sheet_revision
    API->>API: przeliczenie kategorii (średnie, remisy, miejsca)
    API->>DB: upsert category_result, results_version+1
    API->>DB: audit_log, change_log (audience sędzia), domain_event, processed_mutation, COMMIT
    API-->>TA: APPLIED (revision, serverTotal)
    TA->>LDB: arkusz SYNCED, usunięcie z outboxu
    RT-->>OA: scoresheet.accepted, progress.updated, results.updated
    OA->>API: GET /v1/categories/c/results (gdy otwarta zakładka Wyniki)
    API-->>OA: ranking
```

## 6. Ocena offline i synchronizacja

```mermaid
sequenceDiagram
    autonumber
    actor S as Sędzia
    participant TA as Tablet
    participant LDB as SQLite tabletu
    participant SE as SyncEngine
    participant API as API
    participant DB as PostgreSQL
    Note over TA,API: Sieć w hali niedostępna
    loop Kolejne występy
        S->>TA: Zatwierdź ocenę
        TA->>LDB: arkusz PENDING + outbox
        TA-->>S: toast, wskaźnik „Offline · n w kolejce”
        SE->>API: POST /v1/sync/push
        API--xSE: timeout / brak sieci
        SE->>SE: backoff 1 s, 2 s, 4 s … maks. 60 s (z losowym rozrzutem)
    end
    Note over TA,API: Sieć wraca (zdarzenie NetInfo)
    SE->>API: POST /v1/devices/token (jeśli token wygasł)
    API-->>SE: deviceToken
    SE->>LDB: pobierz do 100 mutacji FIFO
    SE->>API: POST /v1/sync/push (paczka)
    API->>DB: każda mutacja w osobnej transakcji, idempotentnie
    API-->>SE: wyniki per mutacja (APPLIED, DUPLICATE, REJECTED)
    SE->>LDB: APPLIED i DUPLICATE na SYNCED, REJECTED na REJECTED + kod
    SE->>API: GET /v1/sync/changes?since=kursor
    API-->>SE: zmiany (np. blokada kategorii, nowe zawodniczki)
    SE->>LDB: zastosowanie zmian, nowy kursor
    SE-->>TA: wskaźnik „Zsynchronizowano”
```

## 7. Zablokowanie kategorii (z urządzeniem offline)

```mermaid
sequenceDiagram
    autonumber
    actor O as Organizator
    participant OA as Aplikacja organizatora
    participant API as API
    participant DB as PostgreSQL
    participant RT as Realtime
    participant T1 as Tablet 1 (online)
    participant T2 as Tablet 2 (offline, 3 oceny w kolejce)
    O->>OA: „Zakończ i zablokuj”
    OA->>API: POST /v1/categories/c/lock (force false)
    API->>DB: liczba brakujących ocen, urządzenia z pending lub bez kontaktu dłużej niż 2 min
    API-->>OA: 409 LOCK_WARNINGS (brakuje 15 ocen, Tablet 2 ma 3 niewysłane)
    OA-->>O: SCR-ORG-18 ostrzeżenie
    alt Organizator czeka
        O->>OA: „Anuluj” i prosi o połączenie Tabletu 2
    else Organizator blokuje mimo to
        O->>OA: „Zablokuj mimo to”
        OA->>API: POST /v1/categories/c/lock (force true)
        API->>DB: LOCKED, ostateczny ranking, final_results_hash, audit, domain_event
        API-->>OA: 200, toast „Kategoria zakończona”
        RT-->>T1: category.locked
        T1->>T1: SCR-JDG-04/05 tylko podgląd, baner blokady
        Note over T2: później wraca sieć
        T2->>API: POST /v1/sync/push (3 mutacje)
        API->>DB: INSERT rejected_submission (CATEGORY_LOCKED) x3, domain_event
        API-->>T2: REJECTED CATEGORY_LOCKED x3
        T2->>T2: arkusze REJECTED, baner „3 oceny nie zostały przyjęte – kategoria zablokowana”
        RT-->>OA: rejected.created
        OA-->>O: baner „Odrzucone oceny (3)” – SCR-ORG-22
        opt Organizator przyjmuje
            O->>OA: „Odblokuj”, potem „Przyjmij” przy zgłoszeniach
            OA->>API: POST /v1/categories/c/unlock oraz POST /v1/rejected-submissions/r/accept
            API->>DB: arkusze z payloadu, rewizje (actor ORGANIZER w imieniu sędziego), przeliczenie
            O->>OA: ponownie „Zakończ i zablokuj”
        end
    end
```

## 8. Zakończenie turnieju

```mermaid
sequenceDiagram
    autonumber
    actor O as Organizator
    participant OA as Aplikacja organizatora
    participant API as API
    participant DB as PostgreSQL
    participant RT as Realtime
    participant TA as Tablety
    O->>OA: SCR-ORG-03 „Zakończ turniej”
    OA-->>O: SCR-ORG-04 „Zakończyć turniej?”
    O->>OA: „Zakończ turniej”
    OA->>API: POST /v1/tournaments/t/finish (If-Match)
    API->>DB: BEGIN, turniej FOR UPDATE
    API->>DB: kategorie IN_PROGRESS na LOCKED (ostateczne wyniki, hash)
    API->>DB: kategorie DRAFT oznaczone jako nierozegrane (bez zmiany statusu)
    API->>DB: turniej FINISHED, zamknięcie sesji sędziów, audit, domain_event, COMMIT
    API-->>OA: 200 (autoLockedCategoryIds, unplayedCategoryIds)
    OA-->>O: toast „Turniej zakończony”, przycisk akcji znika, turniej w sekcji Zakończone
    RT-->>TA: tournament.updated (FINISHED), session.revoked (TOURNAMENT_FINISHED – TL-14)
    TA->>TA: wylogowanie, kategorie tylko do odczytu, dalsza wysyłka outboxu (odrzucenia trafiają do organizatora)
```

## 9. Eksport PDF

```mermaid
sequenceDiagram
    autonumber
    actor O as Organizator
    participant OA as Aplikacja organizatora
    participant API as API
    participant DB as PostgreSQL
    participant WRK as Worker
    participant S3 as S3
    O->>OA: „Eksport PDF” (kategoria) lub ikona PDF (turniej)
    OA->>API: GET /v1/categories/c/results (lub /tournaments/t/results)
    API-->>OA: dane rankingu
    OA-->>O: SCR-ORG-12 „Podgląd PDF”
    O->>OA: „Pobierz PDF”
    OA->>API: POST /v1/exports (scope, id)
    API->>DB: INSERT export_job (QUEUED) z wersjami wyników
    API-->>OA: 202 exportId
    WRK->>DB: pobierz zlecenie, odczyt wyników z zapisanych wersji
    WRK->>WRK: render pdfmake (Inter, PL), stopka z datą, wersją i sumą SHA-256
    WRK->>S3: PUT exports/t/exportId.pdf (SSE-KMS, wygasa po 7 dniach)
    WRK->>DB: export_job DONE
    loop co 1 s, maks. 30 s
        OA->>API: GET /v1/exports/exportId
    end
    API-->>OA: DONE + podpisany URL (15 min)
    OA->>S3: GET pliku
    OA-->>O: systemowy arkusz udostępniania, toast „PDF zapisany”
```

## 10. Przeliczenie wyników – algorytm (skrót)

Wykonywane w transakcji przyjęcia arkusza, przy odblokowaniu/blokadzie, wycofaniu i przywróceniu startu, dodaniu startu do kategorii Trwa, przyjęciu odrzuconego zgłoszenia oraz (uzupełnienie TL-18) przy dodaniu, dezaktywacji i ponownej aktywacji sędziego (zmienia się `J`, a więc `is_complete` i postęp) – dla wszystkich kategorii `IN_PROGRESS` turnieju:

1. Wczytaj aktywne starty kategorii, panel (J), arkusze (`total_hundredths`, noty kryterium rozstrzygającego, sumy kar).
2. Dla każdego startu: `n` = liczba arkuszy, `S` = Σ wyników sędziów, `official` = round_half_up(S / n, 2 miejsca) (dla `MEAN`).
3. Sortuj: `official` malejąco → średnia kryterium rozstrzygającego malejąco → średnia kar rosnąco → ex aequo.
4. Nadaj miejsca metodą „1, 2, 2, 4”. Starty bez ocen i wycofane dostają `rank = NULL`.
5. Zapisz `category_result`, zwiększ `results_version`, zapisz `domain_event results.updated`.

Pełna specyfikacja: [07-reguly-punktacji.md](../02-specification/07-reguly-punktacji.md).
