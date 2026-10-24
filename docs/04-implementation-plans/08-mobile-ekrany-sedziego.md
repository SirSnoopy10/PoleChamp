# EP-08 – Mobile: ekrany sędziego (tablet)

> Dokument: `04-implementation-plans/08-mobile-ekrany-sedziego.md` · Tech Lead (Agent 2) · 23.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md)

Panel sędziego SCR-JDG-00…10 ([06-ekrany-sedziego.md](../02-specification/06-ekrany-sedziego.md)). Ekrany czytają wyłącznie z lokalnej bazy SQLite (EP-09); żaden ekran nie czeka na sieć. Krytyczne: logowanie PIN offline z nowym schematem weryfikatora (TL-04, IMP-305), płynność suwaków na Galaxy Tab A8 (IMP-310, R-01), zatwierdzenie ≤ 100 ms z trwałym zapisem (IMP-313), nakładka orientacji (TL-23), ponowne użycie tabletu po zakończeniu turnieju (TL-47).

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 20 | 131 h | MOB 131 |


## Zadania

### IMP-300 – Powłoka trybu sędziego i JudgeHeader
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Po zalogowaniu sędzia widzi na każdym ekranie ten sam nagłówek (turniej, stan synchronizacji, swój profil, wylogowanie), ekran nie gaśnie podczas oceniania, a układ dwupanelowy działa tylko w poziomie.
- **Zakres:** Grupa tras `(judge)` bez stosu (kategorie ↔ kategoria), `JudgeHeader` (ikona `gavel`, nazwa turnieju, slot `SyncPill`, chip sędziego, wylogowanie), `expo-keep-awake` w SCR-JDG-04/05, `OrientationGuard` (nakładka TL-23), układ dwupanelowy (300 dp + reszta); **Poza zakresem:** Logika sesji (IMP-306)
- **Zależności:** [IMP-213](06-mobile-fundamenty-i-design-system.md#imp-213--scr-sys-01--wybór-trybu-forma-urządzenia-orientacja-per-tryb), [IMP-208](06-mobile-fundamenty-i-design-system.md#imp-208--toast-banner-dialog), [IMP-204](06-mobile-fundamenty-i-design-system.md#imp-204--statuspill-badge-avatar-progressbar)
- **Odwołania:** FR-511, FR-803, SCR-JDG-03, SCR-JDG-04, NFR-702, TL-23, [TC-UI-025](../03-test-plans/01-testy-jednostkowe.md#tc-ui-025), [TC-UI-030](../03-test-plans/01-testy-jednostkowe.md#tc-ui-030), [TC-E2E-JDG-028](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-028), [TC-E2E-JDG-030](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-030)
- **Kroki:**
  1. Napisz `app/(judge)/(session)/_layout.tsx` (grupa bez stosu: `categories` ↔ `category/[categoryId]`) ze strażnikiem aktywnej sesji sędziego (brak → SCR-JDG-01).
  2. Napisz `features/judge/JudgeHeader.tsx` (60 dp, padding 20, dolna linia wygaszana na końcach): kwadrat 30 dp z `gavel` (obrys accent), „Panel sędziego” 11,5 dp + nazwa turnieju 14 dp z wielokropkiem (z `local_tournament`), slot `SyncPill`, chip sędziego (`Avatar` 28 dp + imię i nazwisko), `iconRound` 36 dp `sign-out`.
  3. Napisz `features/judge/TwoPaneLayout.tsx`: panel boczny 300 dp (surface 45% nad bg, prawa krawędź divider) + panel prawy `flex: 1`.
  4. Włącz `useKeepAwake()` (`expo-keep-awake`) tylko na ekranach SCR-JDG-04/05 i wyłączaj przy wyjściu.
  5. Owiń grupę w `OrientationGuard` (IMP-213) bez odmontowania formularza i z dalszym działaniem `SyncEngine` w tle.
  6. Dodaj przypadki nagłówka (5 stanów pigułki, długa nazwa turnieju) w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-UI-025, TC-UI-030, TC-E2E-JDG-028, TC-E2E-JDG-030 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-300: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-UI-025, TC-UI-030, TC-E2E-JDG-028, TC-E2E-JDG-030 przechodzą
  - [ ] Zgodność z tokenami Nocturne i checklistą 09-design-system §7; zrzut dołączony do PR
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-301 – SCR-JDG-06 – parowanie tabletu
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Tablet paruje się z turniejem przez zeskanowanie QR albo wpisanie kodu, zapisuje bezpiecznie swoje poświadczenia i pobiera dane turnieju do pracy offline.
- **Zakres:** Skan QR (`expo-camera` 58, CameraView z barcode scanning), pole kodu z maską „XXXX-XXXX” i normalizacją, nazwa tabletu, „Połącz”; stany: łączenie, błąd kodu, brak zgody na kamerę (link do ustawień), brak sieci; zapis `deviceId`, sekretu i `pinPepper` w SecureStore; pobranie migawki (IMP-351) z komunikatami splash; **Poza zakresem:** –
- **Zależności:** [IMP-300](#imp-300--powłoka-trybu-sędziego-i-judgeheader), [IMP-356](09-mobile-offline-i-synchronizacja.md#imp-356--uwierzytelnianie-urządzenia-na-tablecie), [IMP-351](09-mobile-offline-i-synchronizacja.md#imp-351--pobieranie-i-zapis-migawki), [IMP-141](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-141--urządzenia-parowanie-token-lista-nazwa-unieważnienie)
- **Odwołania:** FR-504, US-043, SCR-JDG-06, [TC-E2E-JDG-001](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-001), [TC-E2E-JDG-002](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-002), [TC-EDGE-069](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-069)
- **Kroki:**
  1. Napisz `app/(judge)/pair.tsx` i `features/pairing/PairScreen.tsx` (SCR-JDG-06): kwadrat 48 dp z `qr-code`, tytuł „Sparuj tablet z turniejem”, tekst „Poproś organizatora o kod parowania (Sędziowie i urządzenia → Sparuj tablet).”, dwie kolumny.
  2. W lewej kolumnie osadź `CameraView` (`expo-camera`, `barcodeScannerSettings: { barcodeTypes: ['qr'] }`) 320×320 dp z narożnikami ramki accent i podpisem „Zeskanuj kod QR”; parsuj `polechamp://pair?c=…&t=…`.
  3. W prawej kolumnie dodaj `TextField` „Kod parowania” (maska „XXXX-XXXX”, wielkie litery, 20 dp tabelaryczne, normalizacja schematem `PairingCode`), „Nazwa tabletu (opcjonalnie)” (placeholder „np. Tablet stół 1”) i primary 48 dp „Połącz”.
  4. Napisz `usePairDevice()`: `POST /v1/devices/pair` (z `expo-device` `modelName`, `osVersion`, wersją aplikacji) → zapis `deviceId`, `deviceSecret`, `pinPepper` w SecureStore (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` – wysyłka w tle przy zablokowanym ekranie) → `POST /v1/devices/token` → migawka (IMP-351).
  5. Obsłuż stany: „Łączenie z turniejem…” → „Pobieranie list startowych…” → SCR-JDG-01; `PAIRING_CODE_INVALID` → „Kod jest nieprawidłowy lub wygasł.” (accent-300); `LIMIT_EXCEEDED` → „Osiągnięto limit (20).”; brak sieci → „Parowanie wymaga połączenia z internetem.”.
  6. Obsłuż brak zgody na kamerę: tekst „Brak dostępu do kamery. Wpisz kod ręcznie.” i ghost „Otwórz ustawienia” (`Linking.openSettings`); deep link z wypełnionym kodem pomija skan.
  7. Dodaj przypadki „domyślny / błąd kodu / brak kamery / łączenie” w DevCatalog.
  8. Dopisz lub uruchom przypadki TC-E2E-JDG-001, TC-E2E-JDG-002, TC-EDGE-069 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  9. Otwórz PR `IMP-301: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-JDG-001, TC-E2E-JDG-002, TC-EDGE-069 przechodzą
  - [ ] Ekran zgodny z SCR-JDG-06 (teksty wiążące z kluczy i18n, stany dodatkowe ⟡); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-302 – SCR-JDG-00 – splash sędziego z rzeczywistym rozruchem
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Start trybu sędziego w kilka sekund odświeża dane turnieju i przechodzi do wyboru profilu, a bez sieci uruchamia się na danych lokalnych; tablet niesparowany lub odłączony trafia na właściwy ekran.
- **Zakres:** Etapy: token urządzenia → `sync/changes` lub migawka → gotowe; offline: przejście po maks. 4,3 s z danymi lokalnymi; routing: niesparowany → SCR-JDG-06, unieważniony → SCR-JDG-10, turniej zakończony → SCR-JDG-01 (stan zakończenia); **Poza zakresem:** –
- **Zależności:** [IMP-211](06-mobile-fundamenty-i-design-system.md#imp-211--splash-z-animacją-tancerki-polespinner), [IMP-352](09-mobile-offline-i-synchronizacja.md#imp-352--pobieranie-zmian-pull), [IMP-356](09-mobile-offline-i-synchronizacja.md#imp-356--uwierzytelnianie-urządzenia-na-tablecie)
- **Odwołania:** FR-506, US-050, SCR-JDG-00, [TC-E2E-JDG-003](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-003)
- **Kroki:**
  1. Napisz `app/(judge)/splash.tsx` używający `SplashScreen` (470×410) z etapami „Łączenie z turniejem…” → „Pobieranie list startowych…” → „Gotowe”.
  2. Napisz `features/judge/bootstrap.ts`: brak `deviceId` w SecureStore → SCR-JDG-06; `POST /v1/devices/token` → `SyncEngine.pull()` (lub migawka przy `CURSOR_EXPIRED`) → `push()` zaległego outboxu.
  3. Przy `401 DEVICE_REVOKED` przejdź do SCR-JDG-10; przy turnieju `FINISHED` w `local_tournament` – do SCR-JDG-01 w stanie zakończenia.
  4. Offline lub timeout: przejście po maks. 4,3 s do SCR-JDG-01 z danymi z SQLite (pigułka „Offline” po zalogowaniu).
  5. Odtwórz po starcie wpisy outboxu `IN_FLIGHT` → `QUEUED` przed pierwszym push (TL-20).
  6. Dopisz lub uruchom przypadki TC-E2E-JDG-003 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Dodaj stany do DevCatalog lub zrzuty ekranu (telefon/tablet, iOS/Android) do PR; sprawdź etykiety a11y i skalowanie tekstu.
  8. Otwórz PR `IMP-302: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-JDG-003 przechodzi
  - [ ] Ekran zgodny z SCR-JDG-00 (teksty wiążące z kluczy i18n, stany dodatkowe ⟡); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-303 – SCR-JDG-01 – wybór profilu (z ponownym użyciem tabletu)
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Sędzia wybiera swój profil z siatki kart, widzi, czy jego PIN jest zablokowany, a po zakończonym turnieju tablet można bezpiecznie przygotować do kolejnych zawodów.
- **Zakres:** Siatka 3 kolumn aktywnych sędziów wg `position` (przewijanie > 6), stan „PIN zablokowany”, stan pusty, stan „Turniej zakończony” z „Sparuj z nowym turniejem” (blokada przy niepustej kolejce, wyczyszczenie danych → SCR-JDG-06); **Poza zakresem:** –
- **Zależności:** [IMP-300](#imp-300--powłoka-trybu-sędziego-i-judgeheader), [IMP-350](09-mobile-offline-i-synchronizacja.md#imp-350--lokalna-baza-sqlite-schemat-migracje-pragma)
- **Odwołania:** FR-507, US-050, SCR-JDG-01, TL-47, [TC-E2E-JDG-004](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-004), [TC-E2E-JDG-027](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-027), [TC-EDGE-026](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-026), [TC-EDGE-056](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-056)
- **Kroki:**
  1. Napisz `app/(judge)/profiles.tsx` i `features/judge/ProfilePicker.tsx` (SCR-JDG-01): kwadrat 48 dp z `gavel`, „Panel sędziego” 28 dp, nazwa turnieju, kicker „WYBIERZ SWÓJ PROFIL”, poświata 700×420.
  2. Czytaj aktywnych sędziów z `local_judge` (`is_active = 1 ORDER BY position`) hookiem `useLiveQuery` (Drizzle) i renderuj siatkę 3 kolumn kart (`Avatar` 64 dp, imię i nazwisko 15 dp/500, „Sędzia”); przewijanie przy > 6.
  3. Pokaż stan „PIN zablokowany” (`Avatar` z `lock-simple`, podpis accent-300) dla `pin_locked = 1` i stan pusty „Organizator nie dodał jeszcze sędziów.”.
  4. Dla turnieju zakończonego pokaż „Turniej „{nazwa}” został zakończony.” i primary „Sparuj z nowym turniejem” → potwierdzenie „Dane tego turnieju zostaną usunięte z tabletu.” → `TabletDataLifecycle.wipeTournament()` (IMP-319) → SCR-JDG-06.
  5. Przy niepustej kolejce ustaw ten przycisk jako nieaktywny z podpisem „Najpierw wyślij {n} {ocenę|oceny|ocen} – połącz tablet z internetem.” (`plural`).
  6. Tap karty → `router.push('/(judge)/pin/[judgeId]')`; dodaj przypadki w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-E2E-JDG-004, TC-E2E-JDG-027, TC-EDGE-026, TC-EDGE-056 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-303: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-JDG-004, TC-E2E-JDG-027, TC-EDGE-026, TC-EDGE-056 przechodzą
  - [ ] Ekran zgodny z SCR-JDG-01 (teksty wiążące z kluczy i18n, stany dodatkowe ⟡); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** niskie

### IMP-304 – SCR-JDG-02 – klawiatura PIN i kropki
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Sędzia wpisuje 4-cyfrowy PIN na dużej klawiaturze, a po czwartej cyfrze PIN jest sprawdzany automatycznie; błąd jest czytelny i nie zdradza cyfr.
- **Zakres:** Komponenty `PinPad`/`PinDots` (76 dp, brak podglądu cyfr, `filterTouchesWhenObscured`), automatyczne sprawdzenie 160 ms po 4. cyfrze, błąd z animacją potrząśnięcia, czyszczenie komunikatu przy wpisywaniu, „‹ Zmień sędziego”, podpowiedź demo tylko przy `demoBuild`, wariant ponownego uwierzytelnienia (z „Wyloguj”); **Poza zakresem:** Logika logowania (IMP-305)
- **Zależności:** [IMP-300](#imp-300--powłoka-trybu-sędziego-i-judgeheader), [IMP-203](06-mobile-fundamenty-i-design-system.md#imp-203--komponent-button-primary-secondary-ghost-iconround)
- **Odwołania:** FR-508, US-051, SCR-JDG-02, G-17, [TC-UI-018](../03-test-plans/01-testy-jednostkowe.md#tc-ui-018), [TC-E2E-JDG-005](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-005), [TC-EDGE-029](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-029), [TC-A11Y-014](../03-test-plans/05-testy-niefunkcjonalne.md#tc-a11y-014)
- **Kroki:**
  1. Napisz `src/ui/pin/PinDots.tsx` (4 × 14 dp, odstęp 16, wypełniona accent / pusta obrys 1,5 dp neutral-600, animacja potrząśnięcia 300 ms przez `withSequence`) i `PinPad.tsx` (siatka 3×4, klawisze 76 dp surface + krawędź, cyfra 26 dp/500, pusty klawisz niewidoczny, backspace `backspace` bez tła).
  2. Ustaw bezpieczeństwo klawiatury: brak podglądu cyfr, brak schowka, `filterTouchesWhenObscured` (Android), wpisane cyfry tylko w `useRef` (bez stanu globalnego i logów).
  3. Napisz `features/judge/PinScreen.tsx` (SCR-JDG-02): wiersz `Avatar` 44 dp + imię i nazwisko + „Wpisz 4-cyfrowy PIN”, linia komunikatu 18 dp, ghost „‹ Zmień sędziego” → SCR-JDG-01.
  4. Po 4. cyfrze odczekaj 160 ms i wywołaj `JudgeAuth.login(judgeId, pin)` (IMP-305); błąd → „Nieprawidłowy PIN — spróbuj ponownie” z `warning-circle`, wyczyszczenie kropek i potrząśnięcie; kolejna cyfra lub backspace czyści komunikat.
  5. Dodaj haptykę wciśnięcia (`expo-haptics` `selectionAsync`), podpowiedź „Demo · PIN-y: …” tylko przy `env.demoBuild` (G-17) i wariant ponownego uwierzytelnienia (bez „Zmień sędziego”, z ghost „Wyloguj”).
  6. Dodaj etykiety a11y klawiszy („Cyfra 1”, „Usuń cyfrę”) i ogłaszanie liczby wpisanych cyfr bez ich wartości; przypadki w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-UI-018, TC-E2E-JDG-005, TC-EDGE-029, TC-A11Y-014 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-304: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-UI-018, TC-E2E-JDG-005, TC-EDGE-029, TC-A11Y-014 przechodzą
  - [ ] Ekran zgodny z SCR-JDG-02 (teksty wiążące z kluczy i18n, stany dodatkowe ⟡); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-305 – Logowanie sędziego online/offline i limity prób (SCR-JDG-08)
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Sędzia loguje się PIN-em zarówno z siecią (weryfikacja na serwerze), jak i bez sieci (weryfikacja lokalna w ciągu 24 h od synchronizacji), a zgadywanie PIN-u jest ograniczone czasowymi blokadami.
- **Zakres:** Online: `POST /judge-sessions` (pulsujące kropki > 500 ms, `PIN_INVALID`, `PIN_LOCKED`); offline: odszyfrowanie `wrapped` (HKDF + AES-GCM, `react-native-quick-crypto`), PBKDF2 600k natywnie, porównanie stałoczasowe, warunki (TC-STATE-005, okno 24 h – zegar monotoniczny, TL-21), sesja `OFFLINE_PIN` + mutacja `JUDGE_SESSION_STARTED`; lokalne limity z eskalacją (30 s…15 min, w SQLite), raport `PIN_ATTEMPTS_REPORT`; stany SCR-JDG-08; **Poza zakresem:** –
- **Zależności:** [IMP-304](#imp-304--scr-jdg-02--klawiatura-pin-i-kropki), [IMP-353](09-mobile-offline-i-synchronizacja.md#imp-353--outbox--rdzeń), [IMP-143](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-143--sesje-sędziów-online-i-limity-prób-pin), [IMP-601](14-spike.md#imp-601--spike-pbkdf2-600k-na-tabletach-i-argon2id-na-fargate-limit-6-h)
- **Odwołania:** FR-508, FR-509, FR-510, US-051, US-052, US-053, ADR-005, TL-04, TL-21, [TC-STATE-004](../03-test-plans/01-testy-jednostkowe.md#tc-state-004), [TC-STATE-005](../03-test-plans/01-testy-jednostkowe.md#tc-state-005), [TC-E2E-JDG-006](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-006)…008, [TC-PERF-010](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-010)
- **Kroki:**
  1. Napisz `features/judge/auth/JudgeAuth.ts` z `login(judgeId, pin)`: online → `POST /v1/judge-sessions` (kropki pulsują po 500 ms, klawiatura nieaktywna), zapis `judgeToken` w pamięci i `local_judge_session` (`ONLINE_PIN`, `server_token_present`), potem `GET /v1/judge/me/score-sheets`.
  2. Mapuj odpowiedzi online: `PIN_INVALID` (`remainingAttempts`), `PIN_LOCKED` z `retryAfterSeconds` („Zbyt wiele prób. Spróbuj za {s} s.” z odliczaniem) lub `requiresReset` („PIN zablokowany. Poproś organizatora o reset.”, klawiatura ukryta); błąd sieci → ścieżka offline.
  3. Napisz `src/crypto/pinVerifier.ts`: `K_dev = HKDF-SHA256(pinPepper z SecureStore, "pc-pin-v1")`, odszyfrowanie `wrapped_verifier` AES-256-GCM z `aad = judgeId ‖ pinVersion`, `PBKDF2-HMAC-SHA256(pin, pin_offline_salt, 600 000)` przez `react-native-quick-crypto`, porównanie `timingSafeEqual`; testy na wektorach z `packages/test-fixtures/vectors/pin-wrap.json`.
  4. Sprawdzaj warunki offline: `allow_offline_pin_login`, ostatnia pełna synchronizacja < 24 h liczona z `last_sync_monotonic_ms` (zegar monotoniczny, po restarcie zegar ścienny i cofnięcie zegara = przekroczenie – TL-21), brak `pin_locked`, zgodny `pin_version`; inaczej „Połącz tablet z internetem, aby się zalogować.”.
  5. Po udanym logowaniu offline utwórz `local_judge_session` (`OFFLINE_PIN`, UUIDv7) i dodaj do outboxu `JUDGE_SESSION_STARTED` z `pinVersion`.
  6. Prowadź lokalny licznik w `local_judge` (`failed_attempts`, `lock_level`, `locked_until`): 5 błędów → 30 s, każda kolejna seria podwaja czas do 15 min; po każdej serii dodaj do outboxu `PIN_ATTEMPTS_REPORT`.
  7. Zmierz czas weryfikacji offline na tabletach referencyjnych (cel z spike IMP-601) i pokaż pulsujące kropki podczas liczenia PBKDF2.
  8. Dopisz lub uruchom przypadki TC-STATE-004, TC-STATE-005, TC-E2E-JDG-006…008, TC-PERF-010 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  9. Dodaj stany do DevCatalog lub zrzuty ekranu (telefon/tablet, iOS/Android) do PR; sprawdź etykiety a11y i skalowanie tekstu.
  10. Otwórz PR `IMP-305: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-STATE-004, TC-STATE-005, TC-E2E-JDG-006…008, TC-PERF-010 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** wysokie

### IMP-306 – Zarządzanie sesją sędziego i wylogowanie (SCR-JDG-09)
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Sesja sędziego wygasa po przerwie i wymaga ponownego PIN-u bez utraty szkicu, wylogowanie ostrzega o niewysłanych ocenach, a zdalne zamknięcie sesji (inne urządzenie, reset PIN-u, dezaktywacja) kończy ją z komunikatem.
- **Zakres:** Ponowny PIN po 15 min w tle / 2 h bezczynności (AppState + zegar), obsługa `session.revoked` (REPLACED → „Zalogowano Cię na innym urządzeniu.”, PIN_RESET, JUDGE_DEACTIVATED, TOURNAMENT_FINISHED), wylogowanie (dialog SCR-JDG-09 przy niepustej kolejce, `JUDGE_SESSION_ENDED`/`DELETE /judge-sessions/current`), zachowanie szkicu; **Poza zakresem:** –
- **Zależności:** [IMP-305](#imp-305--logowanie-sędziego-onlineoffline-i-limity-prób-scr-jdg-08), [IMP-208](06-mobile-fundamenty-i-design-system.md#imp-208--toast-banner-dialog), [IMP-216](06-mobile-fundamenty-i-design-system.md#imp-216--klient-realtime-z-fallbackiem-na-odpytywanie)
- **Odwołania:** FR-511, FR-512, FR-808, US-054, US-085, SCR-JDG-09, TL-14, [TC-STATE-006](../03-test-plans/01-testy-jednostkowe.md#tc-state-006), [TC-UI-015](../03-test-plans/01-testy-jednostkowe.md#tc-ui-015), [TC-E2E-JDG-019](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-019)…021, [TC-EDGE-046](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-046), [TC-EDGE-047](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-047), [TC-EDGE-060](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-060)
- **Kroki:**
  1. Napisz `features/judge/session/useJudgeSession.ts` (Zustand) z `last_activity_at` aktualizowanym przy interakcji i `AppState`: po 15 min w tle lub 2 h bezczynności → SCR-JDG-02 w wariancie ponownego uwierzytelnienia dla tego sędziego.
  2. Obsłuż `session.revoked` dla zalogowanego sędziego: `REPLACED` → SCR-JDG-01 z toastem „Zalogowano Cię na innym urządzeniu.”, `PIN_RESET` → „PIN został zmieniony. Zaloguj się ponownie.”, `JUDGE_DEACTIVATED` → „Twój profil został wyłączony przez organizatora.”, `TOURNAMENT_FINISHED` → SCR-JDG-01 w stanie zakończenia, `DEVICE_REVOKED` → SCR-JDG-10.
  3. Napisz `features/judge/LogoutDialog.tsx` (`Dialog`, SCR-JDG-09): „Wylogować się?”, „Masz {n} {niewysłaną ocenę|niewysłane oceny|niewysłanych ocen}. Zostaną wysłane automatycznie, gdy tablet połączy się z siecią.”, secondary „Anuluj”, primary „Wyloguj”; przy pustej kolejce wylogowanie natychmiastowe.
  4. Przy wylogowaniu zamknij `local_judge_session` (`ended_at`), dodaj `JUDGE_SESSION_ENDED` do outboxu (sesja offline) lub wywołaj `DELETE /v1/judge-sessions/current` (online) i wyczyść `judgeToken`; outbox wysyła się dalej tokenem urządzenia.
  5. Zachowuj `local_draft` przy wygaśnięciu i wylogowaniu oraz zgłaszaj `activeJudgeId` w heartbeat.
  6. Napisz testy z `jest.useFakeTimers` (15 min w tle, 2 h bezczynności) i przypadki dialogu w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-STATE-006, TC-UI-015, TC-E2E-JDG-019…021, TC-EDGE-046, TC-EDGE-047, TC-EDGE-060 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-306: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-STATE-006, TC-UI-015, TC-E2E-JDG-019…021, TC-EDGE-046, TC-EDGE-047, TC-EDGE-060 przechodzą
  - [ ] Ekran zgodny z SCR-JDG-09 (teksty wiążące z kluczy i18n, stany dodatkowe ⟡); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-307 – SCR-JDG-03 – lista kategorii sędziego
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Sędzia widzi kategorie swojego panelu ze statusem i własnym postępem, wchodzi do trwających i zakończonych, a kategoria w przygotowaniu informuje, że jeszcze się nie rozpoczęła.
- **Zakres:** „Dzień dobry, {imię}”, siatka 3 kolumn, karty (pigułka, kłódka, nazwa, styl · poziom, własny postęp, „jeszcze nie rozpoczęto”), przygaszenie DRAFT + toast, widoczność wg panelu (TC-STATE-009), stan pusty, aktualizacja po pull bez przeładowania; **Poza zakresem:** –
- **Zależności:** [IMP-300](#imp-300--powłoka-trybu-sędziego-i-judgeheader), [IMP-350](09-mobile-offline-i-synchronizacja.md#imp-350--lokalna-baza-sqlite-schemat-migracje-pragma), [IMP-055](02-pakiety-wspoldzielone.md#imp-055--scoring-formatowanie-wyników-i-postęp)
- **Odwołania:** FR-601, US-055, SCR-JDG-03, [TC-STATE-009](../03-test-plans/01-testy-jednostkowe.md#tc-state-009), [TC-E2E-JDG-009](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-009), [TC-EDGE-057](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-057), [TC-EDGE-058](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-058)
- **Kroki:**
  1. Napisz `app/(judge)/(session)/categories.tsx` i `features/judge/CategoryGrid.tsx` (SCR-JDG-03): „Dzień dobry, {imię}” (28 dp/500), „Wybierz kategorię, aby rozpocząć ocenianie.”, siatka 3 kolumn (odstęp 14).
  2. Napisz zapytanie `useJudgeCategories(judgeId)` (Drizzle `useLiveQuery` na `local_category` + liczba `local_score_sheet` sędziego + aktywne `local_entry`) z widocznością: `DRAFT` dla każdego aktywnego sędziego, `IN_PROGRESS`/`LOCKED` tylko z `panel_judge_ids` zawierającym sędziego.
  3. Renderuj `CategoryCard` (wariant sędziego): pigułka + `lock-simple` dla zablokowanych, nazwa 18 dp/500, „{styl} · {poziom}”, `ProgressBar` 4 dp + „{x}/{y} ocenione” (`judgeProgress`) albo „jeszcze nie rozpoczęto”; `DRAFT` z opacity 0,55.
  4. Tap: `IN_PROGRESS`/`LOCKED` → SCR-JDG-04; `DRAFT` → toast „Ta kategoria jeszcze się nie rozpoczęła” bez nawigacji.
  5. Dodaj stan pusty „Organizator nie dodał jeszcze kategorii do tego turnieju.” i aktualizację po `pull` bez przeładowania (reaktywne zapytanie).
  6. Dodaj przypadki „mieszane statusy / pusty / 12 kategorii” w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-STATE-009, TC-E2E-JDG-009, TC-EDGE-057, TC-EDGE-058 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-307: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-STATE-009, TC-E2E-JDG-009, TC-EDGE-057, TC-EDGE-058 przechodzą
  - [ ] Ekran zgodny z SCR-JDG-03 (teksty wiążące z kluczy i18n, stany dodatkowe ⟡); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-308 – SCR-JDG-04 – kolejka zawodniczek
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Sędzia widzi kolejkę zawodniczek kategorii ze stanem swojej oceny przy każdej (nieoceniona, wysłana, w kolejce, odrzucona) i jednym tapnięciem otwiera formularz.
- **Zakres:** Panel boczny 300 dp (‹ Kategorie, nazwa, postęp, baner blokady, baner odrzuceń), wiersze z odznaką, nazwiskiem (wielokropek, pełna etykieta a11y), klubem, ikoną 4 stanów (`circle`, `check-circle`, `clock`, `warning-circle`), aktywny wiersz, wycofane ukryte; prawy panel pusty; `FlashList`; **Poza zakresem:** –
- **Zależności:** [IMP-300](#imp-300--powłoka-trybu-sędziego-i-judgeheader), [IMP-350](09-mobile-offline-i-synchronizacja.md#imp-350--lokalna-baza-sqlite-schemat-migracje-pragma), [IMP-358](09-mobile-offline-i-synchronizacja.md#imp-358--magazyn-stanu-synchronizacji-zustand)
- **Odwołania:** FR-602, FR-609, FR-805, US-056, SCR-JDG-04, UI-15, [TC-E2E-JDG-010](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-010), [TC-E2E-JDG-025](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-025), [TC-EDGE-025](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-025)
- **Kroki:**
  1. Napisz `app/(judge)/(session)/category/[categoryId].tsx` i `features/judge/QueuePanel.tsx` (panel boczny): `BackLink` „‹ Kategorie”, nazwa kategorii 18 dp, `ProgressBar` + „{x}/{y} ocenione”, `Banner locked` „Kategoria zablokowana — tylko podgląd” dla `LOCKED`.
  2. Dodaj `Banner rejected` „{n} {ocena|oceny|ocen} nie {została|zostały|zostało} {przyjęta|przyjęte|przyjętych} – kategoria zablokowana” (z `plural`) → popover SCR-JDG-07, gdy istnieją arkusze `REJECTED` w kategorii.
  3. Napisz zapytanie `useQueue(categoryId, judgeId)`: aktywne `local_entry` (`ORDER BY start_order`, wycofane pominięte) z `LEFT JOIN local_score_sheet` sędziego.
  4. Renderuj wiersze w `FlashList` (min. 60 dp, radius 12): `Badge number` 38 dp (oceniona accent-900/accent-200, nieoceniona neutral-900/neutral-200), nazwisko 14,5 dp z wielokropkiem, klub, ikona stanu `circle` / `check-circle` fill (`SYNCED`) / `clock` (`PENDING`) / `warning-circle` (`REJECTED`); aktywny wiersz accent 14% z obrysem accent-700.
  5. Ustaw etykietę a11y wiersza „{nr}, {imię i nazwisko}, {klub}, {stan oceny}” i panel prawy pusty (koło 56 dp z `hand-pointing`, „Wybierz zawodniczkę z listy, aby ją ocenić.”).
  6. Tap wiersza → ustaw `selectedEntryId` (parametr trasy) i pokaż SCR-JDG-05 w panelu prawym; dodaj przypadki w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-E2E-JDG-010, TC-E2E-JDG-025, TC-EDGE-025 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-308: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-JDG-010, TC-E2E-JDG-025 (kolejka), TC-EDGE-025 (sędzia) przechodzą
  - [ ] Ekran zgodny z SCR-JDG-04 (teksty wiążące z kluczy i18n, stany dodatkowe ⟡); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-309 – SCR-JDG-05 – układ formularza oceny
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Formularz oceny pokazuje zawodniczkę i wszystkie kryteria oraz kary kategorii w czytelnej siatce, a przy zmianie zawodniczki zaczyna się od góry.
- **Zakres:** Nagłówek zawodniczki (odznaka 56 dp, nazwisko 1 linia z wielokropkiem, klub, „Oceniono”), sekcja „KRYTERIA” (siatka auto-fill min. 320 dp), `CriterionCard`, sekcja „KARY”, przewinięcie na górę przy zmianie zawodniczki; **Poza zakresem:** Kontrolki (IMP-310, IMP-311)
- **Zależności:** [IMP-308](#imp-308--scr-jdg-04--kolejka-zawodniczek)
- **Odwołania:** FR-603, US-057, SCR-JDG-05, UI-05, UI-15, [TC-UI-029](../03-test-plans/01-testy-jednostkowe.md#tc-ui-029)
- **Kroki:**
  1. Napisz `features/scoring/ScoreForm.tsx` (panel prawy SCR-JDG-05): obszar przewijany (padding 22/26/24) + slot stałej stopki.
  2. Zbuduj nagłówek zawodniczki: `Badge number` 56 dp (radius 16, numer 20 dp/500), nazwisko 24 dp/500 w jednej linii z wielokropkiem (`minWidth: 0`, UI-05/UI-15), klub 13 dp, pigułka „Oceniono” (`Badge scored`) gdy istnieje arkusz sędziego.
  3. Napisz `useScoreFormModel(entryId, judgeId)` czytający `local_criterion`, `local_penalty_type` (po `position`), istniejący `local_score_sheet` i `local_draft`, z wartościami początkowymi: ocena → zapisane, szkic → szkic, nowa → `defaultSheet()` (`@polechamp/scoring`).
  4. Zbuduj sekcję „KRYTERIA” (kicker) z siatką auto-fill kolumn min. 320 dp (`flexWrap` + szerokość z `onLayout`; przy ≈ 800 dp dwie kolumny) i kartami `CriterionCard` (nazwa, `Badge weight` 11 dp, opis maks. 2 linie, wartość 30 dp accent-200 + „ /{skala}” bez zawijania).
  5. Zbuduj sekcję „KARY” z siatką kart `PenaltyCounter` (IMP-311) i przewiń `ScrollView` na górę przy zmianie `entryId`.
  6. Trzymaj stan formularza w `useScoreFormStore` (Zustand per formularz) z selektorami per kryterium, aby zmiana jednej karty nie renderowała pozostałych; dodaj przypadki „5 kryteriów / Exotic 6 / długie nazwisko” w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-UI-029 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-309: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-UI-029 przechodzi
  - [ ] Ekran zgodny z SCR-JDG-05 (teksty wiążące z kluczy i18n, stany dodatkowe ⟡); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-310 – ScoreSlider i przyciski −/+ kryterium
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Sędzia ustawia notę suwakiem lub przyciskami −/+ z krokiem 0,5, a wartość i „Twój wynik” zmieniają się płynnie w czasie rzeczywistym także na słabszym tablecie.
- **Zakres:** Suwak na Reanimated 4 (worklety) + Gesture Handler 3: tor 8 dp, kciuk 28 dp, krok 0,5 z przyciąganiem, aktualizacja wartości na wątku UI i przekazanie do stanu formularza bez re-renderu całej sekcji, haptyka przy całych punktach, rola `adjustable` z akcjami ±0,5; przyciski 44 dp z przytrzymaniem (150 ms), przycięcie do [0; skala]; **Poza zakresem:** –
- **Zależności:** [IMP-309](#imp-309--scr-jdg-05--układ-formularza-oceny)
- **Odwołania:** FR-603, US-057, NFR-104, NFR-206, R-01, [TC-UI-019](../03-test-plans/01-testy-jednostkowe.md#tc-ui-019), [TC-UI-020](../03-test-plans/01-testy-jednostkowe.md#tc-ui-020), [TC-EDGE-043](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-043), [TC-PERF-004](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-004)
- **Kroki:**
  1. Napisz `src/ui/scoring/ScoreSlider.tsx` na Reanimated 4 (`useSharedValue`, worklety) i `Gesture.Pan`/`Gesture.Tap` z Gesture Handler 3: tor 8 dp radius 4 (wypełnienie accent do v/skala, reszta neutral-800), kciuk 28 dp (accent-100, obrys 7 dp accent, cień).
  2. Przyciągaj wartość do 0,5 w workletcie (`Math.round(x / 0.5) * 0.5`), przycinaj do [0; skala] i aktualizuj tekst wartości przez `useAnimatedProps`/`ReText` bez re-renderu React.
  3. Przekazuj wartość do `useScoreFormStore` przez `scheduleOnRN` tylko przy zmianie kroku (nie co klatkę) i przeliczaj „Twój wynik” `sheetTotal` w ≤ 50 ms (NFR-104).
  4. Dodaj haptykę (`expo-haptics` `impactAsync(Light)`) przy przejściu przez pełny punkt.
  5. Napisz `CriterionStepper` (przyciski `iconRound` 44 dp `minus`/`plus` z ±0,5, przytrzymanie z powtarzaniem co 150 ms przez `Gesture.LongPress` + `setInterval`, nieaktywne na krańcach).
  6. Ustaw a11y suwaka: `accessibilityRole="adjustable"`, etykieta „{kryterium}, {v} z {skala}”, `accessibilityActions` increment/decrement o 0,5.
  7. Zmierz płynność (60 fps, brak spadków przy przeciąganiu) narzędziem Perf Monitor i Reassure na tablecie referencyjnym i dodaj przypadki w DevCatalog.
  8. Dopisz lub uruchom przypadki TC-UI-019, TC-UI-020, TC-EDGE-043, TC-PERF-004 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  9. Otwórz PR `IMP-310: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-UI-019, TC-UI-020, TC-EDGE-043, TC-PERF-004 (wstępnie) przechodzą
  - [ ] Zgodność z tokenami Nocturne i checklistą 09-design-system §7; zrzut dołączony do PR
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 12 h (L) | **Ryzyko:** wysokie

### IMP-311 – PenaltyCounter
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Sędzia dolicza i odejmuje kary dużymi przyciskami, nie może przekroczyć limitu ani zejść poniżej zera, a karta z naliczoną karą jest wyraźnie wyróżniona.
- **Zakres:** Karta kary (nazwa, „−{pkt} pkt za każde · maks. {n}×”), −/+ 40 dp z `hitSlop` 44, licznik `numL`, stany nieaktywne (0, maks. – opacity 0,35), wyróżnienie przy liczniku > 0, `adjustable`; **Poza zakresem:** –
- **Zależności:** [IMP-309](#imp-309--scr-jdg-05--układ-formularza-oceny)
- **Odwołania:** FR-604, US-058, UI-12, NFR-203, [TC-UI-021](../03-test-plans/01-testy-jednostkowe.md#tc-ui-021), [TC-DESIGN-012](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-012)
- **Kroki:**
  1. Napisz `src/ui/scoring/PenaltyCounter.tsx`: nazwa 15 dp/500, „−{pkt} pkt za każde · maks. {n}×” (`formatPenaltyPoints`), `iconRound` 40 dp „−” i „+” z `hitSlop` do 44 dp (G-27), licznik 22 dp/500 tabelaryczny (szer. 26).
  2. Ustaw stany: licznik > 0 → tło `accent10OnSurface` i obrys accent-700, inaczej surface + shadow-sm; „+” przy maksimum opacity 0,35 i nieaktywny; „−” przy 0 nieaktywny.
  3. Aktualizuj licznik w `useScoreFormStore` (±1, przycięcie do [0; `max_occurrences`]) i chip „kary −{suma}” w stopce.
  4. Ustaw a11y `adjustable` z etykietą „{kara}, {n} z {maks.}” i akcjami increment/decrement; dodaj przypadki „0 / 1 / maksimum” w DevCatalog.
  5. Dopisz lub uruchom przypadki TC-UI-021, TC-DESIGN-012 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-311: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-UI-021, TC-DESIGN-012 przechodzą
  - [ ] Zgodność z tokenami Nocturne i checklistą 09-design-system §7; zrzut dołączony do PR
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-312 – Komentarz i stopka z wynikiem na żywo
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Sędzia może dopisać krótki komentarz, a w stałej stopce zawsze widzi swój wynik na żywo, sumę kar i przycisk zatwierdzenia z właściwą etykietą.
- **Zakres:** TextArea (500 znaków, licznik od 400), stała stopka poza przewijaniem (Twój wynik z `@polechamp/scoring` ≤ 50 ms, „/ {max}”, chip kar), przycisk z etykietą wg TC-STATE-002, unikanie klawiatury; **Poza zakresem:** –
- **Zależności:** [IMP-310](#imp-310--scoreslider-i-przyciski--kryterium), [IMP-311](#imp-311--penaltycounter)
- **Odwołania:** FR-605, FR-606, FR-607, US-057, UI-13, [TC-UI-010](../03-test-plans/01-testy-jednostkowe.md#tc-ui-010), [TC-UI-022](../03-test-plans/01-testy-jednostkowe.md#tc-ui-022), [TC-STATE-002](../03-test-plans/01-testy-jednostkowe.md#tc-state-002), [TC-DESIGN-013](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-013)
- **Kroki:**
  1. Dodaj w `ScoreForm` pole `TextArea` „Komentarz (opcjonalnie)” (min. 76 dp, 14 dp, placeholder „Krótka notatka do występu…”, maks. 500 znaków, licznik „{n}/500” od 400) z unikaniem klawiatury (`KeyboardAwareScrollView` z `react-native-keyboard-controller`).
  2. Napisz `features/scoring/ScoreFooter.tsx` poza obszarem przewijania (padding 14/26, surface 45% nad bg, górna linia wygaszana): „Twój wynik” 11,5 dp + wartość 30 dp/500 (`formatScore(total, 1)`) + „/ {max}” (`maxJudgeScore`).
  3. Dodaj chip „kary −{suma}” (radius 999, neutral-900/neutral-200, `formatPenaltySum`) tylko gdy suma kar > 0.
  4. Wylicz etykietę przycisku primary 52 dp (`arrow-right`) w selektorze `submitLabel()`: „Zaktualizuj ocenę” (istnieje ocena), „Zatwierdź i dalej” (są inne nieocenione i auto-przejście), „Zatwierdź ocenę” (pozostałe).
  5. Ukryj stopkę w kategorii zablokowanej i dodaj przypadki „bez kar / z karami / aktualizacja” w DevCatalog.
  6. Dopisz lub uruchom przypadki TC-UI-010, TC-UI-022, TC-STATE-002, TC-DESIGN-013 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-312: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-UI-010, TC-UI-022, TC-STATE-002, TC-DESIGN-013 przechodzą
  - [ ] Zgodność z tokenami Nocturne i checklistą 09-design-system §7; zrzut dołączony do PR
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-313 – Zatwierdzenie oceny i auto-przejście
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Zatwierdzona ocena jest trwale zapisana na tablecie, zanim pojawi się toast, wysyła się w tle, a formularz od razu przechodzi do następnej nieocenionej zawodniczki.
- **Zakres:** Transakcja lokalna (arkusz + outbox, IMP-353), toast „Zapisano ocenę: …” dopiero po COMMIT (≤ 100 ms), blokada podwójnego tapnięcia, auto-przejście do następnej nieocenionej (TL-46) lub pusty panel, aktualizacja istniejącej oceny (rewizja), natychmiastowy push w tle; **Poza zakresem:** –
- **Zależności:** [IMP-312](#imp-312--komentarz-i-stopka-z-wynikiem-na-żywo), [IMP-353](09-mobile-offline-i-synchronizacja.md#imp-353--outbox--rdzeń)
- **Odwołania:** FR-607, FR-608, US-059, US-060, NFR-103, TL-46, [TC-STATE-001](../03-test-plans/01-testy-jednostkowe.md#tc-state-001), [TC-E2E-JDG-011](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-011)…015, [TC-EDGE-030](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-030), [TC-PERF-003](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-003)
- **Kroki:**
  1. Napisz `features/scoring/submitScore.ts`: w jednej transakcji `LocalDb.tx` upsert `local_score_sheet` (`id` UUIDv7 przy pierwszym zatwierdzeniu, `revision + 1`, `sync_state = PENDING`, `total_hundredths` z `sheetTotal`), zastąpienie `local_score_value` i `local_score_penalty`, `outbox.enqueue(SUBMIT_SCORE_SHEET` z `baseRevision = server_revision`, `clientTotal`, `judgeSessionId`, `authMode`) i usunięcie `local_draft`.
  2. Pokaż toast „Zapisano ocenę: {imię i nazwisko}” dopiero po COMMIT (cel ≤ 100 ms p95, pomiar `performance.now()` w trybie dev).
  3. Zablokuj podwójne tapnięcie (`isSubmitting` w store, przycisk `loading` do końca transakcji).
  4. Napisz selektor `nextUnscoredEntry(queue, currentId)` (TL-46: aktywny start bez lokalnego arkusza sędziego w dowolnym stanie, przeszukiwanie od początku listy, z pominięciem bieżącego); brak → panel pusty SCR-JDG-04, w przeciwnym razie przejście i przewinięcie na górę.
  5. Dla istniejącej oceny zastąp w outboxie niewysłaną mutację tego arkusza (zasada z IMP-353) albo dodaj nową z aktualnym `baseRevision`.
  6. Wywołaj `SyncEngine.push()` bez oczekiwania (fire-and-forget) i zaktualizuj ikonę wiersza na `clock`.
  7. Napisz testy: zabicie procesu po COMMIT (arkusz i outbox obecne), auto-przejście z pominięciem ocenionych, aktualizacja oceny.
  8. Dopisz lub uruchom przypadki TC-STATE-001, TC-E2E-JDG-011…015, TC-EDGE-030, TC-PERF-003 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  9. Otwórz PR `IMP-313: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-STATE-001, TC-E2E-JDG-011…015, TC-EDGE-030, TC-PERF-003 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-314 – Tryb tylko do odczytu (kategoria zablokowana)
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** W zablokowanej kategorii sędzia może tylko podejrzeć swoje oceny, a formularz przechodzi w ten tryb natychmiast po sygnale blokady, bez mylenia wartości domyślnych z wystawioną notą.
- **Zakres:** Sekcje przygaszone (0,55) i nieinteraktywne, brak stopki, baner w panelu bocznym, komunikat „Brak Twojej oceny dla tej zawodniczki.” dla startu bez oceny, natychmiastowe przejście po `category.locked`; **Poza zakresem:** –
- **Zależności:** [IMP-313](#imp-313--zatwierdzenie-oceny-i-auto-przejście)
- **Odwołania:** FR-609, US-061, UI-03, [TC-E2E-JDG-016](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-016), [TC-DESIGN-003](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-003), [TC-EDGE-067](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-067)
- **Kroki:**
  1. Dodaj w `ScoreForm` tryb `readOnly` (z `local_category.status === 'LOCKED'`): sekcje kryteriów, kar i komentarza z opacity 0,55, `pointerEvents="none"`, bez stopki.
  2. Dla zawodniczki bez oceny sędziego pokaż zamiast formularza `circle-dashed` + „Brak Twojej oceny dla tej zawodniczki.”.
  3. Przy zdarzeniu `category.locked` ustaw lokalny status `LOCKED` od razu (przed `pull`) i wstrzymaj wysyłkę mutacji tej kategorii do odpowiedzi serwera.
  4. Zachowaj `local_draft` przy przejściu w tryb tylko do odczytu i przywróć go po odblokowaniu; dodaj przypadki w DevCatalog.
  5. Dopisz lub uruchom przypadki TC-E2E-JDG-016, TC-DESIGN-003, TC-EDGE-067 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-314: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-JDG-016, TC-DESIGN-003, TC-EDGE-067 przechodzą
  - [ ] Ekran zgodny z SCR-JDG-05 (teksty wiążące z kluczy i18n, stany dodatkowe ⟡); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-315 – Autozapis szkicu formularza
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Rozpoczęta ocena nie ginie przy zmianie zawodniczki, wygaszeniu ekranu, ponownym PIN-ie ani restarcie aplikacji: formularz wraca z ostatnimi wartościami.
- **Zakres:** `local_draft` per (sędzia, start), debounce 300 ms, odtworzenie po powrocie/restarcie/ponownym PIN-ie, usunięcie po zatwierdzeniu, zachowanie przy zmianie listy i blokadzie; **Poza zakresem:** –
- **Zależności:** [IMP-313](#imp-313--zatwierdzenie-oceny-i-auto-przejście)
- **Odwołania:** FR-611, US-063, [TC-STATE-007](../03-test-plans/01-testy-jednostkowe.md#tc-state-007), [TC-E2E-JDG-018](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-018)
- **Kroki:**
  1. Napisz `features/scoring/draft.ts`: zapis `local_draft` (`judge_id`, `entry_id`, `payload` JSON z notami, karami i komentarzem, `updated_at`) z debounce 300 ms przy każdej zmianie w `useScoreFormStore`.
  2. Zapisz szkic natychmiast przy `AppState` → `background` i przy zmianie zawodniczki (flush debounce).
  3. Odtwarzaj szkic w `useScoreFormModel` przed wartościami istniejącej oceny; mapuj wartości po `criterion_id`/`penalty_type_id` (pomijaj nieistniejące po zmianie konfiguracji).
  4. Usuwaj szkic w transakcji zatwierdzenia (IMP-313) i zachowuj go przy zmianie listy startowej, blokadzie kategorii i wylogowaniu.
  5. Napisz testy: restart w trakcie edycji, zmiana zawodniczki i powrót.
  6. Dopisz lub uruchom przypadki TC-STATE-007, TC-E2E-JDG-018 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-315: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-STATE-007, TC-E2E-JDG-018 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** niskie

### IMP-316 – Stany dodatkowe formularza (odrzucona, lista zmieniona, STALE_REVISION)
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Sędzia wie, gdy jego ocena została odrzucona, gdy lista startowa zmieniła się w trakcie oceniania albo gdy ta sama ocena została zmieniona na innym tablecie, i może zobaczyć aktualną wersję.
- **Zakres:** Baner „Ta ocena nie została przyjęta: {powód}.”, baner „Lista startowa została zaktualizowana” + toast, baner „Ocena zmieniona na innym urządzeniu.” z „Pokaż aktualną” (pobranie wersji serwera); **Poza zakresem:** –
- **Zależności:** [IMP-313](#imp-313--zatwierdzenie-oceny-i-auto-przejście), [IMP-357](09-mobile-offline-i-synchronizacja.md#imp-357--obsługa-odrzuceń-na-tablecie)
- **Odwołania:** FR-805, FR-804, FR-608, US-082, [TC-SYNC-012](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-012), [TC-SYNC-028](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-028), [TC-E2E-JDG-023](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-023)
- **Kroki:**
  1. Dodaj w `ScoreForm` `Banner rejected` „Ta ocena nie została przyjęta: {powód}.” dla arkusza `sync_state = REJECTED` z tekstem z `rejection.reason.<reject_code>`.
  2. Subskrybuj zdarzenie `startListChanged` z `SyncEngine.pull` (zmiana `local_entry` kategorii): baner „Lista startowa została zaktualizowana” w formularzu + toast o tej treści, bez utraty szkicu; wycofana bieżąca zawodniczka → baner i powrót do kolejki po zatwierdzeniu.
  3. Dla `reject_code = STALE_REVISION` pokaż baner „Ocena zmieniona na innym urządzeniu.” z ghost „Pokaż aktualną”.
  4. „Pokaż aktualną”: `GET /v1/judge/me/score-sheets` → nadpisanie lokalnego arkusza wersją serwera (`server_revision`, `sync_state = SYNCED`) i odświeżenie formularza; offline → przycisk nieaktywny.
  5. Dodaj przypadki trzech banerów w DevCatalog.
  6. Dopisz lub uruchom przypadki TC-SYNC-012, TC-SYNC-028, TC-E2E-JDG-023 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-316: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SYNC-012 (UI), TC-SYNC-028, TC-E2E-JDG-023 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** niskie

### IMP-317 – SCR-JDG-07 – pigułka synchronizacji i popover
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Sędzia w każdej chwili widzi w nagłówku, czy oceny są wysłane, w kolejce lub wymagają uwagi, a po tapnięciu – szczegóły i przycisk ręcznej synchronizacji.
- **Zakres:** `SyncPill` (5 stanów, definicja online TL-45), popover (ostatnia synchronizacja względnie, kolejka, połączenie, odrzucone z powodem, „Synchronizuj teraz”, tekst uspokajający); **Poza zakresem:** –
- **Zależności:** [IMP-300](#imp-300--powłoka-trybu-sędziego-i-judgeheader), [IMP-358](09-mobile-offline-i-synchronizacja.md#imp-358--magazyn-stanu-synchronizacji-zustand)
- **Odwołania:** FR-803, FR-805, US-081, SCR-JDG-07, [TC-STATE-003](../03-test-plans/01-testy-jednostkowe.md#tc-state-003), [TC-UI-026](../03-test-plans/01-testy-jednostkowe.md#tc-ui-026), [TC-E2E-JDG-022](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-022)
- **Kroki:**
  1. Napisz `features/sync/SyncPill.tsx` (wariant `StatusPill` 11,5 dp, kropka 6 dp) z 5 stanami z 06-offline §8.1: „Zsynchronizowano” (`cloud-check`), „Wysyłanie… ({n})” (`arrows-clockwise` z obrotem), „Offline · {n} w kolejce” i „Offline” (`cloud-slash`), „Wymaga uwagi” (`warning-circle`).
  2. Wyznaczaj stan selektorem `selectSyncPillState` z `useSyncStore` (IMP-358): online wg TL-45, liczba `QUEUED`/`IN_FLIGHT`, odrzucenia lub ≥ 20 prób → „Wymaga uwagi”.
  3. Napisz `SyncPopover.tsx` (surface, radius lg, shadow-md, szer. 360 dp): „Synchronizacja”, „Ostatnia synchronizacja: {czas względny}”, „Oceny w kolejce: {n}”, „Połączenie: online / offline”, lista odrzuconych „#{nr} {nazwisko} – {powód}”.
  4. Dodaj secondary „Synchronizuj teraz” (`arrows-clockwise`, `SyncEngine.syncNow()` z blokadą do zakończenia) i tekst „Oceny są bezpieczne na tym tablecie. Wyślemy je automatycznie po odzyskaniu połączenia.”.
  5. Odświeżaj czas względny co 30 s i dodaj przypadki 5 stanów i popovera w DevCatalog.
  6. Dopisz lub uruchom przypadki TC-STATE-003, TC-UI-026, TC-E2E-JDG-022 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-317: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-STATE-003, TC-UI-026, TC-E2E-JDG-022 przechodzą
  - [ ] Ekran zgodny z SCR-JDG-07 (teksty wiążące z kluczy i18n, stany dodatkowe ⟡); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-318 – SCR-JDG-10 – urządzenie odłączone i eksport niewysłanych
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Gdy organizator odłączy tablet, sędzia widzi jasny komunikat z liczbą niewysłanych ocen, może je wyeksportować do pliku, sparować tablet ponownie lub wyczyścić dane.
- **Zakres:** Ekran z liczbą niewysłanych ocen, „Eksportuj niewysłane oceny” (JSON przez `expo-sharing`, Should), „Sparuj ponownie”, „Wyczyść dane” z potwierdzeniem; **Poza zakresem:** Import JSON po stronie organizatora (v1.1)
- **Zależności:** [IMP-300](#imp-300--powłoka-trybu-sędziego-i-judgeheader), [IMP-354](09-mobile-offline-i-synchronizacja.md#imp-354--syncengine--wysyłka-push)
- **Odwołania:** FR-808, US-044, SCR-JDG-10, [TC-E2E-JDG-026](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-026), [TC-SYNC-030](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-030)
- **Kroki:**
  1. Napisz `app/(judge)/revoked.tsx` i `features/judge/RevokedScreen.tsx` (SCR-JDG-10): ikona `link-break`, „To urządzenie zostało odłączone od turnieju”, tekst z liczbą niewysłanych ocen (`outbox` `QUEUED`/`FAILED_PERMANENT`, gdy > 0).
  2. Napisz `exportPendingScores()`: plik JSON (turniej, urządzenie, mutacje z treścią arkuszy, bez PIN-ów i tokenów) w `FileSystem.cacheDirectory` → `Sharing.shareAsync` (secondary „Eksportuj niewysłane oceny”, Should).
  3. Dodaj primary „Sparuj ponownie” → wyczyszczenie poświadczeń w SecureStore i SCR-JDG-06 (dane ocen zostają do eksportu) oraz ghost „Wyczyść dane” z potwierdzeniem → `TabletDataLifecycle.wipeAll()`.
  4. Wejście na ekran z `401 DEVICE_REVOKED` i `session.revoked { reason: DEVICE_REVOKED }`: zatrzymaj `SyncEngine` i zakończ sesję sędziego; dodaj przypadki w DevCatalog.
  5. Dopisz lub uruchom przypadki TC-E2E-JDG-026, TC-SYNC-030 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-318: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-JDG-026, TC-SYNC-030 przechodzą
  - [ ] Ekran zgodny z SCR-JDG-10 (teksty wiążące z kluczy i18n, stany dodatkowe ⟡); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-319 – Cykl życia danych tabletu
- **Epik / obszar:** EP-08 Mobile – ekrany sędziego | **Rola:** MOB
- **Cel:** Dane osobowe z turnieju nie zostają na tablecie dłużej niż to konieczne: znikają 7 dni po zakończeniu (przy pustej kolejce), po odłączeniu i przed parowaniem z nowym turniejem.
- **Zakres:** Usunięcie danych turnieju 7 dni po zakończeniu przy pustym outboxie, czyszczenie przy unieważnieniu i ponownym parowaniu, czyszczenie SecureStore; **Poza zakresem:** –
- **Zależności:** [IMP-350](09-mobile-offline-i-synchronizacja.md#imp-350--lokalna-baza-sqlite-schemat-migracje-pragma), [IMP-303](#imp-303--scr-jdg-01--wybór-profilu-z-ponownym-użyciem-tabletu)
- **Odwołania:** NFR-506, 05-bez §5.5, [TC-SYNC-037](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-037), [TC-EDGE-059](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-059)
- **Kroki:**
  1. Napisz `features/judge/TabletDataLifecycle.ts` z `wipeTournament()` (transakcja: usunięcie tabel `local_*`, `outbox` `DONE`, `local_draft`, reset `sync_meta`) i `wipeAll()` (dodatkowo SecureStore: `deviceId`, sekret, `pinPepper`, tokeny).
  2. Zapisz `sync_meta.tournament_finished_at` przy zmianie statusu turnieju na `FINISHED` w `pull`.
  3. Przy starcie aplikacji i powrocie na pierwszy plan uruchom `wipeTournament()`, gdy od zakończenia minęło 7 dni i outbox nie ma wpisów `QUEUED`/`IN_FLIGHT`.
  4. Wywołuj `wipeAll()` przy „Wyczyść dane” (SCR-JDG-10) i `wipeTournament()` przy „Sparuj z nowym turniejem” (SCR-JDG-01).
  5. Napisz testy z przesuniętym zegarem (6 i 8 dni, niepusta kolejka blokuje usunięcie).
  6. Dopisz lub uruchom przypadki TC-SYNC-037, TC-EDGE-059 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-319: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SYNC-037, TC-EDGE-059 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

