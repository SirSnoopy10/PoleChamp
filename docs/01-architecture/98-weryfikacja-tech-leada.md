# Weryfikacja dokumentacji Architekta przez Tech Leada

> Dokument: `01-architecture/98-weryfikacja-tech-leada.md` · Autor: Tech Lead (Agent 2) · Wersja 1.0 · 23.10.2026
> Wejście: [99-przekazanie-dla-tech-leada.md](99-przekazanie-dla-tech-leada.md) oraz wszystkie dokumenty `00-research`, `01-architecture` (z `adr/`) i `02-specification`, prototyp `design/PoleChamp v2.dc.html`, design system `design/_ds/nocturne-*`, uwagi `design/uploads/*.png`.
> Wyjście: poprawki naniesione bezpośrednio w dokumentach (rejestr §6), nowe decyzje ([ADR-012](adr/ADR-012-kontrakty-walidacja-i-openapi.md), [ADR-013](adr/ADR-013-orientacja-i-rozmiar-okna-tabletu.md), sekcje „Status: zmieniony” w ADR-001, 002, 005, 009, 010), plan testów [../03-test-plans/](../03-test-plans/00-strategia-testowania.md) i plan implementacji [../04-implementation-plans/](../04-implementation-plans/00-konwencje-i-definition-of-done.md).

## 1. Zakres i metoda

1. Przeczytano w całości wszystkie dokumenty Architekta i logikę prototypu (`buildSeed`, `judgeTotalFor`, `aggregateFor`, `computeRanking`, `fmt`, przepływy PIN i zatwierdzania oceny).
2. Kontrola krzyżowa: FR ↔ US ↔ SCR ↔ endpointy ↔ model danych ↔ macierz uprawnień ↔ reguły punktacji ↔ offline/sync ↔ NFR ↔ design. Pokrycie FR, US, NFR i SCR przez testy i zadania sprawdzono skryptem (wynik: [09-macierz-sledzenia.md](../03-test-plans/09-macierz-sledzenia.md)).
3. Przeliczono ponownie przykłady P1–P14 (07-reguly §6) i wzory całkowitoliczbowe.
4. Przeliczono kontrast wszystkich par z 08-NFR §2.1 i mieszanki `color-mix` z 09-design-system §2.1 (wzór WCAG 2.x).
5. Zweryfikowano w internecie i w rejestrze npm aktualne wersje technologii (stan na 23.10.2026) oraz zachowania platform istotne dla decyzji (§3, §12).
6. Poprawki jednoznaczne naniesiono w dokumentach; kwestie biznesowe zostawiono jako pytania z założeniem domyślnym (§8).

## 2. Podsumowanie

| Miara | Wartość |
|---|---|
| Pozycje rejestru TL (niespójności, luki, decyzje) | 56 (TL-01…TL-56) |
| Poprawione dokumenty Architekta | 27 plików (7 w `01-architecture`, 11 ADR, 9 w `02-specification`) + 2 nowe ADR (§6.2) |
| Nowe ADR | 2 (ADR-012, ADR-013) |
| ADR ze zmianą decyzji („Status: zmieniony”) | 5 (ADR-001, ADR-002, ADR-005, ADR-009, ADR-010) |
| ADR potwierdzone z uwagami | 6 (ADR-003, 004, 006, 007, 008, 011) |
| Pytania Architekta rozstrzygnięte przez TL | Q-12, Q-13 |
| Nowe pytania biznesowe | Q-15…Q-19 |
| Przypadki testowe / zadania implementacyjne | 703 TC / 250 IMP (1679 h bez buforów) |

**Najważniejsze ustalenia:**
- **TL-04 (krytyczne):** zaprojektowany weryfikator PIN offline był niewykonalny – serwer miał liczyć `PBKDF2(PIN, salt ‖ pepper_urządzenia)` przy każdej migawce, nie znając PIN-u (przechowuje tylko hash Argon2id). Nowy schemat: weryfikator liczony raz przy generowaniu PIN-u, szyfrowany per urządzenie kluczem z peppera (ADR-005 zmieniony).
- **TL-13:** oceny wystawione offline przed dezaktywacją sędziego lub resetem PIN-u znikały bez decyzji organizatora – rozszerzono zakres „odrzuconych zgłoszeń” (ADR-010 zmieniony).
- **TL-01:** aktualne wersje są nowsze niż w dokumentacji: Expo SDK 58 / RN 0.88, NestJS 12, Node 26 LTS (od 28.10.2026), PostgreSQL 18 na RDS.
- **TL-02, TL-03:** `nestjs-zod` nie deklaruje zgodności z NestJS 12 (→ ADR-012: natywna walidacja Standard Schema), `@gorhom/bottom-sheet` nie wydał wersji od V 2026 i ma otwarte błędy z Reanimated ≥ 4.6 (→ własny komponent `Sheet`, spike IMP-602).
- **TL-22, TL-23:** wymogi platform – usuwanie konta musi być w MVP (App Store 5.1.1(v)), a blokada orientacji tabletu przestaje być respektowana (Android 16, iPadOS 26) → ADR-013.

## 3. Potwierdzone wersje technologii

Stan na 23.10.2026 (rejestr npm sprawdzony poleceniem `npm view`, strony producentów – §12).

### 3.1 Aplikacja mobilna

| Element | Wersja | Uwagi / decyzja |
|---|---|---|
| Expo SDK | **58** (wydany 15.10.2026; pakiet `expo` 58.0.17) | start projektu na SDK 58; fallback SDK 57 (30.06.2026, RN 0.86) po spike IMP-600 |
| React Native / React | **0.88.0** / **19.3.0** | New Architecture (jedyna wspierana) |
| TypeScript | **~6.0.3** (szablon SDK 58) | TS 7.0.2 (natywny kompilator) – nie teraz |
| Minimum systemów (SDK 58) | iOS 16.4+, Android 7+ (compileSdk 37, targetSdk 36) | NFR-701 poprawione na iOS ≥ 16.4 (TL-25); Android ≥ 10 utrzymane |
| Expo Router / expo-sqlite / expo-secure-store / expo-camera | 58.0.25 / 58.0.13 / 58.0.2 / 58.0.12 | – |
| react-native-reanimated / react-native-worklets | **4.7.1** / **0.13.0** | SDK 56 miał regresję pamięci Hermes V1 z worklets – naprawioną w SDK 57+ |
| react-native-gesture-handler | 3.3 (szablon) / 3.4.0 | wersja 3.0 wydana 28.05.2026 |
| @shopify/react-native-skia | **2.14.0** (01.10.2026) | wymaga Reanimated ≥ 4 i worklets ≥ 0.7 – spełnione |
| react-native-quick-crypto | **1.1.8** (08.10.2026) | Nitro Modules, PBKDF2/HKDF/AES-GCM natywnie (R-04) |
| react-native-mmkv | 4.3.2 | Nitro Modules |
| @gorhom/bottom-sheet | 5.2.14 (09.05.2026) | **ryzyko** – brak wydań po RNGH 3.0, otwarte błędy (#2785, #2764, #2781) → TL-03 |
| @tanstack/react-query / zustand | 5.104.5 / 5.0.16 | – |
| i18next / react-i18next | 26.5.6 / 17.1.4 | – |
| phosphor-react-native | 3.0.6 | – |
| @sentry/react-native | 8.32.0 | region UE |

### 3.2 Backend i infrastruktura

| Element | Wersja | Uwagi / decyzja |
|---|---|---|
| Node.js | **26 LTS** (Active LTS od 28.10.2026, koniec 30.04.2029) | Node 24 w fazie Maintenance od 20.10.2026 (koniec 30.04.2028) – fallback |
| NestJS | **12.2.0** (`@nestjs/core`, `platform-fastify`, `platform-socket.io`) | v12: ESM, natywna walidacja Standard Schema, wymaga Node ≥ 20.19 |
| Fastify | 5.12.7 | `@nestjs/platform-fastify` 12 |
| PostgreSQL (RDS) | **18** (GA na RDS 14.11.2025, dostępna wersja 18.4) | natywne `uuidv7()` |
| ORM | **Drizzle ORM 0.45.4**, drizzle-kit 0.31.11 | Drizzle 1.0 w fazie RC (1.0.0-rc.5); Prisma 7.10 / 8.0 RC – odrzucona (ADR-002) |
| zod / zod-to-openapi | **4.6.7** / **9.1.0** (zod ^4) | `nestjs-zod` 5.5.0 – zależności tylko NestJS 10/11 → ADR-012 |
| openapi-typescript / openapi-fetch | 7.13.0 / 0.17.0 | – |
| Socket.IO / adapter Redis | 4.8.4 / 8.3.0 | tylko transport WebSocket – bez sticky sessions |
| BullMQ | 6.4.0 | Valkey |
| pdfmake / Inter | 0.3.12 / 4.1 | statyczne TTF (TL-27) |
| argon2 / jose / pino | 0.45.1 / 6.2.13 / 10.4.0 | – |
| ElastiCache | Valkey 8 | zgodny z protokołem Redis |

### 3.3 Narzędzia

| Narzędzie | Wersja |
|---|---|
| pnpm / Turborepo | 12.15.0 / 2.11.10 |
| Vitest / Jest / jest-expo / RNTL | 5.0.5 / 30.5.2 / 58.0.12 / 14.1.0 |
| fast-check / Testcontainers | 4.10.2 / 12.2.1 |
| Maestro CLI / k6 / Reassure | 2.11.0 / 2.3.0 / 1.6.1 |
| OWASP ZAP / Semgrep / gitleaks | 2.17.0 / 1.182.0 / 8.30.1 |

## 4. Weryfikacja punktów §7 przekazania Architekta

| # | Punkt | Wynik weryfikacji | Decyzja / dalszy krok |
|---|---|---|---|
| 1 | Wersje Expo, RN, NestJS, Node, PostgreSQL, bottom sheet, Skia | §3; wszystkie nowsze niż w dokumentacji | TL-01; bottom sheet → TL-03; Skia 2.14 zgodna |
| 2 | ORM i generator OpenAPI | Drizzle potwierdzony (kontrola `FOR UPDATE/SHARE`, schemat w TS, używany też na tablecie); `nestjs-zod` niezgodny z NestJS 12 | ADR-012: zod 4 + Standard Schema + `@asteasolutions/zod-to-openapi`; Drizzle 1.0 – migracja po wydaniu stabilnym |
| 3 | PBKDF2 600k na tablecie, Argon2id na Fargate | Przy implementacji natywnej (OpenSSL 3 w quick-crypto, CommonCrypto na iOS) 1,2 mln kompresji SHA-256 to szacunkowo 0,1–0,5 s na Galaxy Tab A8; w czystym JS byłoby to kilka–kilkanaście sekund. Argon2id (19 MiB, t=2) ≈ 30–60 ms CPU na logowanie – akceptowalne przy limitach przed hashem. **Wykryto błąd projektu: serwer nie mógł liczyć weryfikatorów (TL-04)** | Spike IMP-601 (kryterium: p95 ≤ 1 s na Tab A8; > 2 s → wniosek o 310k); nowy schemat weryfikatora (ADR-005) |
| 4 | `expo-sqlite` (WAL, transakcje) przy zabiciu procesu | WAL z `synchronous=NORMAL` jest trwały po zabiciu procesu, ale nie po utracie zasilania; NFR-302 obejmuje rozładowanie | TL-20: `synchronous=FULL` (+ `fullfsync` iOS), toast po COMMIT, odtworzenie IN_FLIGHT; spike IMP-603 z pomiarem 100 ms |
| 5 | Socket.IO przez ALB, klient RN w tle | Transport tylko WebSocket nie wymaga sticky sessions (Socket.IO). ALB: idle timeout domyślnie 60 s, zakres 1–4000 s; 300 s > ping 25 s. iOS zamyka gniazda w tle – po powrocie zawsze pull/refresh | ADR-003 potwierdzony; `auth` jako funkcja, losowe opóźnienie ponownego połączenia (IMP-505); spike IMP-604 |
| 6 | pdfmake z Inter i polskimi znakami, czas generowania | pdfmake 0.3.12 (pdfkit/fontkit) obsługuje TTF – należy osadzać statyczne Inter 400/500 (nie variable font). Kontrast accent-600 na białym 4,46:1 – za mało dla tekstu | TL-27 (accent-700), spike IMP-605 (glify + 60 kategorii ≤ 10 s) |
| 7 | Koszt AWS | §5 | szacunek dla PM, weryfikacja w AWS Pricing Calculator |
| 8 | Kolejność prac | Zgodna z grafem zależności; ścieżka krytyczna przechodzi przez `@polechamp/scoring` i API konfiguracji/blokady | [90-graf-zaleznosci.md](../04-implementation-plans/90-graf-zaleznosci.md), fazy w [99-przekazanie-dla-pm.md](../04-implementation-plans/99-przekazanie-dla-pm.md) |
| 9 | Zakres planu testów (P1–P14, sekwencje 1–9, macierz uprawnień, UI-01…15, kody błędów, testy offline) | Pokryte w całości | [00-strategia-testowania.md §12](../03-test-plans/00-strategia-testowania.md#12-pokrycie-wymagań-z-przekazania-architekta-79) |

**Q-12 (HIBP vs lista lokalna) – rozstrzygnięte (TL-41):** API zakresów Pwned Passwords jest bezpłatne, bez klucza i bez limitu (dokumentacja HIBP), obsługuje `Add-Padding`; do usługi trafia 5 znaków skrótu SHA-1 (nie są daną osobową). Zapas: lista 100 000 haseł w obrazie API.

**Q-13 (AWS Frankfurt vs GCP Warszawa) – rozstrzygnięte (TL-42):** AWS eu-central-1 (uzasadnienie w ADR-007, sekcja weryfikacji).

## 5. Zgrubny koszt środowisk AWS

Ceny katalogowe eu-central-1 (orientacyjne, USD/mies., bez VAT, bez darmowego progu). Przed akceptacją budżetu PM przelicza wariant w AWS Pricing Calculator.

| Pozycja | Produkcja | Staging | Dev |
|---|---|---|---|
| ECS Fargate (ARM, 0,5 vCPU / 1 GB) | api 2 zadania + worker 1 ≈ 50 | 2 zadania, nocne skalowanie do 0 ≈ 15 | 1–2 zadania ≈ 10 |
| Application Load Balancer | ≈ 25 | ≈ 22 | ≈ 20 |
| NAT Gateway | 2 (po jednym w AZ) ≈ 80 | 1 ≈ 40 | 1 ≈ 40 (lub publiczne IP zadań – 0) |
| RDS PostgreSQL 18 | db.t4g.medium Multi-AZ, 50 GB gp3, PITR 35 dni ≈ 135 | db.t4g.small single-AZ ≈ 30 | db.t4g.micro, zatrzymywana na noc ≈ 10 |
| ElastiCache Valkey | t4g.micro + replika ≈ 25 | 1 węzeł ≈ 13 | 1 węzeł ≈ 13 |
| S3, CloudFront, SES | ≈ 5 | ≈ 2 | ≈ 1 |
| CloudWatch (logi 30 dni, metryki, alarmy), Synthetics | ≈ 30 | ≈ 10 | ≈ 5 |
| WAF, GuardDuty, CloudTrail, Secrets Manager, KMS, ECR, Route 53 | ≈ 30 | ≈ 15 | ≈ 8 |
| Kopie snapshotów w eu-west-1 | ≈ 5 | – | – |
| **Razem (szacunek)** | **≈ 385 (zakres 350–450)** | **≈ 150 (120–170)** | **≈ 80 (60–100)** |

Poza AWS: Sentry (plan Team, region UE) ≈ 26–30 USD/mies.; EAS (plan zależny od liczby buildów i aktualizacji) ≈ 19–199 USD/mies.; Apple Developer Program 99 USD/rok; Google Play 25 USD jednorazowo; domena; opcjonalnie Maestro Cloud / farma urządzeń; pentest zewnętrzny (jednorazowo, wycena firmy). Oszczędności: Fargate Spot dla `worker`, jeden NAT w produkcji poza sezonem (ryzyko awarii AZ), wyłączenie staging poza sezonem, Savings Plans po pierwszym roku.

## 6. Rejestr niespójności, luk i decyzji (TL-NN)

Waga: **K** – krytyczna (utrata danych, bezpieczeństwo, niewykonalność), **W** – wysoka (brak funkcji / sprzeczność blokująca implementację), **Ś** – średnia, **N** – niska (redakcyjna). Status: **Poprawione** – zmiana naniesiona w dokumentach; **Decyzja TL** – nowa lub zmieniona decyzja; **Otwarte** – wymaga decyzji biznesowej (§8) lub spike'u.

### 6.1 Rejestr

| ID | Waga | Obszar | Problem | Rozwiązanie | Pliki | Status |
|---|---|---|---|---|---|---|
| TL-01 | W | Stos | Wersje w dokumentacji nieaktualne (NestJS 11, Node 24, PostgreSQL 17, „najnowszy SDK”) | Expo SDK 58 / RN 0.88 / TS 6, NestJS 12, Node 26 LTS, PostgreSQL 18; `uuidv7()` w bazie | 01-przeglad, 02-model, ADR-001, ADR-002, ADR-007, 99-przekazanie | Decyzja TL |
| TL-02 | W | Kontrakty | `nestjs-zod` niezgodny z NestJS 12; brak decyzji o generatorze OpenAPI | ADR-012: zod 4 + Standard Schema w NestJS 12 + `zod-to-openapi`, test zgodności tras | ADR-012 (nowy), ADR-002, ADR-011, 03-api §1, 01-przeglad | Decyzja TL |
| TL-03 | Ś | Mobile UI | `@gorhom/bottom-sheet` bez wydań od V 2026, błędy z Reanimated ≥ 4.6 i blokowaniem dotyku | Własny `Sheet` (IMP-206); biblioteka tylko po spike IMP-602 | 09-design-system §4.9, 01-przeglad §5, ADR-001 | Decyzja TL |
| TL-04 | K | Bezpieczeństwo / offline | Weryfikator PIN offline niewykonalny (serwer nie zna PIN-u przy wydaniu migawki), koszt CPU 600k × sędziowie × tablety | Weryfikator liczony raz przy generowaniu PIN-u, przechowywany na serwerze, wysyłany zaszyfrowany AES-256-GCM kluczem HKDF(pepper urządzenia) | ADR-005 (zmieniony), 05-bez §3.3, 02-model §2.9 i §7, 03-api §4, 04-przeplywy §1–3, 06-offline §2, 10-glosariusz | Decyzja TL |
| TL-05 | W | API | Odpowiedź `POST /devices/pair` bez peppera, choć 05 §3.3 zakłada jego przekazanie | Pole `pinPepper` w odpowiedzi | 03-api §3.5, 04-przeplywy §2 | Poprawione |
| TL-06 | Ś | Model | Unikalność PIN-u w turnieju wymagałaby porównania z każdym hashem Argon2id | `pin_fingerprint` = HMAC(klucz serwera, turniej ‖ PIN) z UNIQUE | 02-model §2.9, 03-api §3.5 | Poprawione |
| TL-07 | W | API | Brak endpointów i zdarzeń wymaganych przez ekrany: ponowne wysłanie kodu, konfiguracja aplikacji (`minAppVersion`, dokumenty), „Usuń dane osobowe”, `device.paired`; brak pól listy sędziów | `POST /auth/verify-email/resend`, `GET /app-config` + nagłówek `X-Min-App-Version`, `POST /entries/{id}/anonymize`, zdarzenie `device.paired`, `sheetCount`/`pinLocked` | 03-api §1, §3.1, §3.4, §3.5, §6 | Poprawione |
| TL-08 | W | API | Katalog błędów bez kodów dla: złych danych logowania, blokady konta, kodu weryfikacji, linku resetu, usunięcia konta, ostatniego kryterium, limitów, duplikatu sędziego, sesji; brak kodów pól | Kody `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `CODE_INVALID`, `RESET_TOKEN_INVALID`, `ACTIVE_TOURNAMENT_EXISTS`, `MIN_CRITERIA`, `LIMIT_EXCEEDED`, `JUDGE_NAME_TAKEN`, `JUDGE_SESSION_INVALID`; §1.3 kody pól | 03-api §1.2–1.3, §3.x | Poprawione |
| TL-09 | W | Sprzeczność | API: „ostatniego kryterium nie można usunąć przy starcie”, US-023/SCR-ORG-09: nie można usunąć ostatniego kryterium | Zgodnie z US: `DELETE` zwraca `MIN_CRITERIA` | 03-api §3.3 | Poprawione |
| TL-10 | W | Sprzeczność | Start kategorii automatycznie rozpoczyna turniej, ale nie sprawdzał weryfikacji e-maila (obejście FR-102) | `EMAIL_NOT_VERIFIED` przy starcie kategorii w turnieju DRAFT | 03-api §3.3, FR-102, 05-bez §2 | Poprawione |
| TL-11 | N | Teksty | Różne teksty tego samego komunikatu (STALE_REVISION, JUDGE_INACTIVE, baner odrzuceń, PIN zablokowany w sekwencji 3) | Ujednolicone do tekstów wiążących z SCR | 03-api §1.2, 06-offline §5, 04-przeplywy §3 | Poprawione |
| TL-12 | K | Sync | Przykład `sync/push` miał mutację sesji po ocenie (nie FIFO); brak walidacji, że ocena pochodzi z ważnej sesji tego urządzenia | Przykład w kolejności FIFO; reguła walidacji sesji i kod `JUDGE_SESSION_INVALID` | 03-api §5.1, 06-offline §5 | Poprawione |
| TL-13 | K | Sync / ADR-010 | Oceny offline odrzucone `JUDGE_INACTIVE`, `PIN_VERSION_OUTDATED`, `JUDGE_NOT_IN_PANEL` ginęły bez decyzji organizatora | Wszystkie odrzucenia poza `STALE_REVISION`, `SCHEMA_MISMATCH`, `IDEMPOTENCY_KEY_REUSED` trafiają do `rejected_submission`; warunki „Przyjmij” | ADR-010 (zmieniony), 03-api §3.6, §5.1, 06-offline §5, 02-model §1, 10-glosariusz | Decyzja TL (potwierdzenie PO – Q-17) |
| TL-14 | Ś | Realtime | `session.revoked` bez powodów dezaktywacji i zakończenia turnieju oraz bez `judgeId`; sekwencja 8 używała `REPLACED` | Rozszerzone powody i `judgeId`; poprawiona sekwencja 8 | 03-api §6, 04-przeplywy §8 | Poprawione |
| TL-15 | W | Model | Brak tabel `auth_email_token`, `idempotency_key`; brak kolumn `device.last_sync_at`, `device.active_judge_id`, `score_sheet.auth_mode`, `app_user.lockout_level`; CHECK roku z „bieżącym rokiem” (niedozwolone); etykieta pseudonimu „#nr” vs „nr”; 07-reguly odwołuje się do nieistniejącego `is_final`; semantyka `deleted_at` | Uzupełnione tabele i kolumny, CHECK 1920–2100 + walidacja w serwisie, etykieta z numeru startu, `final_results_hash` zerowany przy odblokowaniu, poprawka 07 §7 | 02-model §2.1, §2.4, §2.7, §2.11, §2.14, §2.22a, §2.23a, 07-reguly §7 | Poprawione |
| TL-16 | W | RODO / audyt | `audit_log` „tylko dopisywanie”, a retencja wymaga usunięcia PII (24 mies.) i IP (90 dni); suma kontrolna mogła zawierać nazwiska (zmiana przy pseudonimizacji) | Rola `pc_retention` z UPDATE wybranych kolumn; suma kontrolna bez PII (lista pól) | 02-model INT-08, 05-bez §5.4, §6 | Poprawione |
| TL-17 | W | RODO | Turniej Zakończona „tylko do odczytu” blokował sprostowanie i usunięcie danych osobowych (art. 16–17 RODO) | Wyjątek RODO w INT-05 dla danych osobowych i anonimizacji; bez wpływu na wyniki | 02-model INT-05, 05-bez §4, 03-api §3.4, FR-904, 05-ekrany §0 | Poprawione (weryfikacja prawna – Q-10) |
| TL-18 | Ś | Wyniki | Lista wyzwalaczy przeliczenia bez zmian panelu (dodanie/dezaktywacja/reaktywacja sędziego) – `J` i `is_complete` nieaktualne; reaktywacja sędziego a panele | Uzupełnione wyzwalacze; reaktywowany sędzia dołącza do paneli DRAFT i IN_PROGRESS | 04-przeplywy §10, 02-model §2.10 | Poprawione |
| TL-19 | Ś | Sprzeczność | `LOCK_WARNINGS`: 06 wymagał aktywnej sesji sędziego (serwer nie zna sesji offline), FR-309 nie | Warunek: urządzenia widziane od startu kategorii, z kolejką lub bez kontaktu > 2 min | 06-offline §6, 03-api §3.3 | Poprawione |
| TL-20 | K | Trwałość | WAL bez `synchronous=FULL` nie chroni przed utratą zasilania (NFR-302); brak odtworzenia wpisów IN_FLIGHT po zabiciu procesu | PRAGMA wg 06-offline §2, toast po COMMIT, odtworzenie IN_FLIGHT → QUEUED; spike IMP-603 | 06-offline §2, §3.2, ADR-004 | Poprawione |
| TL-21 | Ś | Bezpieczeństwo | Okno 24 h logowania offline liczone zegarem urządzenia – przestawienie zegara wydłuża okno | Licznik monotoniczny bez restartu, zegar ścienny po restarcie, cofnięcie zegara = przekroczenie | 05-bez §3.3, 06-offline §2, ADR-005 | Poprawione |
| TL-22 | W | Zgodność ze sklepami | FR-106 (usunięcie konta) jako Should – App Store 5.1.1(v) wymaga usuwania konta w aplikacji; Google Play wymaga też ścieżki WWW | FR-106 → Must, strona WWW wniosku, nowe kryterium US-003 | FR-106, US-003, 02-zakres-mvp, ADR-008, 05-ekrany SCR-ORG-21 | Poprawione |
| TL-23 | W | Platformy | Blokada orientacji tabletu nie działa na Androidzie 16 (target API 36, ekrany ≥ 600 dp) i jest wycofywana na iPadOS 26 | ADR-013: nakładka „Obróć tablet…”, opt-out w API 36, układ pionowy obowiązkowo przed VIII 2027 | ADR-013 (nowy), 06-ekrany §0, NFR-702, 02-zakres-mvp, ADR-001 | Decyzja TL |
| TL-24 | Ś | Ekrany | Brak opisu trybu Organizatora na tablecie (aplikacja z `supportsTablet`) | Układ telefoniczny wyśrodkowany, maks. 480 dp | 05-ekrany §0, NFR-702 | Poprawione |
| TL-25 | N | NFR | NFR-701 iOS ≥ 16, a Expo SDK 56–58 wymaga 16.4 | iOS/iPadOS ≥ 16.4 | NFR-701 | Poprawione |
| TL-26 | Ś | NFR / bezpieczeństwo | OWASP ASVS 4.0 (zastąpiony przez 5.0 w V 2025), MASVS „L1/L2” (od MASVS 2.0 poziomy są profilami testów MAS) | ASVS 5.0 L2; MASVS 2.x z profilem MAS-L1 + wybrane L2; wyjątek STORAGE-1 L2 | NFR-401, 05-bez (nagłówek) | Poprawione |
| TL-27 | Ś | PDF | Kolor wyników accent-600 na białym tle ma 4,46:1 (< 4,5:1); czcionka zmienna Inter nieobsługiwana przez pdfkit | accent-700 (6,77:1), neutral-700 dla tekstu pomocniczego; statyczne TTF | ADR-009 (zmieniony) | Decyzja TL |
| TL-28 | N | Punktacja | P11: „prototyp pokazałby −2,8” – w JavaScript `Math.round(−27,5) = −27`, czyli „-2,7” | Poprawiony opis | 07-reguly §6 P11 | Poprawione |
| TL-29 | N | Punktacja | Wzór `round(S_k)/2` dla wartości domyślnej mylący (S_k jest całkowite) | `S_k / 2` (dziesiąte: `S_k × 5`) | 07-reguly §2 | Poprawione |
| TL-30 | Ś | Punktacja | Średnie dla remisu (Technika, kary) bez definicji całkowitoliczbowej – ryzyko rozjazdu klient/serwer | Wzory w setnych i porównanie na wartościach zaokrąglonych | 07-reguly §5 | Poprawione |
| TL-31 | N | Śledzenie | FR-503 bez US-041; FR-708 (CSV) „Could” w FR, a „v1.1” w zakresie MVP | FR-503 → US-041, US-042; FR-708 opisany jako Could z przejściem do v1.1 | 03-wymagania, 02-zakres-mvp | Poprawione |
| TL-32 | N | Teksty | 01-przeglad: „To urządzenie sędziowskie”, SCR-SYS-01: „Tablet sędziowski” | Ujednolicone do SCR-SYS-01 | 01-przeglad §4.1 | Poprawione |
| TL-33 | Ś | Stany | Kategorie DRAFT po zakończeniu turnieju „nierozegrane” bez reprezentacji w modelu i UI (pigułka „W przygotowaniu” byłaby myląca) | Stan pochodny + pigułka „Nierozegrana” (do akceptacji projektanta) | 02-model §6.1, 05-ekrany §0, 09-design-system §4.2, 10-glosariusz | Poprawione (Q-08) |
| TL-34 | N | API | Niezdefiniowane `stats.athletes` i `stats.judges` | Różne zawodniczki z aktywnym startem; aktywni sędziowie | 03-api §3.2 | Poprawione |
| TL-35 | Ś | API ↔ ekrany | Brak pól używanych w ekranach: `pinLocked` i `ageGroup`/`position` w migawce, definicja `online` urządzenia, `pendingRejectedSubmissions` kategorii, `entryStatus`/`isProvisional` w rankingu | Uzupełnione pola i definicje | 03-api §3.3, §3.5, §3.6, §4 | Poprawione |
| TL-36 | Ś | NFR | NFR-304 99,9% w 10-godzinnym oknie (≈ 36 s przerwy) niemierzalne kanarkiem co 5 min | Kanarek co 1 min w oknach krytycznych | NFR-304 | Poprawione |
| TL-37 | Ś | Operacje | Polityka zamrożenia odwołuje się do „panelu operatora”, którego nie ma w MVP | Plik `ops/freeze-windows.yaml` + krok `freeze-guard` | 01-przeglad §6, NFR-905 | Poprawione |
| TL-38 | Ś | Operacje | Brak narzędzi operatora (retencja ręczna, eksport danych osoby, wyłączenie logowania offline, odblokowanie konta) | Polecenia CLI jako zadania ECS z audytem | 01-przeglad §3 | Poprawione |
| TL-39 | Ś | Architektura | Brak hostingu dokumentów prawnych, strony usunięcia konta i plików linków uniwersalnych (reset hasła z e-maila) | Strona statyczna S3 + CloudFront | 01-przeglad §3, ADR-008 | Poprawione |
| TL-40 | Ś | Wydanie | Recenzent sklepu ma jedno urządzenie, a tryb sędziego wymaga kodu parowania z telefonu organizatora (10 min) | Turniej do przeglądu z kodem do 30 dni (CLI operatora) | 05-bez §3.4 | Poprawione |
| TL-41 | Ś | Q-12 | HIBP vs lista lokalna | HIBP (zakresy, padding, timeout 1,5 s) + lista 100 000 jako zapas | 05-bez §2, ADR-008, 99-przekazanie | Decyzja TL |
| TL-42 | Ś | Q-13 | AWS vs GCP | AWS eu-central-1 | ADR-007, 99-przekazanie | Decyzja TL |
| TL-43 | N | API | `PUT /score-sheets/{id}` dublował logikę outboxu, nieużywany przez aplikację | Poza MVP – jedna ścieżka zapisu ocen | 03-api §4, ADR-003 | Decyzja TL |
| TL-44 | Ś | Wydajność | Koszt CPU Argon2id na Fargate i podatność na zalew logowań | Limity przed liczeniem hasha, `UV_THREADPOOL_SIZE=8`, pomiar w IMP-601 | 05-bez §2 | Poprawione |
| TL-45 | Ś | UI offline | Pigułka „Zsynchronizowano” wymagała WS – przy zablokowanym WSS tablet pokazywałby „Offline”, mimo działającego odpytywania | „Online” = WS lub udane HTTP < 60 s | 06-offline §8.1 | Poprawione |
| TL-46 | Ś | Logika | Niezdefiniowane, czy arkusz w kolejce / odrzucony / szkic to „oceniona” dla auto-przejścia | Oceniona = istnieje lokalny arkusz w dowolnym stanie; szkic – nie | 06-ekrany SCR-JDG-05 | Poprawione |
| TL-47 | W | Luka | Brak ścieżki ponownego użycia tabletu na kolejnych zawodach (tablet zostaje przypięty do zakończonego turnieju) | Stan „Turniej zakończony” w SCR-JDG-01 z „Sparuj z nowym turniejem” | 06-ekrany SCR-JDG-01 | Poprawione (Q-08) |
| TL-48 | Ś | Luka | Zakończenie turnieju blokuje kategorie z brakami bez ostrzeżeń, a odrzucone zgłoszenia stają się nieprzyjmowalne | Ostrzeżenia w SCR-ORG-04 z istniejących danych API | 05-ekrany SCR-ORG-04 | Poprawione (Q-08) |
| TL-49 | Ś | Sync | Przyjęte przez organizatora odrzucone zgłoszenie nie wracało na tablet bez zalogowania autora (audience tylko `JUDGE`) | Audience `DEVICE:{id}` dla arkuszy pochodzących z urządzenia | 02-model §2.21, 03-api §4 | Poprawione |
| TL-50 | N | ORM | Do potwierdzenia Drizzle vs Prisma | Drizzle 0.45 potwierdzony, 1.0 po wydaniu stabilnym | ADR-002 | Decyzja TL |
| TL-51 | Ś | NFR | Mierzalność: NFR-104 (FPS p95), NFR-105 (dwa urządzenia), NFR-305 (RTO graniczne), NFR-308 (dopiero po wydaniu), NFR-210 (≤ 2 dp) | Metody pomiaru w planie testów (Flashlight/Instruments, logi z NTP, test odtworzenia, beta jako przybliżenie, porównanie zrzutów z prototypem) | 03-test-plans/05, 06 | Rozwiązane w planie testów |
| TL-52 | N | NFR | NFR-201 „0 błędów krytycznych” bez definicji | Definicja błędu krytycznego | NFR-201 | Poprawione |
| TL-53 | – | Design | Kontrasty z 08-NFR §2.1 i mieszanki z 09-design-system przeliczone | Wszystkie zgodne (np. text/bg 14,54:1, accent/surface 4,71:1) | – | Potwierdzone |
| TL-54 | Ś | Model | Numer startowy unikalny w turnieju per start: ta sama osoba w dwóch kategoriach musi mieć dwa numery | Założenie domyślne bez zmian; pytanie Q-15 | – | Otwarte (Q-15) |
| TL-55 | – | Realtime | Socket.IO przez ALB (idle 300 s, tylko WebSocket) | Potwierdzone z uwagami wdrożeniowymi | ADR-003 | Potwierdzone |
| TL-56 | – | Ryzyka | Ryzyka techniczne R-01…R-12 wymagały aktualizacji po weryfikacji | Zaktualizowane i uzupełnione o RT-01…RT-10 | [99-przekazanie-dla-pm.md §6](../04-implementation-plans/99-przekazanie-dla-pm.md#6-ryzyka-techniczne-po-weryfikacji) | Poprawione |

### 6.2 Zmienione pliki

| Plik | Zmiany (TL) |
|---|---|
| [01-przeglad-architektury.md](01-przeglad-architektury.md) | TL-01, 02, 03, 32, 37, 38, 39 |
| [02-model-danych.md](02-model-danych.md) | TL-01, 04, 06, 13, 15, 16, 17, 18, 33, 49 |
| [03-api.md](03-api.md) | TL-02, 04, 05, 07, 08, 09, 10, 11, 12, 13, 14, 17, 19, 34, 35, 43, 49 |
| [04-przeplywy-danych.md](04-przeplywy-danych.md) | TL-04, 05, 11, 14, 18 |
| [05-bezpieczenstwo.md](05-bezpieczenstwo.md) | TL-04, 07/08 (macierz §4.1), 10, 16, 17, 21, 26, 40, 41, 44 |
| [06-offline-i-synchronizacja.md](06-offline-i-synchronizacja.md) | TL-04, 11, 13, 19, 20, 21, 45 |
| [99-przekazanie-dla-tech-leada.md](99-przekazanie-dla-tech-leada.md) | TL-01, 41, 42 (odnośniki do weryfikacji) |
| [adr/ADR-001](adr/ADR-001-aplikacja-mobilna-react-native-expo.md) … [ADR-011](adr/ADR-011-monorepo-i-wspoldzielony-silnik-punktacji.md) | statusy i sekcje weryfikacji; zmiany w ADR-001, 002, 005, 009, 010 |
| [adr/ADR-012](adr/ADR-012-kontrakty-walidacja-i-openapi.md), [adr/ADR-013](adr/ADR-013-orientacja-i-rozmiar-okna-tabletu.md) | nowe |
| [../02-specification/02-zakres-mvp.md](../02-specification/02-zakres-mvp.md) | TL-22, 23, 31 |
| [../02-specification/03-wymagania-funkcjonalne.md](../02-specification/03-wymagania-funkcjonalne.md) | FR-102 (TL-10), FR-106 (TL-22), FR-503, FR-708 (TL-31), FR-904 (TL-17) |
| [../02-specification/04-user-stories.md](../02-specification/04-user-stories.md) | US-003 (TL-22) |
| [../02-specification/05-ekrany-organizatora.md](../02-specification/05-ekrany-organizatora.md) | §0 (TL-17, 24, 33), SCR-ORG-04 (TL-48), SCR-ORG-21 (TL-07, 22) |
| [../02-specification/06-ekrany-sedziego.md](../02-specification/06-ekrany-sedziego.md) | §0 (TL-23), SCR-JDG-01 (TL-47), SCR-JDG-05 (TL-46) |
| [../02-specification/07-reguly-punktacji.md](../02-specification/07-reguly-punktacji.md) | TL-15, 28, 29, 30 |
| [../02-specification/08-wymagania-niefunkcjonalne.md](../02-specification/08-wymagania-niefunkcjonalne.md) | NFR-201, 304, 401, 701, 702, 905 |
| [../02-specification/09-design-system.md](../02-specification/09-design-system.md) | §3, §4.2, §4.9 (TL-03, 23, 33) |
| [../02-specification/10-glosariusz.md](../02-specification/10-glosariusz.md) | nowe pojęcia (TL-04, 13, 33) |

## 7. Nowe i zmienione decyzje

| ADR | Status po weryfikacji | Zmiana |
|---|---|---|
| ADR-001 | zmieniony | Expo SDK 58, własny `Sheet`, moduły potwierdzone, odwołanie do ADR-013 |
| ADR-002 | zmieniony | Node 26 LTS, NestJS 12, PostgreSQL 18, Drizzle potwierdzony, TS 6 |
| ADR-003 | potwierdzony | uwagi ALB/Socket.IO, `PUT /score-sheets` poza MVP |
| ADR-004 | potwierdzony | doprecyzowanie trwałości SQLite |
| ADR-005 | **zmieniony** | nowy schemat weryfikatora offline (TL-04), fingerprint PIN-u, okno 24 h |
| ADR-006 | potwierdzony | przykłady przeliczone |
| ADR-007 | potwierdzony | Q-13 = AWS, szacunek kosztów |
| ADR-008 | potwierdzony | Q-12 = HIBP, usunięcie konta Must, linki uniwersalne |
| ADR-009 | zmieniony | kontrast PDF (accent-700), statyczne fonty |
| ADR-010 | **zmieniony** | rozszerzony zakres odrzuconych zgłoszeń (TL-13) |
| ADR-011 | potwierdzony | Turborepo, pnpm 12, Metro |
| **ADR-012** | nowy | kontrakty: zod 4 + Standard Schema + zod-to-openapi |
| **ADR-013** | nowy | orientacja i rozmiar okna tabletów |

## 8. Kwestie otwarte

### 8.1 Status pytań Architekta

| ID | Status | Uwagi TL |
|---|---|---|
| Q-01 | otwarte (PO / sędzia ekspert) | założenie domyślne zaimplementowane (IMP-054); weryfikacja na UAT (TC-UAT-011) |
| Q-02 | otwarte (PO) | j.w. (IMP-052) |
| Q-03 | otwarte (PO / projektant) | wskaźnik „nieruszone” ≈ +8 h MOB, gdyby PO go wybrał |
| Q-04 | otwarte (PO) | „wznowienie turnieju” poza planem (≈ +16 h); zakończenie turnieju jest nieodwracalne – stąd ostrzeżenia TL-48 |
| Q-05, Q-06, Q-07 | otwarte (PO / projektant) | zmiany tylko w szablonach i słownikach (≤ 4 h) |
| Q-08 | otwarte (projektant) – **pilne** | blokuje DoR ekranów poza designem; obejmuje propozycje TL-23, 33, 47, 48 (IMP-650 w 1.–2. tygodniu) |
| Q-09 | otwarte (PO) | domyślnie bez blokady zrzutów (+3 h, gdyby PO zdecydował inaczej) |
| Q-10 | otwarte (prawnik) – **blokuje wydanie** | treść dokumentów, retencja 24 mies., wyjątek RODO TL-17, zgody opiekunów |
| Q-11 | otwarte (PO / PM) | bez płatności w MVP |
| Q-12, Q-13 | **zamknięte przez TL** | §4 |
| Q-14 | otwarte (PO) | v1.1; gdyby pilot wymagał sędziego głównego i średniej obciętej: ≈ 60–80 h |

### 8.2 Nowe pytania (decyzje biznesowe z założeniem domyślnym)

| ID | Pytanie | Do kogo | Założenie domyślne w dokumentacji i planie |
|---|---|---|---|
| Q-15 | Czy ta sama zawodniczka startująca w dwóch kategoriach ma mieć jeden numer startowy (numer osoby), czy osobny numer w każdej kategorii (jak dziś)? | PO / organizator pilotażowy | osobny numer na start (unikalny w turnieju); zmiana na numer osoby ≈ +12 h (wybór istniejącej zawodniczki w SCR-ORG-11) |
| Q-16 | Usunięcie konta: natychmiastowa dezaktywacja (bez anulowania) czy 30 dni z możliwością anulowania przy logowaniu? | PO / prawnik | natychmiastowa dezaktywacja, twarde usunięcie po 30 dniach; anulowanie ≈ +4 h |
| Q-17 | Czy organizator może świadomie przyjmować oceny odrzucone z powodu dezaktywacji sędziego, nieaktualnego PIN-u lub sesji (TL-13)? | PO | tak, z oznaczeniem w audycie |
| Q-18 | Termin wersji v1.1 z pionowym układem tabletu (wymóg Google Play API 37 – VIII 2027) | PO / PM | v1.1 przed VI 2027 |
| Q-19 | Budżet na urządzenia referencyjne / farmę urządzeń, pentest zewnętrzny i plan EAS | PM | zakup 4 urządzeń referencyjnych, pentest przed pilotem |

## 9. Zaktualizowane ryzyka techniczne (skrót)

Pełna tabela z właścicielami i mitygacjami: [99-przekazanie-dla-pm.md §6](../04-implementation-plans/99-przekazanie-dla-pm.md#6-ryzyka-techniczne-po-weryfikacji). Zmiany: R-04 obniżone (natywne PBKDF2, pomiar w IMP-601), R-05 doprecyzowane schematem TL-04, R-06 bez zmian (wyjątek MASVS-STORAGE-1 L2), R-11 – SDK 58 jest świeży (8 dni), nowe ryzyka RT-01…RT-10 (świeże wersje Expo i NestJS, schemat weryfikatora, trwałość SQLite, bottom sheet, przegląd w sklepach, termin układu pionowego, czasy oczekiwania na konta i SES, dostępność urządzeń, treść prawna).

## 10. Wynik kontroli krzyżowej

| Relacja | Zakres sprawdzenia | Znalezione problemy | Wynik |
|---|---|---|---|
| FR ↔ US | 80 FR w MVP, 55 US | FR-503 bez US-041; priorytet FR-106 (TL-31, TL-22) | poprawione; 0 FR bez US |
| US ↔ SCR | wszystkie US | brak luk; nowe kryterium US-003 | 0 US bez ekranu (US-064, US-090 – backend, bez ekranu z założenia) |
| SCR ↔ API | 35 ekranów MVP | brakujące endpointy i pola (TL-07, TL-35) | poprawione |
| API ↔ model danych | wszystkie endpointy | brakujące tabele/kolumny, pepper, weryfikator (TL-04, 05, 15) | poprawione |
| API ↔ uprawnienia | wszystkie endpointy | macierz 05 §4 nie obejmowała części endpointów | dodana macierz §4.1 (62 grupy) |
| Kody błędów | katalog 03-api §1.2 | brakujące kody i niespójne teksty (TL-08, TL-11) | 40 kodów, każdy z testem TC-ERR |
| Zdarzenia WS | 03-api §6 vs 04/06 | brak `device.paired`, niepełne `session.revoked` (TL-07, TL-14) | poprawione |
| Reguły punktacji | P1–P14, D-SC-01…12 | P11 (TL-28), średnie remisowe (TL-30), wzór domyślny (TL-29) | poprawione; P1–P10, P12–P14 poprawne |
| Offline / sync | 06 vs 03 vs 04 | FIFO, sesja, odrzucenia, LOCK_WARNINGS, trwałość, audience (TL-12, 13, 19, 20, 49) | poprawione |
| NFR | 68 wymagań | standardy, minimum iOS, mierzalność (TL-25, 26, 36, 51, 52) | poprawione / metody pomiaru w planie testów |
| Design | prototyp v2, uploads, Nocturne | kontrasty OK; PDF; brakujące stany (TL-23, 27, 33, 47, 48) | poprawione; propozycje do Q-08 |
| RODO | 05 §5 vs model i statusy | audyt vs retencja, tryb tylko do odczytu vs prawa osób (TL-16, TL-17) | poprawione; weryfikacja prawna Q-10 |

## 11. Sprawdzenie przykładów punktacji

| Przykład | Wynik przeliczenia TL | Status |
|---|---|---|
| P1 | 17 + 12,75 + 8 + 8 + 8,5 = 54,25 → „54,3” | zgodny |
| P2 | 54,25 − 4 = 50,25 → „50,3” | zgodny |
| P3 | 17 + 13,5 + 8 + 9 + 7,5 − 1 = 54,00 | zgodny |
| P4 | 273,75 / 5 = 54,75 → „54,8”; całkowitoliczbowo ⌊(2·27375+5)/10⌋ = 5475 | zgodny |
| P5 | 271,50 / 5 = 54,30 | zgodny |
| P6 | 263,50 / 5 = 52,70; 263,25 / 5 = 52,65 | zgodny |
| P7 | 166,50 / 3 = 55,50 | zgodny |
| P8 | 110,25 / 2 = 55,125 → 55,13 → „55,1” | zgodny |
| P9, P10 | kolejność wg Techniki, kar, ex aequo 1, 2, 3, 3, 5 | zgodne |
| P11 | 3,25 − 6 = −2,75 → 0,00; **prototyp pokazałby „-2,7”, nie „−2,8”** | poprawiony opis (TL-28) |
| P12 | 61,25 − 2 = 59,25 → „59,3”, MAX 75 | zgodny |
| P13 | 164,50 / 3 = 54,833 → 54,83 | zgodny |
| P14 | 32,5 / 65 | zgodny |

## 12. Źródła

- Expo – changelog i wydania SDK 56–58: https://expo.dev/changelog, https://expo.dev/changelog/sdk-58, https://expo.dev/changelog/sdk-56.md; tabela wersji SDK (RN, React, minimum iOS/Android, Node): https://docs.expo.dev/versions/latest/; Skia w SDK 58: https://docs.expo.dev/versions/v58.0.0/sdk/skia/
- Rejestr npm (`npm view <pakiet> version time peerDependencies`, 23.10.2026) – wersje z §3; szablon `expo-template-default@sdk-58` (TypeScript ~6.0.3, React 19.3.0, RN 0.88.0, Reanimated 4.7.1, worklets 0.13.0, RNGH ~3.3.0)
- Harmonogram Node.js: https://github.com/nodejs/Release (`schedule.json`)
- NestJS 12: https://www.infoq.com/news/2026/10/nestjs-12-observability/, https://en.wikipedia.org/wiki/NestJS
- Amazon RDS for PostgreSQL 18: https://aws.amazon.com/about-aws/whats-new/2025/11/amazon-rds-postgresql-major-version-18, https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- ALB – atrybuty (idle timeout 1–4000 s, domyślnie 60 s): https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html
- Socket.IO – wiele węzłów, sticky sessions: https://socket.io/docs/v4/using-multiple-nodes/
- Have I Been Pwned – API v3, Pwned Passwords: https://haveibeenpwned.com/API/v3
- Android 16 – zmiany orientacji i zmiany rozmiaru: https://android-developers.googleblog.com/2025/01/orientation-and-resizability-changes-in-android-16.html, https://developer.android.com/about/versions/16/behavior-changes-16
- Apple TN3192 – wycofanie `UIRequiresFullScreen`: https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key
- App Store Review Guidelines 5.1.1(v) (usuwanie konta): https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage; Google Play – wymagania usuwania konta: https://support.google.com/googleplay/android-developer/answer/13327111
- OWASP ASVS 5.0: https://owasp.org/www-project-application-security-verification-standard/; OWASP MASVS/MASTG: https://mas.owasp.org/
- @gorhom/bottom-sheet – zgłoszenia #2785, #2764, #2781: https://github.com/gorhom/react-native-bottom-sheet/issues
- react-native-quick-crypto – PBKDF2: https://crypto.margelo.com/docs/api/pbkdf2
- pdfmake 0.3 – użycie po stronie serwera: https://pdfmake.github.io/docs/0.3/getting-started/server-side/
- Wydania narzędzi (GitHub Releases): Maestro https://github.com/mobile-dev-inc/maestro/releases, k6 https://github.com/grafana/k6/releases, OWASP ZAP https://github.com/zaproxy/zaproxy/releases, gitleaks https://github.com/gitleaks/gitleaks/releases, Semgrep https://github.com/semgrep/semgrep/releases, Inter https://github.com/rsms/inter/releases
