# EP-14 – Spike’i techniczne

> Dokument: `04-implementation-plans/14-spike.md` · Tech Lead (Agent 2) · 23.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md)

Spike'i rozstrzygają ryzyka z weryfikacji TL przed implementacją właściwą. Każdy ma **limit czasu** (szacunek jest limitem – po jego przekroczeniu TL podejmuje decyzję z dostępnymi danymi), **kryterium decyzji** i wynik w postaci notatki `docs-dev/spikes/NNN.md`. Kod spike'ów nie trafia do `main` (gałąź `spike/*`), chyba że DoD stanowi inaczej. Kolejność: IMP-600 (zgodność SDK) jako pierwszy, potem równolegle 601–609.

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 10 | 66 h | BE 6 · MOB 46 · FULL 8 · QA 6 |


## Zadania

### IMP-600 – SPIKE: zgodność stosu Expo SDK 58 (limit 8 h)
- **Epik / obszar:** EP-14 Spike’i techniczne | **Rola:** MOB
- **Cel:** Zespół wie przed startem implementacji, czy wszystkie moduły natywne wybranego stosu działają razem na Expo SDK 58 na tabletach referencyjnych.
- **Zakres:** Aplikacja testowa: Reanimated 4.7 + worklets 0.13, Gesture Handler 3.3, Skia 2.14, quick-crypto 1.1 (PBKDF2, AES-GCM, HKDF), MMKV 4, expo-sqlite, expo-camera (QR), expo-secure-store, socket.io-client; build iOS/Android, uruchomienie na Tab A8 i iPad 9; **Poza zakresem:** Produkcja kodu
- **Zależności:** [IMP-001](01-fundamenty-i-devops.md#imp-001--monorepo-pnpm-workspaces--turborepo--bazowa-konfiguracja-ts)
- **Odwołania:** ADR-001, TL-01
- **Kroki:**
  1. Utwórz aplikację testową `spikes/sdk58-stack` z Reanimated 4.7 + worklets 0.13, Gesture Handler 3.3, Skia 2.14, `react-native-quick-crypto` 1.1, MMKV 4, `expo-sqlite`, `expo-camera`, `expo-secure-store`, `socket.io-client`.
  2. Dodaj ekran próbny wywołujący każdy moduł: animacja w workletcie, gest, rysunek Skia, PBKDF2 + AES-GCM + HKDF, zapis MMKV i SQLite, skan QR, SecureStore, połączenie WS.
  3. Zbuduj dev client i build release na iOS i Androidzie (New Architecture) i uruchom na Galaxy Tab A8 i iPad 9.
  4. Zastosuj kryterium decyzji: wszystkie moduły budują się i działają → SDK 58; moduł blokujący bez obejścia w ≤ 1 dzień → SDK 57 (RN 0.86) i ponowna ocena.
  5. Zapisz wynik, pomiary i decyzję w `docs-dev/spikes/600.md`; zaktualizuj szacunki zadań zależnych.
- **Definition of Done:**
  - [ ] Notatka decyzyjna w `docs-dev/spikes/600.md` z wersjami
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-601 – SPIKE: PBKDF2 600k na tabletach i Argon2id na Fargate (limit 6 h)
- **Epik / obszar:** EP-14 Spike’i techniczne | **Rola:** MOB
- **Cel:** Zespół zna rzeczywisty czas weryfikacji PIN-u offline na tabletach i koszt Argon2id na Fargate, więc parametry kryptografii są potwierdzone pomiarem.
- **Zakres:** Pomiar `pbkdf2` (quick-crypto) na Tab A8 i iPad 9 (20 prób zimnych/ciepłych); pomiar Argon2id (m=19 MiB, t=2) na zadaniu Fargate 0,5 vCPU ARM; **Poza zakresem:** –
- **Zależności:** [IMP-600](#imp-600--spike-zgodność-stosu-expo-sdk-58-limit-8-h)
- **Odwołania:** NFR-110, R-04, ADR-005, [TC-PERF-010](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-010)
- **Kroki:**
  1. Napisz w aplikacji spike pomiar `pbkdf2` 600 000 iteracji (`react-native-quick-crypto`, SHA-256, 32 B) – 20 prób zimnych i ciepłych na Galaxy Tab A8 i iPad 9.
  2. Napisz skrypt Node mierzący Argon2id (m = 19 MiB, t = 2, p = 1) na zadaniu Fargate 0,5 vCPU ARM64 – 100 prób, p50/p95.
  3. Zmierz równoległość: 10 równoczesnych logowań na jednym zadaniu (kolejka puli wątków `UV_THREADPOOL_SIZE=8`).
  4. Zastosuj kryterium: p95 ≤ 1 s na Tab A8 → 600k; 1–2 s → 600k z UI „Sprawdzanie…”; > 2 s → wniosek o 310k do Architekta/PO; Argon2id p95 ≤ 150 ms na logowanie, inaczej zadanie 1 vCPU.
  5. Zapisz wynik, pomiary i decyzję w `docs-dev/spikes/601.md`; zaktualizuj szacunki zadań zależnych.
- **Definition of Done:**
  - [ ] Raport z wynikami i decyzją
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-602 – SPIKE: bottom sheet – @gorhom/bottom-sheet vs własny (limit 4 h)
- **Epik / obszar:** EP-14 Spike’i techniczne | **Rola:** MOB
- **Cel:** Zespół rozstrzyga na podstawie prototypu, czy arkusze organizatora budować na `@gorhom/bottom-sheet`, czy na własnym komponencie, co ustala zakres i szacunek komponentu `Sheet`.
- **Zakres:** 5 scenariuszy (SCR-ORG-02/05/09/12/15): klawiatura, przewijanie, przycisk wstecz, backdrop po zamknięciu, ułamkowa wysokość ekranu, a11y; **Poza zakresem:** –
- **Zależności:** [IMP-600](#imp-600--spike-zgodność-stosu-expo-sdk-58-limit-8-h)
- **Odwołania:** TL-03, 09-design-system §4.9
- **Kroki:**
  1. Zbuduj prototyp 5 arkuszy (SCR-ORG-02, 05, 09, 12, 15) na `@gorhom/bottom-sheet` 5.x z Reanimated 4 i Gesture Handler 3.
  2. Sprawdź scenariusze: klawiatura nad polami, przewijanie długiej treści, przycisk wstecz Androida, brak blokowania dotyku przez tło po zamknięciu, wysokość dopasowana do treści, modalność VoiceOver/TalkBack.
  3. Uruchom na iOS i Androidzie (telefon i tablet) i zapisz listę błędów z oceną (blokujący / obejście).
  4. Zastosuj kryterium: zero błędów blokujących na obu platformach → gorhom (IMP-206 = 6 h, opakowanie); w przeciwnym razie własny komponent (IMP-206 = 16 h).
  5. Zapisz wynik, pomiary i decyzję w `docs-dev/spikes/602.md`; zaktualizuj szacunki zadań zależnych.
- **Definition of Done:**
  - [ ] Decyzja zapisana; aktualizacja szacunku IMP-206
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-603 – SPIKE: trwałość expo-sqlite przy kill -9 i utracie zasilania (limit 8 h)
- **Epik / obszar:** EP-14 Spike’i techniczne | **Rola:** MOB
- **Cel:** Zespół potwierdza pomiarem, że zatwierdzona ocena przetrwa zabicie aplikacji i utratę zasilania, oraz wybiera ustawienia SQLite spełniające limit 100 ms do toastu.
- **Zakres:** Prototyp zapisu arkusz + outbox; WAL z `synchronous=NORMAL` vs `FULL` (+ `fullfsync` iOS); 100× kill -9, 10× twarde wyłączenie; pomiar czasu commit; **Poza zakresem:** –
- **Zależności:** [IMP-600](#imp-600--spike-zgodność-stosu-expo-sdk-58-limit-8-h)
- **Odwołania:** NFR-302, NFR-103, TL-20, ADR-004, [TC-SYNC-004](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-004), [TC-SYNC-006](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-006)
- **Kroki:**
  1. Napisz prototyp zapisu arkusza z notami, karami i wpisem outboxu w jednej transakcji `expo-sqlite` z WAL.
  2. Porównaj `synchronous=NORMAL` i `FULL` (+ `fullfsync`/`checkpoint_fullfsync` na iOS) – czas COMMIT p50/p95 na Tab A8 i iPad 9 (1 000 zapisów).
  3. Wykonaj 100× kill -9 tuż po toaście (`adb shell am force-stop`, `simctl terminate` / urządzenie) i 10× twarde wyłączenie (wyciągnięcie baterii niemożliwe – wymuszone wyłączenie przyciskiem) i policz utracone zapisy.
  4. Zastosuj kryterium: `FULL` z p95 ≤ 100 ms i 0 utrat → przyjąć; > 100 ms → `FULL` + toast po COMMIT z optymalizacją (jedna transakcja, prepared statements) lub `NORMAL` za zgodą PO z ryzykiem tylko utraty zasilania.
  5. Zapisz wynik, pomiary i decyzję w `docs-dev/spikes/603.md`; zaktualizuj szacunki zadań zależnych.
- **Definition of Done:**
  - [ ] Raport i ustawienia PRAGMA dla IMP-350
- **Szacunek:** 8 h (M) | **Ryzyko:** wysokie

### IMP-604 – SPIKE: Socket.IO przez ALB i klient RN w tle (limit 8 h)
- **Epik / obszar:** EP-14 Spike’i techniczne | **Rola:** FULL
- **Cel:** Zespół potwierdza w realnej sieci, że Socket.IO przez ALB dostarcza zdarzenia w ≤ 1 s, wraca po wyjściu aplikacji z tła i poprawnie przechodzi na odpytywanie przy zablokowanym WSS.
- **Zakres:** Gateway testowy za ALB dev (idle 300 s), klient RN: tło/pierwszy plan (iOS, Android), odświeżenie tokenu przy ponownym połączeniu, blokada WSS (fallback), czas dostarczenia; **Poza zakresem:** –
- **Zależności:** [IMP-011](01-fundamenty-i-devops.md#imp-011--terraform-ecs-fargate-alb-dns-certyfikaty), [IMP-600](#imp-600--spike-zgodność-stosu-expo-sdk-58-limit-8-h)
- **Odwołania:** ADR-003, NFR-105, NFR-303, [TC-RT-012](../03-test-plans/02-testy-integracyjne-api.md#tc-rt-012)
- **Kroki:**
  1. Wdróż gateway testowy (`/rt`, tylko `websocket`) za ALB dev z idle timeout 300 s i adapterem Redis na Valkey.
  2. Zbuduj klienta RN mierzącego czas dostarczenia (znacznik serwera → odbiór) i zachowanie w tle i po powrocie na pierwszy plan (iOS, Android).
  3. Sprawdź odświeżenie tokenu przy ponownym połączeniu (`auth.expired`), 1 h bezczynności bez zerwań i fallback na odpytywanie przy zablokowanym WSS (proxy blokujące upgrade).
  4. Zastosuj kryterium: dostarczenie ≤ 1 s p95, ponowne połączenie ≤ 5 s po powrocie z tła, brak zerwań w 1 h bezczynności → architektura bez zmian; inaczej korekta `pingInterval`/idle timeout.
  5. Zapisz wynik, pomiary i decyzję w `docs-dev/spikes/604.md`; zaktualizuj szacunki zadań zależnych.
- **Definition of Done:**
  - [ ] Raport z ustawieniami dla IMP-154/216
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-605 – SPIKE: pdfmake z Inter i polskimi znakami, wydajność (limit 6 h)
- **Epik / obszar:** EP-14 Spike’i techniczne | **Rola:** BE
- **Cel:** Zespół potwierdza, że pdfmake z fontem Inter poprawnie renderuje polskie znaki i typografię oraz generuje PDF największego turnieju w ≤ 10 s.
- **Zakres:** Dokument testowy z polskimi znakami, „−”, „–”, „„”” i statycznymi Inter 400/500; turniej 60 kategorii / 1 500 startów; pomiar na 1 vCPU; **Poza zakresem:** –
- **Zależności:** [IMP-001](01-fundamenty-i-devops.md#imp-001--monorepo-pnpm-workspaces--turborepo--bazowa-konfiguracja-ts)
- **Odwołania:** ADR-009, NFR-107, TL-27, [TC-PDF-003](../03-test-plans/02-testy-integracyjne-api.md#tc-pdf-003), [TC-PDF-010](../03-test-plans/02-testy-integracyjne-api.md#tc-pdf-010)
- **Kroki:**
  1. Przygotuj dokument testowy z polskimi znakami (ą, ć, ę, ł, ń, ó, ś, ź, ż, wielkie litery), znakami „−”, „–”, „„”” i liczbami tabelarycznymi w Inter 400/500 (statyczne TTF).
  2. Wygeneruj PDF turnieju FX-MAX (60 kategorii, 1 500 startów) i zmierz czas na 1 vCPU (p95 z 5 przebiegów) i rozmiar pliku.
  3. Sprawdź poprawność glifów (`pdffonts`, wizualnie i ekstrakcją tekstu) oraz łamanie tabel między stronami.
  4. Zastosuj kryterium: glify poprawne i ≤ 10 s → pdfmake; inaczej `@react-pdf/renderer` (alternatywa z ADR-009).
  5. Zapisz wynik, pomiary i decyzję w `docs-dev/spikes/605.md`; zaktualizuj szacunki zadań zależnych.
- **Definition of Done:**
  - [ ] Raport i szablon startowy dla IMP-172
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-606 – SPIKE: animacja splash – Skia vs sekwencja klatek (limit 8 h)
- **Epik / obszar:** EP-14 Spike’i techniczne | **Rola:** MOB
- **Cel:** Zespół wybiera technikę animacji splash (Skia albo sekwencja klatek) na podstawie płynności, rozmiaru i czasu startu na tabletach referencyjnych.
- **Zakres:** Port fragmentu `pole-spinner.js` na Skia (siatka 80×70, 24 kl./s) vs sprite wygenerowany skryptem z canvasa; pomiar FPS, rozmiaru i czasu startu; **Poza zakresem:** –
- **Zależności:** [IMP-600](#imp-600--spike-zgodność-stosu-expo-sdk-58-limit-8-h)
- **Odwołania:** R-07, ADR-001, FR-210
- **Kroki:**
  1. Przenieś fragment `design/pole-spinner.js` (siatka 80×70, 24 kl./s, jedna pętla) na `@shopify/react-native-skia` (rysowanie pikseli `Picture`/`Atlas`).
  2. Wygeneruj sprite ze skryptu canvas (Node + `canvas`) z tego samego algorytmu i odtwórz go komponentem obrazu z przesunięciem klatek.
  3. Zmierz FPS (Perf Monitor), wpływ na czas startu i rozmiar zasobów na Tab A8 i iPad 9.
  4. Zastosuj kryterium: Skia ≥ 55 fps na Tab A8 i port ≤ 2 dni → Skia; inaczej sprite (rozmiar ≤ 2 MB).
  5. Zapisz wynik, pomiary i decyzję w `docs-dev/spikes/606.md`; zaktualizuj szacunki zadań zależnych.
- **Definition of Done:**
  - [ ] Decyzja i szacunek IMP-211
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-607 – SPIKE: orientacja i zmiana okna (Android 16, iPadOS 26) (limit 6 h)
- **Epik / obszar:** EP-14 Spike’i techniczne | **Rola:** MOB
- **Cel:** Zespół wie, jak zachowują się blokada orientacji i zmiana rozmiaru okna na Androidzie 16 i iPadOS 26, i potwierdza, że nakładka „Obróć tablet” wystarcza jako zabezpieczenie panelu sędziego.
- **Zakres:** Emulator Android 16 (sw ≥ 600 dp) z target API 36 i opt-out; iPad z iPadOS 26 – zmiana rozmiaru okna; zachowanie `expo-screen-orientation`; **Poza zakresem:** –
- **Zależności:** [IMP-600](#imp-600--spike-zgodność-stosu-expo-sdk-58-limit-8-h)
- **Odwołania:** ADR-013, TL-23, NFR-702, [TC-COMPAT-005](../03-test-plans/05-testy-niefunkcjonalne.md#tc-compat-005), [TC-COMPAT-006](../03-test-plans/05-testy-niefunkcjonalne.md#tc-compat-006)
- **Kroki:**
  1. Uruchom aplikację testową na emulatorze Android 16 (najmniejsza szerokość ≥ 600 dp, target API 36) z i bez opt-out `PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY`.
  2. Sprawdź na iPadzie z iPadOS 26 zmianę rozmiaru okna (Stage Manager, okna) i zachowanie `expo-screen-orientation` `lockAsync(LANDSCAPE)`.
  3. Zweryfikuj działanie nakładki `OrientationGuard` przy szerokości < 1024 dp i pionie oraz zachowanie stanu formularza.
  4. Zastosuj kryterium: opt-out działa → MVP z nakładką jako zabezpieczeniem; nie działa → nakładka jako jedyna ochrona (bez zmian zakresu).
  5. Zapisz wynik, pomiary i decyzję w `docs-dev/spikes/607.md`; zaktualizuj szacunki zadań zależnych.
- **Definition of Done:**
  - [ ] Raport dla IMP-213/IMP-300
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-608 – SPIKE: regresja wizualna w CI (limit 6 h)
- **Epik / obszar:** EP-14 Spike’i techniczne | **Rola:** QA
- **Cel:** Zespół wybiera sposób porównywania zrzutów ekranu w CI, który daje mniej niż 1% fałszywych różnic.
- **Zakres:** Maestro `takeScreenshot` + odiff vs alternatywy (Storybook RN + Loki/Chromatic – wymaga web); stabilność zrzutów (animacje, czcionki, czas); **Poza zakresem:** –
- **Zależności:** [IMP-454](11-qa-i-automatyzacja-testow.md#imp-454--maestro-struktura-identyfikatory-uruchamianie-w-ci)
- **Odwołania:** NFR-210, NFR-208
- **Kroki:**
  1. Zbuduj prototyp: Maestro `takeScreenshot` na 10 przypadkach DevCatalog + `odiff` z wzorcami.
  2. Ustabilizuj zrzuty: wyłączone animacje, zamrożony czas, stałe fonty, maska paska statusu, stała rozdzielczość emulatora.
  3. Uruchom 20 przebiegów na tym samym commicie i policz fałszywe różnice; porównaj z alternatywą Storybook RN + Loki/Chromatic (wymaga web – ocena kosztu).
  4. Zastosuj kryterium: < 1% fałszywych różnic w 20 przebiegach → Maestro + odiff (IMP-459).
  5. Zapisz wynik, pomiary i decyzję w `docs-dev/spikes/608.md`; zaktualizuj szacunki zadań zależnych.
- **Definition of Done:**
  - [ ] Decyzja dla IMP-459
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-609 – SPIKE: Drizzle na expo-sqlite i zapis migawki (limit 6 h)
- **Epik / obszar:** EP-14 Spike’i techniczne | **Rola:** MOB
- **Cel:** Zespół potwierdza, że Drizzle na `expo-sqlite` obsługuje migracje w aplikacji i zapisuje migawkę turnieju maksymalnego w ≤ 2 s na Galaxy Tab A8.
- **Zakres:** Migracje Drizzle w aplikacji, transakcyjny zapis migawki FX-MAX (1 500 startów), czas ≤ 2 s na Tab A8; **Poza zakresem:** –
- **Zależności:** [IMP-600](#imp-600--spike-zgodność-stosu-expo-sdk-58-limit-8-h)
- **Odwołania:** NFR-108, ADR-004, [TC-SYNC-036](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-036)
- **Kroki:**
  1. Skonfiguruj Drizzle z driverem `expo-sqlite`, schemat lokalny z 06-offline §2 i migracje `useMigrations` w aplikacji testowej.
  2. Zaimplementuj transakcyjny zapis migawki FX-MAX (60 kategorii, 1 500 startów, 30 sędziów) przez Drizzle i alternatywnie surowym SQL wsadowym (`INSERT … VALUES` po 500, prepared statements).
  3. Zmierz czas zapisu i odczytu kolejki (p50/p95) na Tab A8 i iPad 9.
  4. Zastosuj kryterium: ≤ 2 s → Drizzle; > 2 s → zapis wsadowy surowym SQL w transakcji przy zachowaniu Drizzle do odczytów.
  5. Zapisz wynik, pomiary i decyzję w `docs-dev/spikes/609.md`; zaktualizuj szacunki zadań zależnych.
- **Definition of Done:**
  - [ ] Raport dla IMP-350/351
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

