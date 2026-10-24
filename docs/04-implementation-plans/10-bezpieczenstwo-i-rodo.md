# EP-10 – Bezpieczeństwo i RODO

> Dokument: `04-implementation-plans/10-bezpieczenstwo-i-rodo.md` · Tech Lead (Agent 2) · 23.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md)

Zadania przekrojowe: mapowanie OWASP ASVS 5.0 L2 i MASVS 2.x (TL-26), twardnienie przechowywania na urządzeniach, testy nadużyć, rotacja kluczy, pentest zewnętrzny przed pierwszym turniejem produkcyjnym (NFR-408) i materiały dla prawnika (Q-10). Wymagania bezpieczeństwa w samych funkcjach są częścią zadań EP-03/04/08/09 (DoD).

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 10 | 57 h | BE 31 · MOB 11 · DEVOPS 3 · QA 12 |


## Zadania

### IMP-400 – Mapowanie ASVS 5.0 L2 i model zagrożeń
- **Epik / obszar:** EP-10 Bezpieczeństwo i RODO | **Rola:** BE
- **Cel:** Każde wymaganie OWASP ASVS 5.0 poziomu 2 ma przypisaną implementację i test w API (lub uzasadnione wyłączenie), a model zagrożeń odzwierciedla zmiany Tech Leada.
- **Zakres:** Arkusz mapowania wymagań V1–V17 na implementację i testy, aktualizacja STRIDE (05 §1) o zmiany TL, checklista PR dla zmian bezpieczeństwa; **Poza zakresem:** Pentest (IMP-408)
- **Zależności:** [IMP-113](03-backend-konto-i-konfiguracja-turnieju.md#imp-113--jwt-es256-i-guardy-ról)
- **Odwołania:** NFR-401, TL-26, [TC-SEC-001](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-001)
- **Kroki:**
  1. Utwórz `docs-dev/security/asvs-mapping.md` w repozytorium kodu: tabela rozdziałów V1–V17 ASVS 5.0 L2 → moduł (`src/modules/auth`, `src/common/guards`, `src/common/rate-limit`…) → TC → status (spełnione / częściowo / nie dotyczy z uzasadnieniem).
  2. Zaktualizuj model STRIDE z 05-bezpieczenstwo §1 o zmiany TL (weryfikator PIN offline TL-04, pepper urządzenia TL-05, `pin_fingerprint` TL-06, sesje TL-12, odrzucenia TL-13) w `docs-dev/security/threat-model.md`.
  3. Dodaj szablon PR `.github/pull_request_template.md` z checklistą bezpieczeństwa (nowa trasa → `x-permissions` i wiersz macierzy TC-AUTHZ, dane osobowe → redakcja logów, sekrety → Secrets Manager).
  4. Oznacz luki jako zadania w backlogu z priorytetem i powiąż je z zakresem pentestu (IMP-408).
  5. Dopisz lub uruchom przypadki TC-SEC-001 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-400: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SEC-001 przechodzi (przegląd TL)
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-401 – Mapowanie MASVS 2.x (MAS-L1 + wybrane L2)
- **Epik / obszar:** EP-10 Bezpieczeństwo i RODO | **Rola:** MOB
- **Cel:** Kontrole OWASP MASVS 2.x (MAS-L1 i wybrane L2) mają przypisaną implementację w aplikacji i test MASTG, a odstępstwo dotyczące przechowywania jest jawnie zaakceptowane.
- **Zakres:** Mapowanie kontroli MASVS na implementację, testy MASTG do wykonania, wyjątek STORAGE-1 L2 (R-06); **Poza zakresem:** –
- **Zależności:** [IMP-356](09-mobile-offline-i-synchronizacja.md#imp-356--uwierzytelnianie-urządzenia-na-tablecie)
- **Odwołania:** NFR-401, TL-26, R-06, [TC-SEC-002](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-002)
- **Kroki:**
  1. Utwórz `docs-dev/security/masvs-mapping.md`: grupy MASVS-STORAGE, CRYPTO, AUTH, NETWORK, PLATFORM, CODE, RESILIENCE, PRIVACY → plik/moduł (`src/crypto/pinVerifier.ts`, `src/data/auth/*`, `src/data/local/LocalDb.ts`) → test MASTG → status.
  2. Opisz wyjątek STORAGE-1 L2 (R-06): dane turnieju w SQLite bez szyfrowania SQLCipher, mitygacje (pepper w Keystore, brak kopii zapasowych, czyszczenie po 7 dniach).
  3. Wypisz testy MASTG do wykonania ręcznie przed wydaniem (np. MASTG-TEST-0001 dane w logach, przechowywanie sekretów, przypinanie TLS – decyzja „nie” z uzasadnieniem) w liście kontrolnej wydania.
  4. Dodaj odwołania do przypadków TC-SEC w mapowaniu i powiąż wyniki z raportem pentestu.
  5. Dopisz lub uruchom przypadki TC-SEC-002 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-401: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SEC-002 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-402 – Twardnienie przechowywania na urządzeniach
- **Epik / obszar:** EP-10 Bezpieczeństwo i RODO | **Rola:** MOB
- **Cel:** Sekrety tabletu i organizatora są wyłącznie w Keychain/Keystore, baza tabletu nie trafia do kopii zapasowych, a buildy produkcyjne nie wypisują logów debug.
- **Zakres:** Atrybuty SecureStore (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, `requireAuthentication: false`), wyłączenie kopii zapasowej danych aplikacji Android (`allowBackup=false`) dla bazy tabletu, wyłączenie logów debug w produkcji, brak PIN-u w schowku poza świadomym „Kopiuj” u organizatora; **Poza zakresem:** –
- **Zależności:** [IMP-356](09-mobile-offline-i-synchronizacja.md#imp-356--uwierzytelnianie-urządzenia-na-tablecie), [IMP-250](07-mobile-ekrany-organizatora.md#imp-250--scr-org-13--logowanie-i-sesja-organizatora)
- **Odwołania:** NFR-401, ADR-005, 05-bez §7, [TC-SEC-016](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-016), [TC-SEC-020](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-020)
- **Kroki:**
  1. Ujednolić opcje SecureStore w `src/data/secure/secureStore.ts`: `keychainAccessible: AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` dla tokenów organizatora, sekretu i peppera tabletu (dostęp z wysyłki w tle), `requireAuthentication: false`, brak synchronizacji z iCloud Keychain.
  2. Napisz config plugin `plugins/with-no-backup.js`: `android:allowBackup="false"`, `android:fullBackupContent` i `dataExtractionRules` wykluczające bazę i MMKV; iOS – `NSURLIsExcludedFromBackupKey` dla katalogu bazy.
  3. Dodaj `babel-plugin-transform-remove-console` dla profilu `production` (poza `console.error` do Sentry).
  4. Sprawdź, że PIN trafia do schowka wyłącznie przez „Kopiuj” u organizatora i jest czyszczony po 60 s (`Clipboard.setStringAsync('')`).
  5. Przejrzyj zrzut systemu plików aplikacji na emulatorze (`adb shell run-as`) i zapisz wynik w mapowaniu MASVS.
  6. Dopisz lub uruchom przypadki TC-SEC-016, TC-SEC-020 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-402: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SEC-016, TC-SEC-020 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-403 – Testy usuwania PII z telemetrii
- **Epik / obszar:** EP-10 Bezpieczeństwo i RODO | **Rola:** QA
- **Cel:** Nocny test na staging potwierdza, że nazwiska, e-maile, komentarze i PIN-y nie trafiają do logów CloudWatch ani do Sentry.
- **Zakres:** Zautomatyzowany test: dane ze znacznikiem, wymuszone błędy w API i aplikacji, wyszukiwanie znacznika w Sentry (API) i CloudWatch Logs Insights; **Poza zakresem:** –
- **Zależności:** [IMP-018](01-fundamenty-i-devops.md#imp-018--logowanie-strukturalne-i-korelacja-żądań), [IMP-218](06-mobile-fundamenty-i-design-system.md#imp-218--integracja-sentry-w-aplikacji)
- **Odwołania:** NFR-504, [TC-SEC-017](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-017)
- **Kroki:**
  1. Napisz `tools/scripts/pii-scan.ts`: wygeneruj unikalny znacznik (`PIIMARK-<uuid>`) i wstaw go jako nazwisko zawodniczki, klub, komentarz oceny i nazwa wyświetlana konta przez API staging.
  2. Wymuś błędy z tymi danymi w API (żądanie z niepoprawnym polem, wymuszony 500 przez flagę testową) i w aplikacji (zdarzenie testowe z buildu `preview` przez Maestro).
  3. Przeszukaj CloudWatch Logs Insights (`fields @message | filter @message like /PIIMARK/`) i Sentry API (`/api/0/projects/{org}/{proj}/events/?query=PIIMARK`).
  4. Dodaj workflow nocny `pii-scan.yml` kończący się błędem przy trafieniu i alertem do kanału zespołu.
  5. Dopisz lub uruchom przypadki TC-SEC-017 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-403: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SEC-017 automatyczny
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-404 – Zestaw testów nadużyć
- **Epik / obszar:** EP-10 Bezpieczeństwo i RODO | **Rola:** QA
- **Cel:** Zespół ma powtarzalny zestaw testów nadużyć, który potwierdza działanie limitów, brak enumeracji kont i brak dostępu do cudzych zasobów.
- **Zakres:** Skrypty k6/Node: enumeracja kont (treść i czas), brute force logowania, PIN-u, kodu parowania, ponowne użycie refresh tokenu, IDOR (z TC-AUTHZ), fuzzing Schemathesis; **Poza zakresem:** –
- **Zależności:** [IMP-116](03-backend-konto-i-konfiguracja-turnieju.md#imp-116--logowanie-blokada-konta-refresh-z-rotacją-wylogowanie), [IMP-141](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-141--urządzenia-parowanie-token-lista-nazwa-unieważnienie), [IMP-143](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-143--sesje-sędziów-online-i-limity-prób-pin), [IMP-453](11-qa-i-automatyzacja-testow.md#imp-453--generator-testów-macierzy-uprawnień)
- **Odwołania:** NFR-405, NFR-401, ADR-008, [TC-SEC-011](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-011)…015, [TC-SEC-021](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-021), [TC-SEC-022](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-022)
- **Kroki:**
  1. Napisz `tools/security/enumeration.ts`: porównanie treści, statusów i czasów odpowiedzi `register`, `login` i `password/forgot` dla istniejącego i nieistniejącego e-maila (różnica median < 50 ms).
  2. Napisz skrypty k6 `tools/security/bruteforce-*.js` dla logowania (limit 5/15 min konto, 20/15 min IP), PIN-u (blokada 10 globalnie, 30/10 min urządzenie) i kodu parowania (10/10 min IP).
  3. Napisz test ponownego użycia refresh tokenu (unieważnienie rodziny) i test IDOR na podstawie macierzy TC-AUTHZ (token organizatora B na zasobach A).
  4. Uruchom Schemathesis (`schemathesis run dist/openapi.json --checks all`) na staging z tokenem syntetycznym i zapisz raport.
  5. Dodaj uruchamianie zestawu przed wydaniem w `security.yml` i opis wyników w `docs-dev/security/abuse-tests.md`.
  6. Dopisz lub uruchom przypadki TC-SEC-011…015, TC-SEC-021, TC-SEC-022 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-404: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SEC-011…015, TC-SEC-021, TC-SEC-022 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-405 – Rotacja kluczy JWT – procedura
- **Epik / obszar:** EP-10 Bezpieczeństwo i RODO | **Rola:** DEVOPS
- **Cel:** Klucze podpisu JWT można zrotować co 90 dni bez wylogowania użytkowników i bez przerwy w działaniu tabletów.
- **Zakres:** Skrypt generowania nowego klucza, publikacja jako „następny”, przełączenie aktywnego, wygaszenie poprzedniego po 30 dniach; runbook; **Poza zakresem:** –
- **Zależności:** [IMP-113](03-backend-konto-i-konfiguracja-turnieju.md#imp-113--jwt-es256-i-guardy-ról), [IMP-014](01-fundamenty-i-devops.md#imp-014--terraform-secrets-manager-kms-iam-ról-zadań)
- **Odwołania:** 05-bez §7, NFR-401, [TC-SEC-024](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-024)
- **Kroki:**
  1. Rozszerz `tools/scripts/gen-es256.ts` o tryb `--rotate`: wygeneruj nowy klucz z nowym `kid` i zapisz go w sekrecie `jwt-signing` jako `next`.
  2. Opisz w `ops/runbooks/jwt-rotation.md` kroki: publikacja `next` (API weryfikuje `active`, `previous`, `next`), przełączenie `active` ← `next`, `previous` ← stary aktywny, wygaszenie `previous` po 30 dniach (dłużej niż refresh token i token sędziego).
  3. Dodaj przypomnienie kalendarzowe co 90 dni i alarm CloudWatch na wiek klucza aktywnego (> 100 dni).
  4. Przećwicz rotację na staging z działającym tabletem i organizatorem (brak 401 w logach).
  5. Dopisz lub uruchom przypadki TC-SEC-024 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-405: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SEC-024 przechodzi na staging
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

### IMP-406 – Materiały RODO dla prawnika
- **Epik / obszar:** EP-10 Bezpieczeństwo i RODO | **Rola:** BE
- **Cel:** Prawnik dostaje komplet materiałów technicznych do umowy powierzenia, rejestru czynności i polityki retencji, oparty na faktycznym przetwarzaniu danych w systemie.
- **Zakres:** Inwentarz danych (pola, cel, retencja, lokalizacja), rejestr czynności przetwarzania (art. 30 ust. 2), załącznik TOM do umowy powierzenia, lista podprzetwarzających (AWS, Sentry, Expo/EAS), procedura naruszeń; **Poza zakresem:** Treść prawna (prawnik)
- **Zależności:** [IMP-176](05-backend-eksport-audyt-rodo.md#imp-176--zadanie-retencji-i-pseudonimizacji)
- **Odwołania:** NFR-501, NFR-502, NFR-507, Q-10, [TC-RODO-003](../03-test-plans/02-testy-integracyjne-api.md#tc-rodo-003), [TC-RODO-007](../03-test-plans/02-testy-integracyjne-api.md#tc-rodo-007)
- **Kroki:**
  1. Utwórz `docs-dev/privacy/data-inventory.md`: tabele i pola z danymi osobowymi (`app_user`, `athlete`, `judge`, `audit_log`, `score_sheet.comment`, logi), cel, podstawa, retencja (z IMP-176), lokalizacja (eu-central-1, kopie eu-west-1, urządzenia).
  2. Utwórz `docs-dev/privacy/ropa-processor.md` (rejestr kategorii czynności przetwarzania – art. 30 ust. 2 RODO) i `docs-dev/privacy/tom.md` (środki techniczne i organizacyjne do załącznika umowy powierzenia).
  3. Wypisz podprzetwarzających (AWS – eu-central-1, Sentry – region UE, Expo/EAS – buildy i OTA bez danych osób, SES) z lokalizacją i zakresem w `subprocessors.md`.
  4. Napisz `docs-dev/privacy/breach-procedure.md` (wykrycie, ocena, powiadomienie administratora w 24 h, rejestr naruszeń).
  5. Przekaż materiały PM do Q-10 i zapisz pytania otwarte do prawnika.
  6. Dopisz lub uruchom przypadki TC-RODO-003, TC-RODO-007 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-406: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Przekazane PM/prawnikowi; TC-RODO-003, TC-RODO-007 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-407 – Deklaracje prywatności w sklepach
- **Epik / obszar:** EP-10 Bezpieczeństwo i RODO | **Rola:** MOB
- **Cel:** Wpisy w App Store i Google Play mają rzetelne deklaracje prywatności, a aplikacja iOS zawiera wymagany manifest prywatności.
- **Zakres:** Wypełnienie deklaracji (dane konta organizatora, dane osób w turnieju, diagnostyka Sentry bez śledzenia), manifest prywatności iOS (`PrivacyInfo.xcprivacy` – powody użycia API), brak trackerów; **Poza zakresem:** –
- **Zależności:** [IMP-406](#imp-406--materiały-rodo-dla-prawnika), [IMP-550](13-wydanie.md#imp-550--konta-i-rekordy-aplikacji-w-app-store-connect-i-google-play)
- **Odwołania:** NFR-505, R-12, [TC-RODO-008](../03-test-plans/02-testy-integracyjne-api.md#tc-rodo-008)
- **Kroki:**
  1. Wypełnij App Store Privacy Nutrition Label: dane kontaktowe i identyfikatory konta organizatora (powiązane, bez śledzenia), dane osób w turnieju wprowadzane przez użytkownika, diagnostyka (Sentry, bez śledzenia).
  2. Wypełnij Google Play Data safety (szyfrowanie w tranzycie, możliwość usunięcia konta z linkiem `legal.accountDeletionUrl`, brak udostępniania stronom trzecim).
  3. Napisz config plugin `plugins/with-privacy-manifest.js` generujący `PrivacyInfo.xcprivacy` (powody użycia API: `UserDefaults` CA92.1, `FileTimestamp` C617.1, `SystemBootTime` 35F9.1 dla zegara monotonicznego, `DiskSpace` E174.1) i brak domen śledzących.
  4. Zweryfikuj, że w zależnościach nie ma SDK reklamowych ani analitycznych (raport `npx expo-doctor` i lista pakietów natywnych).
  5. Dopisz lub uruchom przypadki TC-RODO-008 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-407: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-RODO-008 przechodzi; deklaracje zaakceptowane w konsolach
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

### IMP-408 – Pentest zewnętrzny i poprawki
- **Epik / obszar:** EP-10 Bezpieczeństwo i RODO | **Rola:** BE
- **Cel:** Przed pierwszym turniejem produkcyjnym zewnętrzny pentest API i aplikacji nie zostawia otwartych podatności krytycznych ani wysokich.
- **Zakres:** Przygotowanie zakresu i środowiska (staging z danymi syntetycznymi, konta testowe, tablet testowy), wsparcie testerów, poprawki krytycznych/wysokich, retest; **Poza zakresem:** Koszt firmy zewnętrznej (PM)
- **Zależności:** [IMP-027](01-fundamenty-i-devops.md#imp-027--sast-semgrep-i-dast-zap-w-ci), [IMP-404](#imp-404--zestaw-testów-nadużyć), [IMP-457](11-qa-i-automatyzacja-testow.md#imp-457--e2e-pełnego-turnieju-dwa-urządzenia)
- **Odwołania:** NFR-408, [TC-SEC-007](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-007)
- **Kroki:**
  1. Przygotuj zakres pentestu z PM: API staging (OpenAPI), aplikacja iOS/Android (build `preview`), tablet z danymi syntetycznymi, macierz ról i scenariusze nadużyć (z IMP-404).
  2. Przygotuj środowisko: konta testowe organizatorów A i B, turnieje syntetyczne, sparowany tablet testowy, dostęp do logów na czas testu, okno 1 tygodnia z wyłączonym WAF IP-block dla adresów testerów.
  3. Wspieraj testerów w trakcie okna (dzienne podsumowania, szybkie odpowiedzi na pytania o model PIN offline i synchronizację).
  4. Napraw podatności krytyczne i wysokie (PR z etykietą `security`, test regresji dla każdej), średnie zaplanuj w backlogu.
  5. Zleć retest poprawek i dołącz raport końcowy do mapowań ASVS/MASVS oraz listy kontrolnej wydania.
  6. Dopisz lub uruchom przypadki TC-SEC-007 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-408: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SEC-007 – raport bez otwartych krytycznych/wysokich
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 16 h (XL) | **Ryzyko:** średnie

### IMP-409 – Test uprawnień bazy i architektury dostępu
- **Epik / obszar:** EP-10 Bezpieczeństwo i RODO | **Rola:** BE
- **Cel:** Nocny przebieg na staging potwierdza, że role bazy mają tylko przewidziane uprawnienia, a kod nie omija repozytoriów z zakresem właściciela.
- **Zakres:** Automatyczny test ról bazy (pc_app, pc_retention, pc_readonly) i testu architektury repozytoriów w CI nocnym na staging; **Poza zakresem:** –
- **Zależności:** [IMP-107](03-backend-konto-i-konfiguracja-turnieju.md#imp-107--migracja-4-audyt-dziennik-zmian-idempotencja-zdarzenia-eksporty), [IMP-108](03-backend-konto-i-konfiguracja-turnieju.md#imp-108--repozytoria-z-kontekstem-właściciela-scoped-repository)
- **Odwołania:** NFR-409, INT-08, [TC-INT-008](../03-test-plans/02-testy-integracyjne-api.md#tc-int-008), [TC-SEC-019](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-019)
- **Kroki:**
  1. Rozszerz test uprawnień z IMP-107 o tryb `--target staging` łączący się rolami `pc_app`, `pc_retention`, `pc_readonly` z Secrets Manager (zadanie ECS).
  2. Sprawdź zapytaniami `has_table_privilege` i próbami `UPDATE`/`DELETE` brak niedozwolonych uprawnień (`audit_log`, `score_sheet_revision`) i brak `CREATE` dla `pc_app`.
  3. Uruchamiaj test architektury repozytoriów (IMP-108) w nocnym workflow obok testu ról.
  4. Publikuj wynik w `nightly.yml` z alertem przy porażce.
  5. Dopisz lub uruchom przypadki TC-INT-008, TC-SEC-019 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-409: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-INT-008, TC-SEC-019 w nocnym CI
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

