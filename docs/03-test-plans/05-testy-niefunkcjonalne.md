# Testy niefunkcjonalne

> Dokument: `03-test-plans/05-testy-niefunkcjonalne.md` · Tech Lead · 23.10.2026 · Strategia: [00-strategia-testowania.md](00-strategia-testowania.md)
> Wymagania: [08-wymagania-niefunkcjonalne.md](../02-specification/08-wymagania-niefunkcjonalne.md) · Bezpieczeństwo: [05-bezpieczenstwo.md](../01-architecture/05-bezpieczenstwo.md) · Design system: [09-design-system.md](../02-specification/09-design-system.md)

## 1. Zasady pomiarów

- Pomiary wydajności tylko na buildach **release** (Hermes, bez dev menu) i na urządzeniach referencyjnych; wynik = mediana i p90/p95 z ≥ 10 powtórzeń; raport z wersją builda, urządzenia i systemu.
- Testy obciążeniowe k6 na staging w konfiguracji produkcyjnej (2 zadania API ARM 0,5 vCPU, RDS db.t4g.medium Multi-AZ, Valkey z repliką); profil NFR-802 i 2× (NFR-804).
- Dostępność: audyt automatyczny + ręczny; „błąd krytyczny” wg definicji NFR-201 (TL-52).
- Bezpieczeństwo: listy kontrolne **OWASP ASVS 5.0 L2** (API) i **OWASP MASVS 2.x / MASTG** – profil MAS-L1 z wybranymi testami MAS-L2 (TL-26).

## 2. Wydajność (16)

| ID | Tytuł | Poziom | Prio | Warunki wstępne | Kroki | Oczekiwany wynik | Odwołania |
|---|---|---|---|---|---|---|---|
| <a id="tc-perf-001"></a>TC-PERF-001 | Zimny start aplikacji | wydajnościowy | P1 | Build release na 4 urządzeniach referencyjnych | 10 zimnych startów (po wymuszonym zamknięciu); pomiar do pierwszego interaktywnego ekranu bez minimalnego czasu splashu (znacznik Sentry `app.start` + własny znacznik „TTI”). | p90 ≤ 3,0 s na każdym urządzeniu. | NFR-101 |
| <a id="tc-perf-002"></a>TC-PERF-002 | Czas odpowiedzi API pod obciążeniem | wydajnościowy | P1 | Staging w konfiguracji produkcyjnej, k6, profil NFR-802 | Scenariusz mieszany 30 min: odczyty organizatora, push ocen 50/s, sync/changes. | Odczyt p95 ≤ 300 ms; zapis (z przeliczeniem rankingu) p95 ≤ 500 ms; 5xx < 0,1%. | NFR-102, NFR-802 |
| <a id="tc-perf-003"></a>TC-PERF-003 | Zatwierdzenie oceny na tablecie | wydajnościowy | P1 | Galaxy Tab A8 i iPad 9, build release, 100 zatwierdzeń | Instrumentacja: czas tap → toast (performance.now w JS + znacznik natywny). | p95 ≤ 100 ms online i offline (z fsync – TL-20). | NFR-103, US-059 |
| <a id="tc-perf-004"></a>TC-PERF-004 | Reakcja formularza i płynność suwaka | wydajnościowy | P1 | Galaxy Tab A8, Flashlight (Android), Instruments (iPad) | Przeciągaj suwaki przez 30 s; zmieniaj −/+; pomiar FPS i czasu aktualizacji „Twój wynik”. | Aktualizacja wyniku ≤ 50 ms; FPS ≥ 55 p95 (wątek UI i JS); Reassure: brak regresji renderów > 10% względem bazowej. | NFR-104, R-01 |
| <a id="tc-perf-005"></a>TC-PERF-005 | Opóźnienie realtime | wydajnościowy | P1 | Patrz TC-E2E-FULL-005 | Analiza czasów z logów serwera i klientów. | Ranking ≤ 2 s p95; status kategorii na tablecie ≤ 3 s p95. | NFR-105 |
| <a id="tc-perf-006"></a>TC-PERF-006 | Synchronizacja 300 ocen | wydajnościowy | P1 | Patrz TC-SYNC-022 | – | ≤ 30 s. | NFR-106 |
| <a id="tc-perf-007"></a>TC-PERF-007 | Generowanie PDF | wydajnościowy | P1 | Patrz TC-PDF-010 | – | Kategoria ≤ 3 s, turniej maksymalny ≤ 10 s p95. | NFR-107 |
| <a id="tc-perf-008"></a>TC-PERF-008 | Migawka urządzenia | wydajnościowy | P1 | Patrz TC-SYNC-036 | – | ≤ 1,5 MB JSON, ≤ 250 kB gzip, zapis ≤ 2 s. | NFR-108 |
| <a id="tc-perf-009"></a>TC-PERF-009 | Rozmiar aplikacji | wydajnościowy | P2 | Build produkcyjny EAS | Odczytaj rozmiar pobrania z App Store Connect (thinning) i Play Console (AAB → APK dla urządzenia). | ≤ 60 MB dla iOS i Androida. | NFR-109 |
| <a id="tc-perf-010"></a>TC-PERF-010 | PBKDF2 600k na tabletach | wydajnościowy | P1 | Galaxy Tab A8, iPad 9, `react-native-quick-crypto` | 20 weryfikacji PIN-u offline (zimne i ciepłe). | ≤ 1 s na najsłabszym tablecie (mediana i p95); wynik zapisany w raporcie spike IMP-601. | NFR-110, R-04 |
| <a id="tc-perf-011"></a>TC-PERF-011 | Obciążenie systemu | wydajnościowy | P1 | Staging produkcyjny, k6 + `k6/x/websockets` | 100 turniejów Trwa, 3 000 połączeń WS, 50 ocen/s szczytowo, 10 000 kont (dane syntetyczne), 1 h. | Wszystkie NFR-102 spełnione; CPU zadań API < 70%; brak utraty zdarzeń WS. | NFR-802 |
| <a id="tc-perf-012"></a>TC-PERF-012 | Zapas 2× przed wydaniem 1.0 | wydajnościowy | P1 | Jak TC-PERF-011 | Profil 2× (200 turniejów, 6 000 WS, 100 ocen/s), 30 min. | Brak błędów 5xx > 1%; degradacja p95 ≤ 2× bez awarii; raport k6 załączony do wydania. | NFR-804 |
| <a id="tc-perf-013"></a>TC-PERF-013 | Skalowanie poziome 2 → 4 zadania | wydajnościowy | P2 | Staging | W trakcie testu obciążenia zwiększ liczbę zadań ECS. | Brak błędów i utraty połączeń poza ponownym połączeniem; przepustowość rośnie. | NFR-803 |
| <a id="tc-perf-014"></a>TC-PERF-014 | Pamięć tabletu | wydajnościowy | P2 | FX-MAX, Tab A8, 1 h oceniania | Profiler (Android Studio / Instruments). | RSS ≤ 300 MB; brak wycieków (wzrost < 10% w ostatnich 30 min). | NFR-705 |
| <a id="tc-perf-015"></a>TC-PERF-015 | Zużycie baterii | wydajnościowy | P2 | iPad 9, jasność 50%, Wi-Fi, 2 h oceniania co 3 min | Pomiar % baterii. | ≤ 12% na godzinę. | NFR-704 |
| <a id="tc-perf-016"></a>TC-PERF-016 | Przeliczenie wyników kategorii | wydajnościowy | P2 | Kategoria 300 startów × 30 sędziów | 100 przyjęć ocen; pomiar czasu przeliczenia w transakcji. | p95 < 20 ms (01-przeglad §4.2). | NFR-102, FR-612 |


## 3. Dostępność (14)

Kontrast Nocturne został przeliczony przez Tech Leada (wszystkie pary z 08-NFR §2.1 zgodne z deklarowanymi wartościami; wyjątek PDF – TL-27).

| ID | Tytuł | Poziom | Prio | Warunki wstępne | Kroki | Oczekiwany wynik | Odwołania |
|---|---|---|---|---|---|---|---|
| <a id="tc-a11y-001"></a>TC-A11Y-001 | Kontrast tokenów | integration | P1 | Patrz TC-TOKENS-001 | – | Wszystkie pary spełniają NFR-202. | NFR-202 |
| <a id="tc-a11y-002"></a>TC-A11Y-002 | Audyt iOS Accessibility Inspector | manual | P1 | iPhone 12, iPad 9, build preview | Audyt każdego ekranu SCR z MVP. | 0 błędów krytycznych (definicja w NFR-201); pozostałe zgłoszone jako defekty S3. | NFR-201 |
| <a id="tc-a11y-003"></a>TC-A11Y-003 | Audyt Android Accessibility Scanner | manual | P1 | Pixel 6a, Tab A8 | Skan każdego ekranu. | 0 błędów krytycznych; cele dotykowe ≥ 48 dp (Android) / 44 pt. | NFR-201, NFR-203 |
| <a id="tc-a11y-004"></a>TC-A11Y-004 | VoiceOver – scenariusze organizatora (US Must) | manual | P1 | iPhone 12 | Wykonaj z VoiceOver: utworzenie turnieju, dodanie kategorii, zawodniczki, start kategorii, odczyt rankingu, eksport PDF. | Wszystkie kroki wykonalne; elementy mają etykiety i role; kolejność fokusu zgodna z wizualną; toasty ogłaszane. | NFR-206, US-011, US-020, US-031, US-070 |
| <a id="tc-a11y-005"></a>TC-A11Y-005 | TalkBack – scenariusze sędziego (US Must) | manual | P1 | Galaxy Tab A8 | Z TalkBack: wybór profilu, PIN, kategoria, ocena (suwaki jako „adjustable”, liczniki kar), zatwierdzenie. | Wykonalne bez widzenia ekranu; suwak „Technika, 8,5 z 10” z gestami zwiększ/zmniejsz o 0,5. | NFR-206, US-051, US-057, US-058 |
| <a id="tc-a11y-006"></a>TC-A11Y-006 | Cele dotykowe | integration | P1 | Reguła lint komponentów + przegląd | Lint `min-touch-target`; pomiar `hitSlop` przycisków 40 dp. | Wszystkie interaktywne ≥ 44×44 pt (z `hitSlop`). | NFR-203, G-27 |
| <a id="tc-a11y-007"></a>TC-A11Y-007 | Skalowanie tekstu – organizator 130% | manual | P1 | iPhone 12 i Pixel 6a z czcionką 130% | Przejdź SCR-ORG-01…22. | Brak obcięcia funkcji i nachodzenia tekstów (UI-05); zrzuty porównane z wzorcami. | NFR-204, UI-05 |
| <a id="tc-a11y-008"></a>TC-A11Y-008 | Skalowanie tekstu – sędzia 120% | manual | P1 | iPad 9 i Tab A8, 120% | Przejdź SCR-JDG-00…10. | Jak wyżej; wartości not i „Twój wynik” bez zawijania. | NFR-204, UI-05 |
| <a id="tc-a11y-009"></a>TC-A11Y-009 | Ograniczenie ruchu | manual | P2 | „Ogranicz ruch” włączone | Splash, arkusze, toasty, ranking. | Brak animacji splash (statyczna klatka); przejścia ≤ 150 ms fade. | NFR-207 |
| <a id="tc-a11y-010"></a>TC-A11Y-010 | Pełne nazwiska dla czytnika | manual | P2 | Nazwiska ucięte wielokropkiem | Odczyt wierszy kolejki i listy startowej czytnikiem. | Czytnik odczytuje pełne imię i nazwisko (UI-15). | UI-15, NFR-206 |
| <a id="tc-a11y-011"></a>TC-A11Y-011 | Modalność arkuszy i dialogów | manual | P2 | VoiceOver/TalkBack | Otwórz bottom sheet i dialog SCR-JDG-09. | Fokus w arkuszu; treść pod spodem niedostępna; „wstecz” / gest zamyka. | NFR-206 |
| <a id="tc-a11y-012"></a>TC-A11Y-012 | Stany ekranów | manual | P2 | Lista ekranów z danymi | Wymuś ładowanie, pusty, błąd, offline dla każdego ekranu. | Każdy stan zdefiniowany i ostylowany (05/06-ekrany). | NFR-205 |
| <a id="tc-a11y-013"></a>TC-A11Y-013 | Kolor nie jest jedynym nośnikiem informacji | manual | P2 | Ikony stanu w kolejce i liście startowej | Przegląd w trybie skali szarości. | Stany rozróżnialne kształtem ikony i tekstem. | NFR-201 |
| <a id="tc-a11y-014"></a>TC-A11Y-014 | Klawiatura PIN dla czytnika | manual | P3 | VoiceOver | Wprowadzanie PIN-u. | Klawisze z etykietami cyfr, backspace „Usuń cyfrę”; liczba wpisanych cyfr ogłaszana, bez wartości. | NFR-206, FR-508 |


## 4. Bezpieczeństwo (25)

| ID | Tytuł | Poziom | Prio | Warunki wstępne | Kroki | Oczekiwany wynik | Odwołania |
|---|---|---|---|---|---|---|---|
| <a id="tc-sec-001"></a>TC-SEC-001 | Lista kontrolna ASVS 5.0 L2 | bezpieczeństwo | P1 | Dokument mapowania IMP-400 | Przegląd wymagań V1–V17 dla API. | Wszystkie wymagania L2 spełnione lub z udokumentowanym wyjątkiem zatwierdzonym przez TL. | NFR-401 |
| <a id="tc-sec-002"></a>TC-SEC-002 | MASVS 2.x – profil MAS-L1 (+ wybrane L2) | bezpieczeństwo | P1 | Dokument IMP-401 | Testy MASTG dla STORAGE, CRYPTO, AUTH, NETWORK, PLATFORM, CODE, RESILIENCE. | Spełnione; wyjątek STORAGE-1 L2 (SQLite niezaszyfrowana) udokumentowany (R-06). | NFR-401 |
| <a id="tc-sec-003"></a>TC-SEC-003 | TLS i HSTS | bezpieczeństwo | P1 | Domena API produkcyjna | Skan SSL Labs; nagłówki. | Ocena A lub A+; TLS 1.2+ (1.3 preferowany), HSTS z `max-age ≥ 31536000`. | NFR-402 |
| <a id="tc-sec-004"></a>TC-SEC-004 | Sekrety w repozytorium i bundlu | bezpieczeństwo | P1 | CI | gitleaks na historii; analiza bundla JS i plików APK/IPA (strings). | 0 sekretów; brak kluczy, haseł i DSN z uprawnieniami zapisu. | NFR-406 |
| <a id="tc-sec-005"></a>TC-SEC-005 | Podatności zależności | bezpieczeństwo | P1 | CI przed wydaniem | `pnpm audit --prod`, Renovate dashboard, SBOM. | 0 podatności high/critical. | NFR-407 |
| <a id="tc-sec-006"></a>TC-SEC-006 | DAST – ZAP baseline | bezpieczeństwo | P1 | Staging | ZAP baseline + skan API z OpenAPI. | Brak alertów High; Medium przeanalizowane. | NFR-408 |
| <a id="tc-sec-007"></a>TC-SEC-007 | Zewnętrzny pentest | bezpieczeństwo | P1 | Przed pierwszym turniejem produkcyjnym | Pentest API, aplikacji i infrastruktury. | Wszystkie krytyczne i wysokie poprawione i zweryfikowane. | NFR-408 |
| <a id="tc-sec-008"></a>TC-SEC-008 | Czasy życia tokenów | bezpieczeństwo | P1 | Zegar sterowany | Użyj tokenów po 15 min (access), 30 dni (refresh), 12 h (judge), 1 h (device). | Każdy odrzucony po czasie (401 `UNAUTHENTICATED`). | NFR-404 |
| <a id="tc-sec-009"></a>TC-SEC-009 | Ataki na JWT | bezpieczeństwo | P1 | – | Token z `alg: none`, HS256 z kluczem publicznym, nieznany `kid`, zmieniony `typ`, podpisany innym kluczem. | Wszystkie odrzucone 401. | NFR-401, NFR-404 |
| <a id="tc-sec-010"></a>TC-SEC-010 | Pomylenie typów tokenów | bezpieczeństwo | P1 | – | Token `device` na endpointach `org`; `judge` na `/judge-sessions` innego urządzenia; token `org` w WS jako urządzenie. | 403 / odmowa zgodnie z 05-bezpieczenstwo §4.1. | NFR-411 |
| <a id="tc-sec-011"></a>TC-SEC-011 | IDOR między turniejami | bezpieczeństwo | P1 | FX-ORG-OTHER | Każdy identyfikator zasobu t1 użyty tokenem innego organizatora (tabelarycznie z TC-AUTHZ). | 404 dla każdego; brak wycieku danych w treści. | NFR-411 |
| <a id="tc-sec-012"></a>TC-SEC-012 | Enumeracja kont | bezpieczeństwo | P1 | – | Rejestracja, logowanie, reset dla istniejącego i nieistniejącego e-maila – treść i czas odpowiedzi (200 prób). | Identyczne treści; różnica median czasu < 50 ms. | FR-104, FR-107 |
| <a id="tc-sec-013"></a>TC-SEC-013 | Brute force logowania | bezpieczeństwo | P1 | – | Skrypt 100 prób na konto z rotacją IP; 100 prób z 1 IP na różne konta. | Blokada konta po 5/15 min; limit IP po 20/15 min; WAF blokuje zalew. | FR-107, NFR-405 |
| <a id="tc-sec-014"></a>TC-SEC-014 | Brute force PIN-u | bezpieczeństwo | P1 | Sparowany tablet testowy | Skrypt próbujący PIN-ów przez API dla jednego i wielu profili. | Po 10 błędach blokada globalna; po 30 / 10 min blokada urządzenia; bez tokenu urządzenia – 401. | FR-509, ADR-005 |
| <a id="tc-sec-015"></a>TC-SEC-015 | Brute force kodu parowania | bezpieczeństwo | P1 | – | 1 000 losowych kodów z jednego IP i z wielu IP. | Limit 10 / 10 min / IP; przestrzeń 31^8 i ważność 10 min (prawdopodobieństwo trafienia < 10^-8). | FR-504, NFR-405 |
| <a id="tc-sec-016"></a>TC-SEC-016 | Bezpieczne przechowywanie na urządzeniach | bezpieczeństwo | P1 | Urządzenie z rootem/jailbreakiem (testowe), kopia danych aplikacji | Przegląd Keychain/Keystore, MMKV, SQLite, logów. | Tokeny, sekret i pepper tylko w Keychain (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`) / Keystore; brak tokenów w MMKV i SQLite; weryfikatory w SQLite wyłącznie zaszyfrowane. | NFR-401, ADR-005, TL-04 |
| <a id="tc-sec-017"></a>TC-SEC-017 | Brak PII w telemetrii | bezpieczeństwo | P1 | Staging z danymi testowymi zawierającymi znaczniki (np. „ZZTEST Kowalska”) | Wywołaj błędy w aplikacji i API; przejrzyj Sentry i CloudWatch. | 0 wystąpień znaczników w `fullName`, `club`, `email`, `comment` (scrubbing pino i Sentry `beforeSend`). | NFR-504 |
| <a id="tc-sec-018"></a>TC-SEC-018 | Build produkcyjny bez demo i debug | bezpieczeństwo | P1 | Build production | Sprawdź SCR-JDG-02, menu deweloperskie, logi, DevCatalog. | Brak podpowiedzi „Demo · PIN-y”, brak danych demo, brak trybu debug i DevCatalog. | NFR-410, G-17 |
| <a id="tc-sec-019"></a>TC-SEC-019 | Uprawnienia bazy dla audytu | bezpieczeństwo | P1 | Patrz TC-INT-008 | – | Spełnione. | NFR-409 |
| <a id="tc-sec-020"></a>TC-SEC-020 | Ochrona klawiatury PIN przed nakładkami | bezpieczeństwo | P2 | Android z aplikacją nakładkową testową | Wprowadzanie PIN-u z aktywną nakładką. | Dotyki odrzucane (`filterTouchesWhenObscured`); brak kopiowania PIN-u do schowka. | NFR-401 |
| <a id="tc-sec-021"></a>TC-SEC-021 | Linki głębokie | bezpieczeństwo | P2 | – | `polechamp://pair?c=<payload złośliwy>`; `https://polechamp.app/reset?token=` z XSS/zbyt długim tokenem. | Walidacja parametrów; brak automatycznych akcji bez potwierdzenia; brak awarii. | NFR-401, FR-504, FR-104 |
| <a id="tc-sec-022"></a>TC-SEC-022 | Wstrzyknięcia i fuzzing wejścia | bezpieczeństwo | P2 | Schemathesis na podstawie OpenAPI | Fuzzing wszystkich endpointów. | Brak 5xx wynikających z wejścia; brak wykonania SQL z wejścia (zapytania parametryzowane). | NFR-401 |
| <a id="tc-sec-023"></a>TC-SEC-023 | Zrzuty ekranu w trybie sędziego | bezpieczeństwo | P4 | Q-09 – domyślnie bez blokady | Zrób zrzut ekranu formularza. | Zgodnie z decyzją Q-09 (domyślnie dozwolone); test do aktualizacji po decyzji PO. | Q-09 |
| <a id="tc-sec-024"></a>TC-SEC-024 | Rotacja kluczy JWT | bezpieczeństwo | P2 | Dwa klucze z różnymi `kid` | Rotacja klucza w trakcie sesji. | Stare tokeny ważne do wygaśnięcia; nowe podpisane nowym kluczem; brak przerw. | NFR-401 |
| <a id="tc-sec-025"></a>TC-SEC-025 | Algorytmy haseł i PIN-ów | integration | P1 | – | Utwórz konto i sędziego; odczytaj `password_hash`, `pin_hash`, `pin_offline_verifier` z bazy. | `$argon2id$v=19$m=19456,t=2,p=1$…` dla hasła i PIN-u; weryfikator offline = PBKDF2-SHA256 600 000 iteracji z 16-bajtową solą; brak PIN-u jawnego w bazie i logach. | NFR-403, ADR-005, ADR-008 |


## 5. Odporność i dostępność usług (10)

| ID | Tytuł | Poziom | Prio | Warunki wstępne | Kroki | Oczekiwany wynik | Odwołania |
|---|---|---|---|---|---|---|---|
| <a id="tc-rel-001"></a>TC-REL-001 | Dostępność backendu | integration | P1 | CloudWatch Synthetics | Kanarek co 5 min (co 1 min w oknach krytycznych) przez miesiąc pilotażowy. | ≥ 99,5% miesięcznie; ≥ 99,9% w oknach krytycznych; alarmy działają. | NFR-304, TL-36 |
| <a id="tc-rel-002"></a>TC-REL-002 | Odtworzenie z kopii (PITR) | manual | P1 | Staging, procedura IMP-025 | Odtwórz bazę na punkt w czasie sprzed 10 min; przełącz API. | RPO ≤ 5 min, RTO ≤ 1 h; raport z czasami. | NFR-305 |
| <a id="tc-rel-003"></a>TC-REL-003 | Awaria zadania ECS w trakcie push | integration | P1 | Staging, 2 zadania API | Zabij jedno zadanie w trakcie paczek z 5 tabletów. | Brak utraty ocen; klienci ponawiają; ALB kieruje do zdrowego zadania. | NFR-302, NFR-306, NFR-803 |
| <a id="tc-rel-004"></a>TC-REL-004 | Przełączenie Multi-AZ RDS | manual | P2 | Staging w konfiguracji Multi-AZ | Reboot with failover w trakcie testu obciążenia. | Przerwa ≤ 2 min; API wznawia połączenia; brak utraty danych. | NFR-304, NFR-305 |
| <a id="tc-rel-005"></a>TC-REL-005 | Wdrożenie w trakcie połączeń WS | integration | P2 | Staging, 300 połączeń WS | Wdróż nową wersję (rolling). | Klienci łączą się ponownie z losowym opóźnieniem; brak burzy połączeń (> 50% w 1 s); zdarzenia nie giną (pull po połączeniu). | NFR-803, ADR-003 |
| <a id="tc-rel-006"></a>TC-REL-006 | Stabilność aplikacji (crash-free) | manual | P1 | Beta TestFlight / Play internal, pilot | Monitoring Sentry 2 tygodnie. | Crash-free sessions ≥ 99,5% (sędzia), ≥ 99,0% (organizator); przed wydaniem – próbka z bety, po wydaniu – miesięcznie. | NFR-308 |
| <a id="tc-rel-007"></a>TC-REL-007 | Ponawianie zadań workera | integration | P2 | Worker zatrzymany w trakcie generowania PDF | Uruchom ponownie worker. | Zadanie ponowione (BullMQ), wynik `DONE`; brak duplikatów obiektów S3. | FR-705 |
| <a id="tc-rel-008"></a>TC-REL-008 | Awaria SES | integration | P3 | Mock SES zwracający 5xx | Rejestracja konta. | E-mail w kolejce z ponowieniami; użytkownik może poprosić o ponowne wysłanie; alarm po 15 min. | FR-102 |
| <a id="tc-rel-009"></a>TC-REL-009 | Monitorowanie i alarmy | integration | P1 | Staging | Wygeneruj 5xx > 1% przez 5 min; zatrzymaj publikator zdarzeń; zwiększ `pending_mutations`. | Alarmy w CloudWatch i powiadomienie dyżurnego; metryki widoczne na dashboardzie. | NFR-902 |
| <a id="tc-rel-010"></a>TC-REL-010 | Blokada wdrożeń w oknie turnieju | integration | P1 | `ops/freeze-windows.yaml` z aktywnym oknem | Uruchom pipeline produkcyjny i publikację EAS Update na `production`. | Pipeline zatrzymany przez `freeze-guard`; z etykietą `hotfix-approved` i zatwierdzeniem – przechodzi. | NFR-905, TL-37 |


## 6. Kompatybilność urządzeń i platform (10)

| ID | Tytuł | Poziom | Prio | Warunki wstępne | Kroki | Oczekiwany wynik | Odwołania |
|---|---|---|---|---|---|---|---|
| <a id="tc-compat-001"></a>TC-COMPAT-001 | Macierz systemów | E2E | P1 | iOS 16.4 (symulator), iOS najnowszy, Android 10 (emulator API 29), Android 14, Android 16 | Zestaw dymny Maestro (organizator i sędzia). | Wszystkie scenariusze dymne przechodzą. | NFR-701 |
| <a id="tc-compat-002"></a>TC-COMPAT-002 | Urządzenia referencyjne | E2E | P1 | iPhone 12, Pixel 6a, iPad 9, Galaxy Tab A8 | Pełny regres E2E przed wydaniem. | Wszystkie TC E2E P1 przechodzą na każdym urządzeniu. | NFR-703 |
| <a id="tc-compat-003"></a>TC-COMPAT-003 | Szerokości telefonów | E2E | P2 | Emulatory 360 dp i 430 dp | SCR-ORG-01, 03, 06–08, arkusze. | Brak nachodzenia i obcięcia; zrzuty zgodne z wzorcami. | NFR-702, UI-05 |
| <a id="tc-compat-004"></a>TC-COMPAT-004 | Tablet za mały na tryb sędziego | E2E | P2 | Tablet 7″ (najmniejszy wymiar < 600 dp) | SCR-SYS-01. | Karta „Tablet sędziowski” nieaktywna z komunikatem. | NFR-702 |
| <a id="tc-compat-005"></a>TC-COMPAT-005 | Android 16 – ignorowanie blokady orientacji | E2E | P1 | Tablet / emulator Android 16, target API 36 | Obrót do pionu w trybie sędziego; z opt-out i bez. | Z opt-out – orientacja pozioma utrzymana; bez – nakładka orientacji (ADR-013). | NFR-702, TL-23 |
| <a id="tc-compat-006"></a>TC-COMPAT-006 | iPadOS 26 – zmiana rozmiaru okna | E2E | P1 | iPad z iPadOS 26 | Zmniejsz okno aplikacji, przywróć. | Nakładka przy szerokości < 1024 dp; stan zachowany. | NFR-702, TL-23 |
| <a id="tc-compat-007"></a>TC-COMPAT-007 | Tryb organizatora na tablecie | E2E | P2 | iPad, Tab A8 | SCR-ORG-01…03 w obu orientacjach. | Kolumna maks. 480 dp wyśrodkowana; brak błędów układu (TL-24). | NFR-702, TL-24 |
| <a id="tc-compat-008"></a>TC-COMPAT-008 | Przycisk wstecz Androida | E2E | P2 | Pixel 6a, Tab A8 | „Wstecz” na arkuszach, ekranach, w panelu sędziego i na ekranie PIN. | Arkusz – zamknięcie; ekran – cofnięcie; panel sędziego – brak wyjścia z sesji bez potwierdzenia. | NFR-701 |
| <a id="tc-compat-009"></a>TC-COMPAT-009 | Aktualizacja aplikacji z danymi | E2E | P1 | Wersja N z danymi (organizator: cache; sędzia: SQLite z outboxem) | Instalacja N+1 ze sklepu testowego. | Dane i sesje zachowane; migracje SQLite przechodzą. | NFR-302, NFR-904 |
| <a id="tc-compat-010"></a>TC-COMPAT-010 | Tylko ciemny motyw | E2E | P3 | Systemowy jasny motyw | Uruchom aplikację. | Interfejs zawsze ciemny (Nocturne); pasek statusu czytelny. | NFR-209 |


## 7. Lokalizacja (6)

| ID | Tytuł | Poziom | Prio | Warunki wstępne | Kroki | Oczekiwany wynik | Odwołania |
|---|---|---|---|---|---|---|---|
| <a id="tc-l10n-001"></a>TC-L10N-001 | Teksty wyłącznie z i18n | integration | P1 | Patrz TC-I18N-004/005 | – | Spełnione; e-maile i PDF także z kluczy. | NFR-601 |
| <a id="tc-l10n-002"></a>TC-L10N-002 | Pseudolokalizacja +30% | E2E | P2 | Build z słownikiem pseudo (TC-I18N-009) | Zrzuty wszystkich ekranów. | Brak utraty funkcji; przyciski i pigułki bez zawijania (wielokropek tam, gdzie przewidziano). | NFR-604, UI-11 |
| <a id="tc-l10n-003"></a>TC-L10N-003 | Formaty dat i liczb w całej aplikacji | E2E | P1 | – | Przegląd ekranów, PDF, e-maili. | Przecinek dziesiętny, „−”, półpauzy, daty pl-PL, strefa Europe/Warsaw w PDF. | NFR-602 |
| <a id="tc-l10n-004"></a>TC-L10N-004 | Zmiana strefy czasowej urządzenia | E2E | P2 | Telefon i tablet w strefie UTC−5 | Lista turniejów, daty, „ostatnia synchronizacja”. | Daty turniejów bez przesunięcia (data kalendarzowa); czasy względne poprawne. | NFR-602 |
| <a id="tc-l10n-005"></a>TC-L10N-005 | Liczba mnoga w UI | E2E | P2 | Turnieje z 1, 3, 8 kategoriami; kategorie z 1, 2, 9 zawodniczkami | Przegląd kart. | „1 kategoria”, „3 kategorie”, „8 kategorii”; „1 zawodniczka”, „2 zawodniczki”, „9 zawodniczek”. | NFR-603 |
| <a id="tc-l10n-006"></a>TC-L10N-006 | Polskie znaki w nazwach i wyszukiwaniu | E2E | P2 | Zawodniczka „Łucja Żółkiewska-Ćwik” | Dodaj, wyszukaj „zolk” i „żółk”, posortuj. | Wyświetlanie poprawne; wyszukiwanie bez rozróżniania znaków diakrytycznych (`unaccent`/normalizacja); PDF poprawny. | NFR-602, FR-401 |

