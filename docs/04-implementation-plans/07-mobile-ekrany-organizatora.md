# EP-07 – Mobile: ekrany organizatora (telefon)

> Dokument: `04-implementation-plans/07-mobile-ekrany-organizatora.md` · Tech Lead (Agent 2) · 23.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md)

Każdy ekran SCR-ORG-00…22 ma osobne zadanie (lub małą grupę). Ekrany z designu (SCR-ORG-00…12) odwzorowujemy 1:1 z prototypem `design/PoleChamp v2.dc.html`; ekrany poza designem (SCR-ORG-13…22) wymagają akceptacji projektanta (Q-08, [IMP-650](15-design-i-akceptacje.md)) – do tego czasu można je budować za flagą funkcji. Specyfikacja: [05-ekrany-organizatora.md](../02-specification/05-ekrany-organizatora.md).

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 29 | 195 h | MOB 195 |


## Zadania

### IMP-250 – SCR-ORG-13 – logowanie i sesja organizatora
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator loguje się e-mailem i hasłem, pozostaje zalogowany po restarcie aplikacji, a przy złych danych, blokadzie konta lub braku sieci widzi właściwy komunikat.
- **Zakres:** Ekran logowania (pola, `eye`, błędy „Nieprawidłowy e-mail lub hasło.”, „Za dużo prób…”, offline), zapis tokenów w SecureStore (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`), strażnik tras `(org)`, przekierowanie po splashu; **Poza zakresem:** Rejestracja (IMP-251)
- **Zależności:** [IMP-207](06-mobile-fundamenty-i-design-system.md#imp-207--pola-formularzy-textfield-numberfield-textarea-choicechip-pole-daty), [IMP-214](06-mobile-fundamenty-i-design-system.md#imp-214--warstwa-api-klienta-tokeny-odświeżanie-błędy), [IMP-220](06-mobile-fundamenty-i-design-system.md#imp-220--struktura-tras-expo-router-i-nawigacja), [IMP-116](03-backend-konto-i-konfiguracja-turnieju.md#imp-116--logowanie-blokada-konta-refresh-z-rotacją-wylogowanie)
- **Odwołania:** FR-103, FR-107, US-002, SCR-ORG-13, [TC-E2E-ORG-004](../03-test-plans/03-testy-e2e.md#tc-e2e-org-004), [TC-E2E-ORG-005](../03-test-plans/03-testy-e2e.md#tc-e2e-org-005)
- **Kroki:**
  1. Napisz ekran `app/(org)/login.tsx` i komponent `features/auth/LoginForm.tsx` (SCR-ORG-13): tło z poświatą accent-900, logo 36 dp + „PoleChamp” + „Panel organizatora”, `TextField` „E-mail” (`keyboardType="email-address"`, `autoComplete="email"`, `textContentType="username"`), „Hasło” z przełącznikiem `eye`/`eye-slash`.
  2. Dodaj schemat formularza z `LoginRequest` (`@polechamp/contracts`) przez `useZodForm` i mutację `useLogin()` (`POST /v1/auth/login`); przycisk primary 48 dp „Zaloguj się” w stanie `loading` podczas żądania.
  3. Mapuj błędy: `INVALID_CREDENTIALS` → „Nieprawidłowy e-mail lub hasło.” pod formularzem, `ACCOUNT_LOCKED`/`RATE_LIMITED` → „Za dużo prób. Spróbuj za chwilę.” z odliczaniem `retryAfterSeconds`, `NETWORK` → „Brak połączenia z internetem.”.
  4. Zapisz `accessToken` w pamięci i `refreshToken` w `expo-secure-store` (`keychainAccessible: AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`) w `src/data/auth/orgSession.ts`; ustaw `queryClient.setQueryData(['me'], user)`.
  5. Dodaj strażnika w `app/(org)/_layout.tsx`: brak sesji → `login`; po zalogowaniu `router.replace('/(org)')` (SCR-ORG-01).
  6. Dodaj linki ghost „Nie pamiętasz hasła?” (IMP-253) i „Załóż konto” (IMP-251) oraz `testID` dla Maestro (`login-email`, `login-password`, `login-submit`).
  7. Dodaj przypadki „Logowanie: domyślny / błąd / blokada / offline” w DevCatalog.
  8. Dopisz lub uruchom przypadki TC-E2E-ORG-004, TC-E2E-ORG-005 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  9. Otwórz PR `IMP-250: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-004 (logowanie), TC-E2E-ORG-005 przechodzą
  - [ ] Ekran zgodny z SCR-ORG-13 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-251 – SCR-ORG-13 – rejestracja
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Nowy organizator zakłada konto po zaakceptowaniu regulaminu i umowy powierzenia, a błędy pól (np. hasło z wycieku) pokazują się pod właściwym polem.
- **Zakres:** Formularz (nazwa, e-mail, hasło z podpowiedzią, checkbox regulaminu z linkami z `app-config` w przeglądarce w aplikacji), „Załóż konto” nieaktywny bez zgody, mapowanie błędów pól; **Poza zakresem:** –
- **Zależności:** [IMP-250](#imp-250--scr-org-13--logowanie-i-sesja-organizatora), [IMP-114](03-backend-konto-i-konfiguracja-turnieju.md#imp-114--rejestracja-konta-argon2id-hibp-regulamin), [IMP-120](03-backend-konto-i-konfiguracja-turnieju.md#imp-120--konfiguracja-aplikacji-i-minimalna-wersja)
- **Odwołania:** FR-101, FR-903, US-001, [TC-E2E-ORG-002](../03-test-plans/03-testy-e2e.md#tc-e2e-org-002)
- **Kroki:**
  1. Napisz `features/auth/RegisterForm.tsx` (wariant SCR-ORG-13): pola „Nazwa wyświetlana”, „E-mail”, „Hasło” z podpowiedzią „Min. 10 znaków.” i schemat `RegisterRequest` w `useZodForm`.
  2. Dodaj checkbox „Akceptuję regulamin i umowę powierzenia przetwarzania danych” z linkami `legal.termsUrl` i `legal.dpaUrl` z `useAppConfig()` (`['appConfig']`) otwieranymi przez `expo-web-browser` (`openBrowserAsync`).
  3. Wyłącz przycisk primary „Załóż konto” (opacity 0,45) bez zaznaczonej zgody; wysyłaj `termsVersion` z `app-config`.
  4. Napisz mutację `useRegister()` (`POST /v1/auth/register`); odpowiedź `202` → ekran weryfikacji kodu (IMP-252) z zapamiętanym e-mailem.
  5. Mapuj `errors[]`: `PASSWORD_BREACHED`, `TOO_SHORT`, `INVALID_FORMAT` → teksty `errors.field.<CODE>` pod właściwymi polami (`password`, `email`).
  6. Dodaj przypadki „Rejestracja: pusta / błędy pól / zgoda niezaznaczona” w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-E2E-ORG-002 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-251: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-002 (rejestracja) przechodzi
  - [ ] Ekran zgodny z SCR-ORG-13 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-252 – SCR-ORG-13 – weryfikacja e-maila i baner w turnieju
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator potwierdza adres e-mail 6-cyfrowym kodem (albo pomija ten krok na razie), a dopóki tego nie zrobi, widzi w turnieju baner i nie może go rozpocząć.
- **Zakres:** 6 pól kodu (autouzupełnianie z SMS/e-mail na iOS), „Wyślij kod ponownie” (60 s), „Pomiń na razie”, baner w SCR-ORG-03 z linkiem ponownego wysłania, blokada startu turnieju/kategorii z komunikatem; **Poza zakresem:** –
- **Zależności:** [IMP-251](#imp-251--scr-org-13--rejestracja), [IMP-115](03-backend-konto-i-konfiguracja-turnieju.md#imp-115--weryfikacja-e-maila-i-ponowne-wysłanie-kodu)
- **Odwołania:** FR-102, US-001, [TC-E2E-ORG-002](../03-test-plans/03-testy-e2e.md#tc-e2e-org-002), [TC-E2E-ORG-003](../03-test-plans/03-testy-e2e.md#tc-e2e-org-003)
- **Kroki:**
  1. Napisz `features/auth/VerifyEmailScreen.tsx`: „Wpisz kod z e-maila”, 6 pól 44×52 dp (`CodeInput` z autoprzejściem i wklejaniem całego kodu, `textContentType="oneTimeCode"`, `autoComplete="one-time-code"`).
  2. Napisz mutację `useVerifyEmail()` (`POST /v1/auth/verify-email`): sukces → `invalidateQueries(['me'])` i przejście do SCR-ORG-01; `CODE_INVALID` → „Kod jest nieprawidłowy lub wygasł.” i wyczyszczenie pól.
  3. Dodaj ghost „Wyślij kod ponownie” aktywny po 60 s (licznik w stanie lokalnym, `POST /v1/auth/verify-email/resend`; `RATE_LIMITED` → „Za dużo prób. Spróbuj za chwilę.”) i ghost „Pomiń na razie”.
  4. Dodaj w SCR-ORG-03 `Banner` `emailVerify` („Potwierdź adres e-mail, aby rozpocząć turniej.” + link „Wyślij kod ponownie”) widoczny, gdy `me.emailVerified === false`.
  5. Obsłuż `403 EMAIL_NOT_VERIFIED` przy „Rozpocznij turniej” i „Rozpocznij kategorię” toastem błędu z tym tekstem i przejściem do ekranu kodu.
  6. Dodaj przypadki „Kod: pusty / błędny / odliczanie” i baner w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-E2E-ORG-002, TC-E2E-ORG-003 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-252: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-002, TC-E2E-ORG-003 przechodzą
  - [ ] Ekran zgodny z SCR-ORG-13 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-253 – SCR-ORG-13 – reset hasła i linki uniwersalne
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator prosi o link do zmiany hasła, otwiera go z e-maila prosto w aplikacji i ustawia nowe hasło, po czym loguje się ponownie.
- **Zakres:** Formularz „Nie pamiętasz hasła?”, komunikat neutralny, obsługa linku `https://polechamp.app/reset?token=` (Expo Router + associated domains / intent filters), ekran nowego hasła; **Poza zakresem:** –
- **Zależności:** [IMP-250](#imp-250--scr-org-13--logowanie-i-sesja-organizatora), [IMP-117](03-backend-konto-i-konfiguracja-turnieju.md#imp-117--reset-hasła-link-uniwersalny), [IMP-179](05-backend-eksport-audyt-rodo.md#imp-179--strona-statyczna-dokumenty-prawne-usunięcie-konta-linki-uniwersalne)
- **Odwołania:** FR-104, US-002, TL-39, [TC-E2E-ORG-006](../03-test-plans/03-testy-e2e.md#tc-e2e-org-006)
- **Kroki:**
  1. Napisz `features/auth/ForgotPasswordForm.tsx`: pole „E-mail”, primary „Wyślij link”, po `POST /v1/auth/password/forgot` zawsze komunikat „Jeśli konto istnieje, wysłaliśmy link do zmiany hasła.”.
  2. Dodaj trasę `app/(org)/reset.tsx` obsługującą `https://polechamp.app/reset?token=…` i `polechamp://reset?token=…` (`useLocalSearchParams`), z konfiguracją `associatedDomains: ['applinks:polechamp.app']` i `intentFilters` (`autoVerify`) w `app.config.ts`.
  3. Napisz `NewPasswordForm`: „Nowe hasło” (podpowiedź „Min. 10 znaków.”), primary „Zapisz hasło”, mutacja `POST /v1/auth/password/reset`.
  4. Mapuj `RESET_TOKEN_INVALID` → „Link wygasł. Poproś o nowy.” z przyciskiem do formularza „Nie pamiętasz hasła?”; `PASSWORD_BREACHED` pod polem.
  5. Po sukcesie wyczyść sesję lokalną (`orgSession.clear()`), przejdź do logowania i pokaż toast z kluczem `toast.passwordChanged` (tekst do akceptacji w IMP-650).
  6. Dodaj przypadki w DevCatalog i scenariusz Maestro otwierający deep link resetu.
  7. Dopisz lub uruchom przypadki TC-E2E-ORG-006 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-253: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-006 przechodzi na iOS i Androidzie
  - [ ] Ekran zgodny z SCR-ORG-13 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-254 – SCR-ORG-00 – splash organizatora z ładowaniem danych
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Po uruchomieniu w trybie organizatora splash pokazuje etapy ładowania, a następnie od razu otwiera listę turniejów z danymi (lub logowanie, gdy brak sesji, albo cache z banerem offline).
- **Zakres:** Etapy: sesja → lista turniejów (prefetch) → gotowe; czas min. 1,2 s, maks. 4,3 s; wyjście fade 0,5 s; bez sesji → SCR-ORG-13; offline → SCR-ORG-01 z cache i banerem; **Poza zakresem:** –
- **Zależności:** [IMP-211](06-mobile-fundamenty-i-design-system.md#imp-211--splash-z-animacją-tancerki-polespinner), [IMP-215](06-mobile-fundamenty-i-design-system.md#imp-215--tanstack-query-cache-mmkv-i-tryb-offline-organizatora), [IMP-250](#imp-250--scr-org-13--logowanie-i-sesja-organizatora)
- **Odwołania:** FR-210, US-016, SCR-ORG-00, [TC-E2E-ORG-007](../03-test-plans/03-testy-e2e.md#tc-e2e-org-007)
- **Kroki:**
  1. Napisz `app/(org)/splash.tsx` używający `SplashScreen` (IMP-211, rozmiar 340×300) z etapami „Wczytywanie turniejów…” → „Synchronizacja wyników…” → „Gotowe” (zmiany przy 35% i 75% czasu).
  2. Napisz `features/org/bootstrap.ts`: odczyt `refreshToken` z SecureStore → `POST /v1/auth/refresh` → `queryClient.prefetchQuery(['tournaments','active'])` i `['tournaments','finished']`.
  3. Ogranicz czas wyświetlania do min. 1,2 s i maks. 4,3 s (`Promise.race` z timerem), wyjście fade 0,5 s.
  4. Przekieruj: brak sesji lub `TOKEN_REUSED` → `login`; błąd sieci → SCR-ORG-01 z danymi z cache MMKV i banerem offline.
  5. Dodaj znacznik TTI Sentry po pierwszym renderze listy.
  6. Dopisz lub uruchom przypadki TC-E2E-ORG-007 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Dodaj stany do DevCatalog lub zrzuty ekranu (telefon/tablet, iOS/Android) do PR; sprawdź etykiety a11y i skalowanie tekstu.
  8. Otwórz PR `IMP-254: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-007 przechodzi
  - [ ] Ekran zgodny z SCR-ORG-00 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-255 – SCR-ORG-01 – lista turniejów
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator widzi aktywne i zakończone turnieje z postępem, poprawnymi datami po polsku i stanami (ładowanie, brak turniejów, offline, błąd), a z listy przechodzi do turnieju lub tworzy nowy.
- **Zakres:** Nagłówek (kicker, „Turnieje”, „+”, ikona konta), sekcje Aktywne/Zakończone (sortowanie TC-STATE-012), karty i wiersze, formaty dat, stany (ładowanie, brak turniejów, brak aktywnych, offline, błąd), pull-to-refresh, etykiety a11y kart; **Poza zakresem:** –
- **Zależności:** [IMP-205](06-mobile-fundamenty-i-design-system.md#imp-205--karty-listy-grupowane-nagłówki-sekcji-stany-puste-szkielety), [IMP-215](06-mobile-fundamenty-i-design-system.md#imp-215--tanstack-query-cache-mmkv-i-tryb-offline-organizatora), [IMP-121](03-backend-konto-i-konfiguracja-turnieju.md#imp-121--turnieje-lista-utworzenie-szczegóły)
- **Odwołania:** FR-201, FR-209, US-010, SCR-ORG-01, [TC-STATE-012](../03-test-plans/01-testy-jednostkowe.md#tc-state-012), [TC-E2E-ORG-008](../03-test-plans/03-testy-e2e.md#tc-e2e-org-008)
- **Kroki:**
  1. Napisz ekran `app/(org)/index.tsx` i `features/tournaments/TournamentListScreen.tsx` z zapytaniami `useTournaments('active')` i `useTournaments('finished')` (`GET /v1/tournaments?status=`, klucze `['tournaments', status]`).
  2. Zbuduj nagłówek: kicker „Panel organizatora”, tytuł „Turnieje” (32 dp/500), `iconRound` 40 dp `user-circle` → SCR-ORG-21 i `iconRound` 40 dp z obrysem accent `plus` → SCR-ORG-02 (nieaktywny offline).
  3. Zbuduj sekcję „AKTYWNE” z `TournamentCard` (pigułka, nazwa, `formatTournamentDate` lub „Data do ustalenia”, miejsce lub „Miejsce do ustalenia”, pasek i „{n} {kategoria|kategorie|kategorii} · {pct}%”) i sekcję „ZAKOŃCZONE” (`GroupedList` z kafelkiem `archive`) tylko gdy niepusta.
  4. Sortuj w selektorze `sortTournaments()`: Trwa → W przygotowaniu, w grupie data rosnąco (brak daty na końcu); zakończone data malejąco.
  5. Obsłuż stany: ładowanie (2 `SkeletonCard` + 2 `SkeletonRow`), brak turniejów (`EmptyState` `trophy`, „Nie masz jeszcze turniejów.”, primary „Utwórz turniej”), brak aktywnych („Brak aktywnych turniejów.”), offline (cache + baner), błąd (`EmptyState error` z „Spróbuj ponownie”).
  6. Dodaj pull-to-refresh (`RefreshControl` w kolorze accent → `refetch` obu zapytań) i etykietę a11y karty „{nazwa}, {status}, {data}, {miejsce}, postęp {pct} procent”.
  7. Dodaj przypadki wszystkich stanów w DevCatalog.
  8. Dopisz lub uruchom przypadki TC-STATE-012, TC-E2E-ORG-008 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  9. Otwórz PR `IMP-255: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-STATE-012, TC-E2E-ORG-008 przechodzą
  - [ ] Ekran zgodny z SCR-ORG-01 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** niskie

### IMP-256 – SCR-ORG-02 – nowy turniej
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator tworzy turniej w arkuszu (nazwa, data, miejsce), a po zapisie trafia do szczegółów nowego turnieju z toastem; przy błędzie sieci dane w arkuszu zostają.
- **Zakres:** Arkusz z polami (nazwa, data – `DateRangeField`, miejsce), walidacja zod, `Idempotency-Key`, stan ładowania przycisku, toast „Utworzono turniej”, przejście do szczegółów, błąd sieci (toast, arkusz zostaje); **Poza zakresem:** –
- **Zależności:** [IMP-206](06-mobile-fundamenty-i-design-system.md#imp-206--komponent-sheet-bottom-sheet--implementacja-własna), [IMP-207](06-mobile-fundamenty-i-design-system.md#imp-207--pola-formularzy-textfield-numberfield-textarea-choicechip-pole-daty), [IMP-255](#imp-255--scr-org-01--lista-turniejów)
- **Odwołania:** FR-202, US-011, SCR-ORG-02, [TC-E2E-ORG-009](../03-test-plans/03-testy-e2e.md#tc-e2e-org-009), [TC-EDGE-031](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-031)
- **Kroki:**
  1. Napisz `features/tournaments/NewTournamentSheet.tsx` (`Sheet` z tytułem „Nowy turniej”): `TextField` „Nazwa turnieju” (placeholder „np. Wiosenny Puchar PoleChamp”), siatka 2 kolumn `DateRangeField` „Data” i `TextField` „Miejsce”.
  2. Waliduj schematem `TournamentCreate` (`@polechamp/contracts`): nazwa 3–120 → „Podaj nazwę turnieju (min. 3 znaki).”, `DATE_RANGE`, miejsce ≤ 120.
  3. Napisz mutację `useCreateTournament()` (`POST /v1/tournaments` z `Idempotency-Key` generowanym przy otwarciu arkusza i zachowanym przy ponowieniu).
  4. Po sukcesie: `setQueryData(['tournament', id])`, `invalidateQueries(['tournaments','active'])`, zamknięcie arkusza, `router.push` do SCR-ORG-03 i toast „Utworzono turniej”.
  5. Przy błędzie sieci lub 5xx pokaż toast „Nie udało się zapisać. Spróbuj ponownie.” i zostaw arkusz z danymi; błędy pól 422 pod polami.
  6. Ustaw kolejność pól klawiatury („Dalej” między polami, „Gotowe” zatwierdza) i stan `loading` przycisku primary 48 dp „Utwórz turniej”.
  7. Dopisz lub uruchom przypadki TC-E2E-ORG-009, TC-EDGE-031 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Dodaj stany do DevCatalog lub zrzuty ekranu (telefon/tablet, iOS/Android) do PR; sprawdź etykiety a11y i skalowanie tekstu.
  9. Otwórz PR `IMP-256: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-009, TC-EDGE-031 przechodzą
  - [ ] Ekran zgodny z SCR-ORG-02 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-257 – SCR-ORG-03 – szczegóły turnieju
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator widzi stan turnieju (status, statystyki, postęp na żywo, kategorie), rozpoczyna go lub przechodzi do zakończenia, a turniej zakończony jest prezentowany tylko do odczytu.
- **Zakres:** Nawigacja (‹ Turnieje, ołówek, PDF), pigułka, nazwa, meta, kafle statystyk (kafel Sędziowie → SCR-ORG-14), karta postępu z przyciskiem statusu („Rozpocznij turniej”/„Zakończ turniej”/brak), sekcja kategorii („Dodaj” ukryte w Zakończona), karty kategorii (pigułka „Nierozegrana” – TL-33), stan pusty, banery (e-mail, odrzucone), aktualizacje realtime; **Poza zakresem:** Arkusz zakończenia (IMP-258)
- **Zależności:** [IMP-255](#imp-255--scr-org-01--lista-turniejów), [IMP-216](06-mobile-fundamenty-i-design-system.md#imp-216--klient-realtime-z-fallbackiem-na-odpytywanie), [IMP-122](03-backend-konto-i-konfiguracja-turnieju.md#imp-122--turnieje-edycja-usunięcie-start-ochrona-turnieju-zakończonego)
- **Odwołania:** FR-205, FR-206, FR-208, FR-209, US-013, US-014, SCR-ORG-03, UI-02, [TC-E2E-ORG-010](../03-test-plans/03-testy-e2e.md#tc-e2e-org-010), [TC-DESIGN-002](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-002)
- **Kroki:**
  1. Napisz `app/(org)/t/[tournamentId]/index.tsx` i `features/tournaments/TournamentDetailsScreen.tsx` z `useTournament(id)` (`GET /v1/tournaments/{id}`, klucz `['tournament', id]`, `ETag` w cache).
  2. Zbuduj wiersz nawigacji: `BackLink` „‹ Turnieje”, `iconRound` 36 dp `pencil-simple` → SCR-ORG-20 (ukryty w Zakończona) i `file-pdf` → SCR-ORG-12 (zakres turniej); pigułka statusu, nazwa 26 dp, meta z datą i miejscem.
  3. Dodaj `StatTiles` („Kategorie”, „Zawodniczki”, „Sędziowie” – kafel tapowalny → SCR-ORG-14 z ikoną `caret-right`) i `ProgressCard` („{done} z {exp} ocen w rozpoczętych kategoriach” / „Brak rozpoczętych kategorii”).
  4. Dodaj przycisk statusu w karcie postępu: W przygotowaniu primary „Rozpocznij turniej” (`play`, `POST …/start`, toast „Turniej rozpoczęty”), Trwa secondary „Zakończ turniej” (`flag-checkered`) → SCR-ORG-04, Zakończona – brak przycisku (UI-02).
  5. Zbuduj sekcję „KATEGORIE” z ghost „Dodaj” → SCR-ORG-05 (ukryte w Zakończona), `CategoryCard` z pigułką (w turnieju Zakończona kategorie `DRAFT` jako „Nierozegrana” – TL-33) i stanem pustym `framed` „Brak kategorii. Dodaj pierwszą, aby zacząć.”.
  6. Dodaj banery nad kartą postępu: `emailVerify` i `rejected` „Odrzucone oceny ({n})” (`pendingRejectedSubmissions` > 0) → SCR-ORG-22.
  7. Podłącz realtime: `progress.updated` aktualizuje cache bez zapytania, `tournament.updated`/`category.updated` → `invalidateQueries(['tournament', id])`.
  8. Obsłuż stany ładowania (szkielety kafli, karty i 3 kart kategorii), błędu i offline (przyciski nieaktywne) oraz dodaj je w DevCatalog.
  9. Dopisz lub uruchom przypadki TC-E2E-ORG-010, TC-DESIGN-002 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  10. Otwórz PR `IMP-257: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-010, TC-DESIGN-002 przechodzą
  - [ ] Ekran zgodny z SCR-ORG-03 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 12 h (L) | **Ryzyko:** niskie

### IMP-258 – SCR-ORG-04 – zakończenie turnieju
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator kończy turniej po potwierdzeniu, widząc, co się stanie z kategoriami, brakującymi ocenami, tabletami z zaległościami i odrzuconymi ocenami.
- **Zakres:** Arkusz potwierdzenia z liczbami kategorii, ostrzeżeniami TL-48 (braki ocen, tablety z kolejką, nierozstrzygnięte odrzucenia), `If-Match`, toast „Turniej zakończony”; **Poza zakresem:** –
- **Zależności:** [IMP-257](#imp-257--scr-org-03--szczegóły-turnieju), [IMP-123](03-backend-konto-i-konfiguracja-turnieju.md#imp-123--turnieje-zakończenie-auto-blokada-nierozegrane-sesje), [IMP-206](06-mobile-fundamenty-i-design-system.md#imp-206--komponent-sheet-bottom-sheet--implementacja-własna)
- **Odwołania:** FR-207, US-015, SCR-ORG-04, TL-48, [TC-STATE-014](../03-test-plans/01-testy-jednostkowe.md#tc-state-014), [TC-E2E-ORG-011](../03-test-plans/03-testy-e2e.md#tc-e2e-org-011)
- **Kroki:**
  1. Napisz `features/tournaments/FinishTournamentSheet.tsx` (`ConfirmSheet`: ikona `flag-checkered` w kole accent-900, tytuł „Zakończyć turniej?”, tekst „„{nazwa}” zostanie zamknięty, a wyniki zapisane jako ostateczne.”).
  2. Dodaj tekst warunkowy z danych `['tournament', id]`: „Kategorie w toku ({n}) zostaną zablokowane. Kategorie w przygotowaniu ({m}) zostaną oznaczone jako nierozegrane.”.
  3. Dodaj ostrzeżenia TL-48 (13 dp, accent-300, `warning-circle`) z `['tournament', id]` i `['devices', id]`: „Brakuje {k} ocen w kategoriach w toku.”, „Tablety z niewysłanymi ocenami: {nazwa} ({n}), …”, „Nierozstrzygnięte odrzucone oceny ({r}) nie będą mogły zostać przyjęte.”.
  4. Napisz mutację `useFinishTournament()` (`POST /v1/tournaments/{id}/finish` z `If-Match` z cache); `CONFLICT_VERSION` → odświeżenie danych i toast „Ktoś zmienił te dane. Odśwież i spróbuj ponownie.”.
  5. Po sukcesie: `invalidateQueries(['tournament', id])`, `['tournaments']`, zamknięcie arkusza i toast „Turniej zakończony”; przycisk statusu znika.
  6. Dopisz lub uruchom przypadki TC-STATE-014, TC-E2E-ORG-011 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Dodaj stany do DevCatalog lub zrzuty ekranu (telefon/tablet, iOS/Android) do PR; sprawdź etykiety a11y i skalowanie tekstu.
  8. Otwórz PR `IMP-258: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-STATE-014, TC-E2E-ORG-011 przechodzą
  - [ ] Ekran zgodny z SCR-ORG-04 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-259 – SCR-ORG-20 – edycja i usunięcie turnieju
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator poprawia nazwę, datę i miejsce turnieju, a pusty turniej w przygotowaniu może usunąć po potwierdzeniu.
- **Zakres:** Arkusz jak SCR-ORG-02 z „Zapisz zmiany”, „Usuń turniej” (DRAFT) z drugim krokiem, obsługa `CONFLICT_VERSION`; **Poza zakresem:** –
- **Zależności:** [IMP-256](#imp-256--scr-org-02--nowy-turniej), [IMP-257](#imp-257--scr-org-03--szczegóły-turnieju)
- **Odwołania:** FR-203, FR-204, US-012, SCR-ORG-20, [TC-E2E-ORG-012](../03-test-plans/03-testy-e2e.md#tc-e2e-org-012), [TC-EDGE-051](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-051)
- **Kroki:**
  1. Napisz `features/tournaments/EditTournamentSheet.tsx` reużywający pola `NewTournamentSheet` z tytułem „Edytuj turniej” i wartościami z `['tournament', id]`.
  2. Napisz mutację `useUpdateTournament()` (`PATCH /v1/tournaments/{id}`, `If-Match`), toast „Zapisano zmiany”; `CONFLICT_VERSION` → odświeżenie formularza i toast błędu z tekstem katalogu.
  3. Dodaj secondary „Usuń turniej” tylko dla `DRAFT` bez ocen → drugi krok („Usunąć turniej „{nazwa}”? Zostaną usunięte wszystkie kategorie, listy startowe i sędziowie.” + „Usuń” / „Anuluj”).
  4. Napisz mutację `useDeleteTournament()` (`DELETE`, `If-Match`): sukces → `removeQueries(['tournament', id])`, `invalidateQueries(['tournaments'])`, powrót do SCR-ORG-01; `HAS_SCORES` → „Nie można usunąć – są już oceny.”.
  5. Dopisz lub uruchom przypadki TC-E2E-ORG-012, TC-EDGE-051 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  6. Dodaj stany do DevCatalog lub zrzuty ekranu (telefon/tablet, iOS/Android) do PR; sprawdź etykiety a11y i skalowanie tekstu.
  7. Otwórz PR `IMP-259: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-012, TC-EDGE-051 przechodzą
  - [ ] Ekran zgodny z SCR-ORG-20 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** niskie

### IMP-260 – SCR-ORG-05 – nowa / edycja kategorii
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator dodaje kategorię (nazwa, styl, poziom, grupa wiekowa) i widzi ją od razu na liście turnieju z kryteriami z szablonu stylu; edytuje ją i przed startem usuwa po potwierdzeniu.
- **Zakres:** Arkusz z nazwą, chipami stylu i poziomu, grupą wiekową (domyślnie „Open”), blokada chipów po starcie z podpisem, „Usuń kategorię” (drugi krok), toasty; **Poza zakresem:** –
- **Zależności:** [IMP-206](06-mobile-fundamenty-i-design-system.md#imp-206--komponent-sheet-bottom-sheet--implementacja-własna), [IMP-207](06-mobile-fundamenty-i-design-system.md#imp-207--pola-formularzy-textfield-numberfield-textarea-choicechip-pole-daty), [IMP-124](03-backend-konto-i-konfiguracja-turnieju.md#imp-124--kategorie-tworzenie-z-szablonu-odczyt-edycja-usunięcie)
- **Odwołania:** FR-301, FR-302, FR-303, US-020, US-021, SCR-ORG-05, [TC-E2E-ORG-013](../03-test-plans/03-testy-e2e.md#tc-e2e-org-013), [TC-E2E-ORG-014](../03-test-plans/03-testy-e2e.md#tc-e2e-org-014)
- **Kroki:**
  1. Napisz `features/categories/CategoryFormSheet.tsx` (`Sheet`, tytuł „Nowa kategoria” / „Edytuj kategorię”): `TextField` „Nazwa” (placeholder „np. Pole Sport Beginner”), `ChoiceChipGroup` „Styl” („Pole Sport”, „Pole Art”, „Exotic”, „Doubles”) i „Poziom” („Beginner”, „Intermediate”, „Advanced”, „Pro”, „Elite”), `TextField` „Grupa wiekowa” (domyślnie „Open”).
  2. Waliduj schematami `CategoryCreate`/`CategoryPatch` z `@polechamp/contracts` przez `useZodForm`: „Podaj nazwę kategorii.” (1–80), grupa ≤ 40 (pusta → „Open”); domyślne wartości nowej: Pole Sport, Beginner, Open.
  3. Napisz mutacje `useCreateCategory()` (`POST /v1/tournaments/{id}/categories`, `Idempotency-Key`) i `useUpdateCategory()` (`PATCH /v1/categories/{id}`, `If-Match`); po sukcesie `invalidateQueries(['tournament', tournamentId])` i `['category', id]`.
  4. W edycji kategorii Trwa/Zakończona ustaw chipy stylu i poziomu jako nieaktywne (opacity 0,45) z podpisem „Styl i poziom można zmienić tylko przed rozpoczęciem kategorii.” i wysyłaj tylko zmienione pola.
  5. Dodaj (edycja, W przygotowaniu) secondary „Usuń kategorię” (`trash`, neutral-300) → drugi krok „Usunąć kategorię „{nazwa}”? Zostaną usunięte kryteria, kary i lista startowa.” z „Usuń” (secondary) / „Anuluj” (ghost); mutacja `DELETE /v1/categories/{id}` i powrót do SCR-ORG-03.
  6. Pokaż toasty „Dodano kategorię” (arkusz zamknięty, użytkownik zostaje na SCR-ORG-03) i „Zapisano zmiany”; mapuj `INVALID_STATE_TRANSITION`, `TOURNAMENT_FINISHED` i `CONFLICT_VERSION` na toasty błędu z katalogu, `LIMIT_EXCEEDED` na „Osiągnięto limit ({max}).”.
  7. Zablokuj przycisk primary offline (`useCanWrite()`) i dodaj przypadki „nowa / edycja W przygotowaniu / edycja Trwa / drugi krok usuwania” w DevCatalog.
  8. Dopisz lub uruchom przypadki TC-E2E-ORG-013, TC-E2E-ORG-014 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  9. Otwórz PR `IMP-260: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-013, TC-E2E-ORG-014 przechodzą
  - [ ] Ekran zgodny z SCR-ORG-05 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-261 – SCR-ORG-06/07/08 – rama szczegółów kategorii
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator ma w szczegółach kategorii wspólną ramę z zakładkami Kryteria, Zawodniczki i Wyniki oraz przyklejony pasek akcji odpowiadający statusowi (start, blokada, odblokowanie, eksport).
- **Zakres:** Nawigacja (‹ Turniej, ołówek), meta w jednej linii, nazwa, pigułka, segmenty z licznikami (start na „Kryteria”), `StickyActionBar` wg stanu (TC-UI-024), akcje start/lock/unlock z obsługą `START_REQUIREMENTS_NOT_MET` (toast z przyczyną), `LOCK_WARNINGS` (→ SCR-ORG-18), baner „Odrzucone oceny (n)”; **Poza zakresem:** Zakładki (IMP-262, 265, 268)
- **Zależności:** [IMP-209](06-mobile-fundamenty-i-design-system.md#imp-209--segmentedcontrol-stickyactionbar-screenheaderbacklink-kontenery-ekranów), [IMP-257](#imp-257--scr-org-03--szczegóły-turnieju), [IMP-126](03-backend-konto-i-konfiguracja-turnieju.md#imp-126--start-kategorii-warunki-panel-auto-start-turnieju), [IMP-127](03-backend-konto-i-konfiguracja-turnieju.md#imp-127--blokada-i-odblokowanie-kategorii-z-sumą-kontrolną)
- **Odwołania:** FR-308, FR-309, FR-310, FR-312, US-025, US-026, US-027, SCR-ORG-06, SCR-ORG-07, SCR-ORG-08, [TC-E2E-ORG-018](../03-test-plans/03-testy-e2e.md#tc-e2e-org-018), [TC-E2E-ORG-026](../03-test-plans/03-testy-e2e.md#tc-e2e-org-026)
- **Kroki:**
  1. Napisz `app/(org)/c/[categoryId]/index.tsx` i `features/categories/CategoryScreen.tsx` z `useCategory(id)` (`GET /v1/categories/{id}`, klucz `['category', id]`): `BackLink` „‹ Turniej”, `iconRound` `pencil-simple` → SCR-ORG-05 (ukryty w turnieju Zakończona), meta „{styl} · {poziom} · {grupa}” w jednej linii (UI-11), nazwa 26 dp, pigułka statusu.
  2. Dodaj `SegmentedControl` („Kryteria {n}”, „Zawodniczki {n}”, „Wyniki”) z aktywną zakładką „Kryteria” po wejściu i stanem zakładki w parametrze trasy (`?tab=`).
  3. Zbuduj `CategoryActionBar` (`StickyActionBar`): W przygotowaniu primary „Rozpocznij kategorię” (`play`); Trwa secondary „Zakończ i zablokuj” (`lock-simple`) + primary „Eksport PDF” (`file-pdf`); Zakończona (turniej Trwa) secondary „Odblokuj” (`lock-simple-open`) + primary „Eksport PDF”; turniej Zakończona – tylko „Eksport PDF”.
  4. Napisz mutację `useStartCategory()` (`POST /v1/categories/{id}/start`): toast „Kategoria rozpoczęta”; `START_REQUIREMENTS_NOT_MET` → toast `toast.startRequirement.*` wg `detail` („Dodaj co najmniej jedno kryterium.” / „…jedną zawodniczkę.” / „…jednego sędziego.”), `EMAIL_NOT_VERIFIED` → ekran kodu.
  5. Napisz mutacje `useLockCategory({ force })` (`409 LOCK_WARNINGS` → SCR-ORG-18 z treścią ostrzeżeń; sukces → toast „Kategoria zakończona”) i `useUnlockCategory()` (toast „Kategoria odblokowana”); po sukcesie unieważnij `['category', id]`, `['results', id]`, `['tournament', tournamentId]`.
  6. Dodaj baner `rejected` „Odrzucone oceny ({n})” pod pigułką (`pendingRejectedSubmissions` kategorii) → SCR-ORG-22 i realtime `category.updated`/`category.locked` → `invalidateQueries(['category', id])`.
  7. Obsłuż stany ładowania (szkielet nagłówka i segmentów), błędu i offline (przyciski paska nieaktywne).
  8. Dopisz lub uruchom przypadki TC-E2E-ORG-018, TC-E2E-ORG-026 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  9. Dodaj stany do DevCatalog lub zrzuty ekranu (telefon/tablet, iOS/Android) do PR; sprawdź etykiety a11y i skalowanie tekstu.
  10. Otwórz PR `IMP-261: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-018, TC-E2E-ORG-026 (bez arkusza) przechodzą
  - [ ] Ekran zgodny z SCR-ORG-06…08 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** średnie

### IMP-262 – SCR-ORG-06 – zakładka Kryteria
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator widzi kryteria z wagami i skalą oraz kary z limitami, maksymalny wynik sędziego i stan blokady, a przed startem może wejść w edycję każdego wiersza.
- **Zakres:** Sekcje „KRYTERIA OCENY” i „KARY PUNKTOWE”, wiersze z odznakami (formatowanie z `@polechamp/scoring`), „Maksymalny wynik sędziego: {max} pkt”, „Brak kar punktowych.”, tryb zablokowany (bez „Dodaj” i chevronów, informacja z kłódką); **Poza zakresem:** –
- **Zależności:** [IMP-261](#imp-261--scr-org-060708--rama-szczegółów-kategorii)
- **Odwołania:** FR-304, FR-305, FR-312, US-022, SCR-ORG-06, UI-07, UI-14, [TC-E2E-ORG-015](../03-test-plans/03-testy-e2e.md#tc-e2e-org-015), [TC-DESIGN-014](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-014)
- **Kroki:**
  1. Napisz `features/categories/tabs/CriteriaTab.tsx` korzystający z `['category', id]` (bez dodatkowego zapytania).
  2. Zbuduj sekcję `SectionHeader` „KRYTERIA OCENY” + ghost „Dodaj” → SCR-ORG-09 (nowe) i `GroupedList` wierszy (min. 56 dp): nazwa, „Skala 0–{max}”, `Badge weight` „×{waga}” (`formatWeight`), chevron → SCR-ORG-09 (edycja).
  3. Dodaj pod listą `info` + „Maksymalny wynik sędziego: {max} pkt” (`maxJudgeScore` z API, `formatScore`).
  4. Zbuduj sekcję „KARY PUNKTOWE” + „Dodaj” → SCR-ORG-10: wiersz z nazwą, „maks. {n}× na występ”, `Badge penalty` „−{pkt} pkt” (`formatPenaltyPoints`, U+2212); brak kar → „Brak kar punktowych.”.
  5. W kategorii Trwa/Zakończona ukryj „Dodaj”, usuń chevrony, ustaw wiersze jako nieaktywne i dodaj nad sekcją `lock-simple` + „Kryteria są zablokowane po rozpoczęciu kategorii.”.
  6. Dodaj przypadki „edytowalna / zablokowana / bez kar” w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-E2E-ORG-015, TC-DESIGN-014 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-262: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-015, TC-DESIGN-014 przechodzą
  - [ ] Ekran zgodny z SCR-ORG-06 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-263 – SCR-ORG-09 – kryterium (nowe/edycja/usunięcie)
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator dodaje, edytuje i usuwa kryterium oceny z walidacją skali i wagi, a próba usunięcia ostatniego kryterium kończy się czytelnym komunikatem.
- **Zakres:** Arkusz: nazwa, skala, waga ze stepperem, opis; walidacje z komunikatami; „Usuń kryterium” z drugim krokiem; obsługa `MIN_CRITERIA`, `CRITERIA_LOCKED`, `LIMIT_EXCEEDED`; toasty; **Poza zakresem:** –
- **Zależności:** [IMP-262](#imp-262--scr-org-06--zakładka-kryteria), [IMP-125](03-backend-konto-i-konfiguracja-turnieju.md#imp-125--kryteria-i-kary--crud-z-blokadą-po-starcie)
- **Odwołania:** FR-305, FR-306, US-023, SCR-ORG-09, [TC-E2E-ORG-016](../03-test-plans/03-testy-e2e.md#tc-e2e-org-016)
- **Kroki:**
  1. Napisz `features/categories/CriterionSheet.tsx` („Nowe kryterium” / „Edytuj kryterium”): `TextField` „Nazwa kryterium” (placeholder „np. Technika”), siatka `NumberField` „Skala (0–max)” (całkowita, domyślnie 10) i „Waga” ze stepperem −/+ 0,5 (domyślnie 1), `TextField` „Opis dla sędziów” (placeholder „Opcjonalnie”).
  2. Waliduj schematem `CriterionInput`: „Podaj nazwę kryterium.”, „Skala od 1 do 20.”, „Waga od 0,5 do 5 (co 0,5).”, opis ≤ 200; akceptuj przecinek i kropkę w wadze.
  3. Napisz mutacje `useCreateCriterion()` (`POST /v1/categories/{id}/criteria`), `useUpdateCriterion()` (`PATCH /v1/criteria/{id}`) i `useDeleteCriterion()` (`DELETE`), każda z `invalidateQueries(['category', categoryId])`.
  4. Dodaj w edycji secondary „Usuń kryterium” (`trash`) → drugi krok „Usunąć kryterium „{nazwa}”?” z „Usuń” / „Anuluj”.
  5. Mapuj błędy: `MIN_CRITERIA` → „Kategoria musi mieć co najmniej jedno kryterium.”, `CRITERIA_LOCKED` → „Kryteria są zablokowane po rozpoczęciu kategorii.” (i zamknięcie arkusza), `LIMIT_EXCEEDED` → „Osiągnięto limit (12).”.
  6. Pokaż toasty „Dodano kryterium”, „Zapisano kryterium”, „Usunięto kryterium” i dodaj przypadki arkusza w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-E2E-ORG-016 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-263: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-016 przechodzi
  - [ ] Ekran zgodny z SCR-ORG-09 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-264 – SCR-ORG-10 – kara (nowa/edycja/usunięcie)
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator dodaje, edytuje i usuwa karę punktową z walidacją punktów i limitu wystąpień.
- **Zakres:** Arkusz: nazwa, punkty (stepper 0,5), maks. wystąpień; walidacje; usuwanie z potwierdzeniem; toasty; **Poza zakresem:** –
- **Zależności:** [IMP-262](#imp-262--scr-org-06--zakładka-kryteria), [IMP-125](03-backend-konto-i-konfiguracja-turnieju.md#imp-125--kryteria-i-kary--crud-z-blokadą-po-starcie)
- **Odwołania:** FR-307, US-024, SCR-ORG-10, [TC-E2E-ORG-017](../03-test-plans/03-testy-e2e.md#tc-e2e-org-017)
- **Kroki:**
  1. Napisz `features/categories/PenaltySheet.tsx` („Nowa kara” / „Edytuj karę”): `TextField` „Nazwa kary” (placeholder „np. Upadek”), siatka `NumberField` „Punkty za 1 raz” (stepper 0,5, min. 0,5, domyślnie 1) i „Maks. wystąpień” (1–10, domyślnie 3).
  2. Waliduj schematem `PenaltyTypeInput`: nazwa 1–60, „Od 0,5 do 50 (co 0,5).”, „Od 1 do 10.”.
  3. Napisz mutacje `POST /v1/categories/{id}/penalty-types`, `PATCH /v1/penalty-types/{id}`, `DELETE /v1/penalty-types/{id}` z `invalidateQueries(['category', categoryId])`.
  4. Dodaj w edycji „Usuń karę” z drugim krokiem potwierdzenia i mapowanie `CRITERIA_LOCKED`, `LIMIT_EXCEEDED` (10).
  5. Pokaż toasty „Dodano karę”, „Zapisano karę”, „Usunięto karę” i dodaj przypadki w DevCatalog.
  6. Dopisz lub uruchom przypadki TC-E2E-ORG-017 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-264: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-017 przechodzi
  - [ ] Ekran zgodny z SCR-ORG-10 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** niskie

### IMP-265 – SCR-ORG-07 – zakładka Zawodniczki
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator przegląda listę startową z numerami, klubami i licznikiem ocen na żywo, wyszukuje zawodniczki bez wpisywania polskich znaków i wchodzi w edycję każdej pozycji.
- **Zakres:** „LISTA STARTOWA” + „Dodaj” (ukryte w Zakończona), wyszukiwarka od 15 pozycji (bez znaków diakrytycznych), wiersze z odznaką numeru, nazwiskiem (wielokropek), klubem, licznikiem i ikoną kompletu, wycofane na końcu z „Wycofana”, stan pusty, `FlashList` dla 300 pozycji, realtime; **Poza zakresem:** –
- **Zależności:** [IMP-261](#imp-261--scr-org-060708--rama-szczegółów-kategorii), [IMP-128](03-backend-konto-i-konfiguracja-turnieju.md#imp-128--zawodniczki-lista-z-licznikami-dodawanie-edycja)
- **Odwołania:** FR-401, FR-405, US-030, SCR-ORG-07, UI-15, [TC-E2E-ORG-019](../03-test-plans/03-testy-e2e.md#tc-e2e-org-019), [TC-E2E-ORG-022](../03-test-plans/03-testy-e2e.md#tc-e2e-org-022), [TC-EDGE-025](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-025)
- **Kroki:**
  1. Napisz `features/categories/tabs/EntriesTab.tsx` z `useEntries(categoryId, q)` (`GET /v1/categories/{id}/entries?q=`, klucz `['entries', categoryId, q]`, `placeholderData: keepPreviousData`).
  2. Zbuduj `SectionHeader` „LISTA STARTOWA” + ghost „Dodaj” → SCR-ORG-11 (ukryte w kategorii lub turnieju Zakończona) i pole wyszukiwania (`magnifying-glass`, „Szukaj po nazwisku, klubie lub numerze”, debounce 250 ms) widoczne od 15 pozycji.
  3. Renderuj wiersze w `FlashList` (min. 60 dp): `Badge number` 38 dp, nazwisko 15 dp z wielokropkiem (UI-15), klub 12 dp, licznik „{n}/{J}” z `check-circle` fill accent-300 (komplet) lub `circle-dashed` neutral-500, chevron → SCR-ORG-17.
  4. Pokaż wycofane na końcu z nazwiskiem neutral-500 i etykietą „Wycofana” zamiast licznika; pusta lista → „Lista startowa jest pusta.”.
  5. Podłącz realtime `scoresheet.accepted` (aktualizacja licznika wiersza w cache) i `config.changed` (`scope: entries`) → `invalidateQueries(['entries', categoryId])`.
  6. Dodaj przypadki „pusta / 300 pozycji / z wycofanymi / wyszukiwanie” w DevCatalog i pomiar Reassure dla 300 wierszy.
  7. Dopisz lub uruchom przypadki TC-E2E-ORG-019, TC-E2E-ORG-022, TC-EDGE-025 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-265: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-019 (lista), TC-E2E-ORG-022, TC-EDGE-025 (organizator) przechodzą
  - [ ] Ekran zgodny z SCR-ORG-07 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-266 – SCR-ORG-11 – nowa zawodniczka
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator dodaje zawodniczkę z podpowiedzianym wolnym numerem, a dla niepełnoletniej musi potwierdzić zgodę opiekuna; może dodawać kolejne bez zamykania arkusza.
- **Zakres:** Arkusz: nr startowy z podpowiedzią (TC-STATE-015), imię i nazwisko, klub, rok urodzenia, przełącznik zgody opiekuna przy wieku < 18, „Dodaj do listy”, „Dodaj kolejną”, błąd `START_NUMBER_TAKEN` pod polem; **Poza zakresem:** –
- **Zależności:** [IMP-265](#imp-265--scr-org-07--zakładka-zawodniczki)
- **Odwołania:** FR-402, FR-406, US-031, US-033, SCR-ORG-11, [TC-STATE-015](../03-test-plans/01-testy-jednostkowe.md#tc-state-015), [TC-E2E-ORG-019](../03-test-plans/03-testy-e2e.md#tc-e2e-org-019), [TC-E2E-ORG-020](../03-test-plans/03-testy-e2e.md#tc-e2e-org-020)
- **Kroki:**
  1. Napisz `features/entries/NewEntrySheet.tsx` („Nowa zawodniczka”): siatka 96 dp + reszta (`NumberField` „Nr startowy” z podpowiedzią i `TextField` „Imię i nazwisko”), „Klub / szkoła”, „Rok urodzenia (opcjonalnie)”.
  2. Napisz selektor `suggestStartNumber(entries)` (najmniejszy wolny numer większy od maks. w kategorii) i wstawiaj go jako wartość domyślną.
  3. Pokaż przełącznik „Mam zgodę rodzica/opiekuna na przetwarzanie danych”, gdy z roku urodzenia wynika wiek < 18; waliduj schematem `EntryCreate` („Potwierdź zgodę opiekuna.”, „Podaj imię i nazwisko.”, numer 1–9999, rok 1920–bieżący).
  4. Napisz mutację `useCreateEntry()` (`POST /v1/categories/{id}/entries`, `Idempotency-Key`); `START_NUMBER_TAKEN` → pod polem „Numer {nr} jest już zajęty.”, `CATEGORY_LOCKED` → toast z katalogu.
  5. Po sukcesie `invalidateQueries(['entries', categoryId])`, `['category', categoryId]`, toast „Dodano zawodniczkę”; primary „Dodaj do listy” zamyka arkusz, ghost „Dodaj kolejną” czyści pola i podpowiada kolejny numer.
  6. Dodaj przypadki „pusty / niepełnoletnia / numer zajęty” w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-STATE-015, TC-E2E-ORG-019, TC-E2E-ORG-020 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-266: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-STATE-015, TC-E2E-ORG-019, TC-E2E-ORG-020 przechodzą
  - [ ] Ekran zgodny z SCR-ORG-11 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-267 – SCR-ORG-17 – edycja, wycofanie, usunięcie, „Usuń dane osobowe”
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator poprawia dane zawodniczki, wycofuje ją lub przywraca, usuwa pozycję bez ocen albo na prośbę zawodniczki usuwa jej dane osobowe, także w turnieju zakończonym.
- **Zakres:** Arkusz edycji (pola jak SCR-ORG-11), „Wycofaj zawodniczkę”/„Przywróć zawodniczkę”, „Usuń z listy” (bez ocen), „Usuń dane osobowe” (po ocenach; także w turnieju Zakończona – TL-17), teksty potwierdzeń; **Poza zakresem:** –
- **Zależności:** [IMP-266](#imp-266--scr-org-11--nowa-zawodniczka), [IMP-129](03-backend-konto-i-konfiguracja-turnieju.md#imp-129--zawodniczki-wycofanie-przywrócenie-usunięcie), [IMP-177](05-backend-eksport-audyt-rodo.md#imp-177--usuń-dane-osobowe-zawodniczki)
- **Odwołania:** FR-403, FR-404, FR-904, US-032, US-091, SCR-ORG-17, [TC-E2E-ORG-021](../03-test-plans/03-testy-e2e.md#tc-e2e-org-021), [TC-E2E-ORG-034](../03-test-plans/03-testy-e2e.md#tc-e2e-org-034)
- **Kroki:**
  1. Napisz `features/entries/EditEntrySheet.tsx` („Edytuj zawodniczkę”) z polami jak `NewEntrySheet` i wartościami z `['entries', categoryId, …]`; mutacja `PATCH /v1/entries/{id}` (`If-Match`), toast „Zapisano zmiany”.
  2. W kategorii Zakończona lub turnieju Zakończona zablokuj numer startowy, a dane osobowe pozostaw edytowalne (TL-17).
  3. Dodaj secondary „Wycofaj zawodniczkę” (`user-minus`) z drugim krokiem „Wycofać {imię i nazwisko}? Zniknie z kolejki sędziów i z rankingu. Oceny zostaną zachowane.” (`POST …/withdraw`) i „Przywróć zawodniczkę” (`POST …/restore`).
  4. Dodaj ghost „Usuń z listy” (tylko `judged.done === 0`, `DELETE /v1/entries/{id}`, `HAS_SCORES` → toast) albo „Usuń dane osobowe” (po ocenach) z drugim krokiem „Usunąć dane osobowe? W wynikach pozostanie „Zawodniczka nr {nr}”. Tej operacji nie można cofnąć.” (`POST …/anonymize`).
  5. Po każdej akcji unieważnij `['entries', categoryId]`, `['results', categoryId]`, `['category', categoryId]` i zamknij arkusz.
  6. Dodaj przypadki „aktywna / wycofana / po ocenach / turniej zakończony” w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-E2E-ORG-021, TC-E2E-ORG-034 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-267: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-021, TC-E2E-ORG-034 przechodzą
  - [ ] Ekran zgodny z SCR-ORG-17 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-268 – SCR-ORG-08 – zakładka Wyniki (ranking na żywo)
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator obserwuje ranking kategorii na żywo z miejscami, wynikami w formacie z API, liczbą ocen i objaśnieniem remisów, a zmiany kolejności animują się bez skoku przewijania.
- **Zakres:** „RANKING NA ŻYWO”, wiersze z miejscem (top 3 accent-300, „–” bez ocen), nazwiskiem, `display` z API, „#{nr} · {klub}”, „{n}/{J} sędziów”/„brak ocen”, pasek, pigułka „wstępny”, wycofane na końcu, objaśnienie z nazwą kryterium (`tieBreakSentence`), animacja zmiany kolejności 200 ms bez skoku przewinięcia, realtime `results.updated` → refetch; **Poza zakresem:** SCR-ORG-19 (IMP-269)
- **Zależności:** [IMP-261](#imp-261--scr-org-060708--rama-szczegółów-kategorii), [IMP-151](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-151--wyniki-endpointy-rankingu-kategorii-i-turnieju), [IMP-216](06-mobile-fundamenty-i-design-system.md#imp-216--klient-realtime-z-fallbackiem-na-odpytywanie)
- **Odwołania:** FR-701, FR-702, FR-703, FR-704, US-070, US-071, US-072, SCR-ORG-08, UI-01, [TC-E2E-ORG-023](../03-test-plans/03-testy-e2e.md#tc-e2e-org-023), [TC-DESIGN-001](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-001)
- **Kroki:**
  1. Napisz `features/categories/tabs/ResultsTab.tsx` z `useResults(categoryId)` (`GET /v1/categories/{id}/results`, klucz `['results', categoryId]`, `If-None-Match` z `resultsVersion`).
  2. Zbuduj kicker „RANKING NA ŻYWO” i `GroupedList` wierszy: miejsce 26 dp (top 3 z ocenami accent-300, pozostałe neutral-500, bez ocen „–” – G-31), nazwisko + `display` (17 dp/500) albo „—”, „#{nr} · {klub}” + „{n}/{J} sędziów” albo „brak ocen”, `ProgressBar` 3 dp (`barRatio`, 1. miejsce accent, reszta accent-700).
  3. Dodaj pigułkę `provisional` „wstępny” przy `isProvisional`, wycofane na końcu z etykietą „Wycofana” i wiersze kategorii W przygotowaniu („—”, „brak ocen”, „–” – UI-01).
  4. Dodaj pod listą `info` + „Wynik = średnia sędziów z (kryterium × waga − kary). Remis rozstrzyga …” z `tieBreakSentence(tieBreak.criterionName)`.
  5. Podłącz realtime `results.updated` → `refetch` tylko gdy zakładka jest widoczna (`useIsFocused`), z ignorowaniem starszych `resultsVersion`.
  6. Animuj zmianę kolejności `LinearTransition.duration(200)` (Reanimated `Layout`) z zachowaniem pozycji przewinięcia (`maintainVisibleContentPosition`).
  7. Dodaj tapnięcie wiersza z ocenami → SCR-ORG-19 i przypadki „W przygotowaniu / na żywo / zablokowana z wstępnymi” w DevCatalog.
  8. Dopisz lub uruchom przypadki TC-E2E-ORG-023, TC-DESIGN-001 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  9. Otwórz PR `IMP-268: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-023, TC-DESIGN-001 przechodzą
  - [ ] Ekran zgodny z SCR-ORG-08 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** średnie

### IMP-269 – SCR-ORG-19 – oceny zawodniczki
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator sprawdza, jak ocenił każdy sędzia (noty, kary, komentarz, ocena offline) i jak ocena zmieniała się w czasie.
- **Zakres:** Arkusz z podsumowaniem, kartami sędziów (wynik, noty w 2 kolumnach, kary, komentarz, tag „offline”), „Historia zmian ({n})” z rozwinięciem; **Poza zakresem:** –
- **Zależności:** [IMP-268](#imp-268--scr-org-08--zakładka-wyniki-ranking-na-żywo), [IMP-152](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-152--oceny-zawodniczki-i-historia-rewizji-dla-organizatora)
- **Odwołania:** FR-707, FR-902, US-074, SCR-ORG-19, [TC-E2E-ORG-024](../03-test-plans/03-testy-e2e.md#tc-e2e-org-024)
- **Kroki:**
  1. Napisz `features/results/EntryScoresSheet.tsx` z `useEntryScoreSheets(entryId)` (`GET /v1/entries/{id}/score-sheets`, klucz `['scoreSheets', entryId]`).
  2. Zbuduj nagłówek: `Badge number` 38 dp, nazwisko 17 dp/500, klub, podsumowanie „Wynik {x} · miejsce {r} · {n}/{J} sędziów”.
  3. Renderuj kartę na sędziego: `Avatar` 28 dp, imię i nazwisko, wynik 17 dp/500 albo „brak oceny”, tag „offline” (`authMode === 'OFFLINE_PIN'`), noty „{kryterium} {nota} ×{waga}” w dwóch kolumnach, kary „{kara} ×{n} (−{pkt})”, komentarz kursywą w cudzysłowie.
  4. Dodaj ghost „Historia zmian ({liczba rewizji})” rozwijający listę „rew. {k} · {czas} · {wynik}” z `useRevisions(scoreSheetId)` (`GET /v1/score-sheets/{id}/revisions`, ładowane przy rozwinięciu).
  5. Podłącz `scoresheet.accepted` dla tej zawodniczki → `invalidateQueries(['scoreSheets', entryId])` i dodaj przypadki w DevCatalog.
  6. Dopisz lub uruchom przypadki TC-E2E-ORG-024 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-269: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-024 przechodzi
  - [ ] Ekran zgodny z SCR-ORG-19 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-270 – SCR-ORG-12 – podgląd i pobranie PDF
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator ogląda podgląd wyników turnieju lub kategorii i pobiera wygenerowany na serwerze PDF, który może od razu udostępnić.
- **Zakres:** Arkusz 86% z podglądem (zakres turniej/kategoria z danych `results`), „Pobierz PDF” → `POST /exports` → odpytywanie 1 s (maks. 30 s) → pobranie (`expo-file-system`) → `expo-sharing`, stany „Generowanie…”, błąd, offline; **Poza zakresem:** CSV (IMP-174)
- **Zależności:** [IMP-206](06-mobile-fundamenty-i-design-system.md#imp-206--komponent-sheet-bottom-sheet--implementacja-własna), [IMP-171](05-backend-eksport-audyt-rodo.md#imp-171--eksporty-api-zleceń-i-linki-s3), [IMP-268](#imp-268--scr-org-08--zakładka-wyniki-ranking-na-żywo)
- **Odwołania:** FR-705, FR-706, US-073, SCR-ORG-12, [TC-E2E-ORG-025](../03-test-plans/03-testy-e2e.md#tc-e2e-org-025)
- **Kroki:**
  1. Napisz `features/exports/PdfPreviewSheet.tsx` (`Sheet` 86%, tytuł „Podgląd PDF”) z kartą podglądu: nagłówek z `trophy`, nazwą turnieju i „{data} · {miejsce}”.
  2. Dla zakresu turniej renderuj sekcje kategorii z `useTournamentResults(id)` (`GET /v1/tournaments/{id}/results`, klucz `['tournamentResults', id]`); dla kategorii – „{kategoria} · {status}” i tabelę „#”, „Zawodniczka”, „Wynik” z klubem pod nazwiskiem.
  3. Napisz `useExportPdf()`: `POST /v1/exports` → odpytywanie `GET /v1/exports/{id}` co 1 s (maks. 30 s) → `FileSystem.downloadAsync` do `cacheDirectory` → `Sharing.shareAsync` (`mimeType: application/pdf`).
  4. Ustaw stopkę arkusza z primary 48 dp „Pobierz PDF” (`download-simple`) i stanami: „Generowanie…” ze spinnerem (nieaktywny), sukces → toast „PDF zapisany”, błąd lub przekroczenie 30 s → toast „Nie udało się wygenerować PDF. Spróbuj ponownie.”.
  5. Offline ustaw przycisk jako nieaktywny z podpisem „Eksport wymaga połączenia z internetem.”.
  6. Usuń pobrany plik z cache po zamknięciu arkusza udostępniania i dodaj przypadki w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-E2E-ORG-025 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-270: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-025 przechodzi
  - [ ] Ekran zgodny z SCR-ORG-12 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** średnie

### IMP-271 – SCR-ORG-18 – ostrzeżenie przed blokadą
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Przed zablokowaniem kategorii z brakami organizator widzi, ilu ocen brakuje i które tablety mają zaległości, i świadomie decyduje, czy zablokować mimo to.
- **Zakres:** Arkusz potwierdzenia z „Brakuje {n} ocen…”, listą urządzeń z zaległościami, podpowiedzią i przyciskami „Zablokuj mimo to” / „Anuluj”; **Poza zakresem:** –
- **Zależności:** [IMP-261](#imp-261--scr-org-060708--rama-szczegółów-kategorii), [IMP-206](06-mobile-fundamenty-i-design-system.md#imp-206--komponent-sheet-bottom-sheet--implementacja-własna)
- **Odwołania:** FR-309, US-026, SCR-ORG-18, [TC-STATE-013](../03-test-plans/01-testy-jednostkowe.md#tc-state-013), [TC-E2E-ORG-026](../03-test-plans/03-testy-e2e.md#tc-e2e-org-026)
- **Kroki:**
  1. Napisz `features/categories/LockWarningsSheet.tsx` (`ConfirmSheet` z ikoną `lock-simple`, tytuł „Zablokować kategorię?”) otwierany z treścią błędu `LOCK_WARNINGS` (schemat `LockWarnings`).
  2. Pokaż „Brakuje {n} ocen. Wyniki zostaną zapisane jako ostateczne.” (gdy `missingSheets > 0`) i listę urządzeń: „{nazwa} – {n} niewysłane oceny” (`devicesWithPending`) / „{nazwa} – offline od {czas}” (`offlineDevices`, czas względny z i18n).
  3. Dodaj podpowiedź 12 dp neutral-400 „Poczekaj, aż tablety się zsynchronizują, albo zablokuj teraz – późniejsze oceny trafią do „Odrzucone oceny”.”.
  4. Podłącz primary „Zablokuj mimo to” → `useLockCategory({ force: true })` (toast „Kategoria zakończona”) i secondary „Anuluj”; aktualizuj listę na żywo z `device.status`.
  5. Dopisz lub uruchom przypadki TC-STATE-013, TC-E2E-ORG-026 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  6. Dodaj stany do DevCatalog lub zrzuty ekranu (telefon/tablet, iOS/Android) do PR; sprawdź etykiety a11y i skalowanie tekstu.
  7. Otwórz PR `IMP-271: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-STATE-013, TC-E2E-ORG-026 przechodzą
  - [ ] Ekran zgodny z SCR-ORG-18 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-272 – SCR-ORG-22 – odrzucone oceny
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator przegląda oceny, które dotarły po blokadzie lub zostały odrzucone, i dla każdej decyduje: przyjąć (po odblokowaniu kategorii) albo odrzucić.
- **Zakres:** Arkusz z tekstem objaśniającym, wierszami (sędzia → zawodniczka, kategoria · powód, czas, wynik), „Przyjmij” (nieaktywny przy zablokowanej kategorii, komunikaty warunków), „Odrzuć” z potwierdzeniem, stan pusty; wejście z banerów SCR-ORG-03 i SCR-ORG-06…08; **Poza zakresem:** –
- **Zależności:** [IMP-261](#imp-261--scr-org-060708--rama-szczegółów-kategorii), [IMP-149](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-149--odrzucone-zgłoszenia-zapis-lista-przyjęcie-odrzucenie)
- **Odwołania:** FR-805, US-083, SCR-ORG-22, [TC-E2E-ORG-027](../03-test-plans/03-testy-e2e.md#tc-e2e-org-027)
- **Kroki:**
  1. Napisz `features/rejected/RejectedSheet.tsx` (tytuł „Odrzucone oceny”) z `useRejected(tournamentId)` (`GET /v1/tournaments/{id}/rejected-submissions?resolution=PENDING`, klucz `['rejected', tournamentId]`), opcjonalnie filtrowane po `categoryId`.
  2. Dodaj tekst objaśniający „Te oceny dotarły po zablokowaniu kategorii. Aby przyjąć ocenę, najpierw odblokuj kategorię.” i wiersze: „{sędzia} → #{nr} {zawodniczka}”, „{kategoria} · {powód}” (klucze `rejection.reason.*`), „wysłano {czas}”, wynik z treści.
  3. Dodaj ghost „Przyjmij” (nieaktywny przy kategorii zablokowanej) → `POST /v1/rejected-submissions/{id}/accept`; mapuj `CATEGORY_LOCKED`, `ENTRY_WITHDRAWN`, `TOURNAMENT_FINISHED` na toasty błędu, `newerSheetExists` na ostrzeżenie w drugim kroku.
  4. Dodaj ghost „Odrzuć” (neutral-300) z drugim krokiem potwierdzenia → `POST …/discard`.
  5. Po każdej decyzji unieważnij `['rejected', tournamentId]`, `['tournament', tournamentId]`, `['category', categoryId]`, `['results', categoryId]`; stan pusty „Brak odrzuconych ocen.”.
  6. Podłącz `rejected.created` → `invalidateQueries(['rejected', tournamentId])` i dodaj przypadki w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-E2E-ORG-027 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-272: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-027 przechodzi
  - [ ] Ekran zgodny z SCR-ORG-22 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-273 – SCR-ORG-14 – sędziowie i urządzenia
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator w jednym ekranie zarządza sędziami (stan, liczba ocen, blokada PIN) i widzi tablety na żywo (online, zalogowany sędzia, niewysłane oceny, bateria), a stąd paruje nowe tablety.
- **Zakres:** Segmenty „Sędziowie {n}”/„Urządzenia {n}”, wiersze sędziów (awatar, stan „Aktywny · {n} ocen”/„PIN zablokowany”/„Nieaktywny”), wiersze urządzeń (online/offline od, sędzia, niewysłane, bateria), stany puste, „Sparuj tablet” w pasku (ukryty w Zakończona), aktualizacje `device.status`; **Poza zakresem:** –
- **Zależności:** [IMP-209](06-mobile-fundamenty-i-design-system.md#imp-209--segmentedcontrol-stickyactionbar-screenheaderbacklink-kontenery-ekranów), [IMP-130](03-backend-konto-i-konfiguracja-turnieju.md#imp-130--sędziowie-lista-dodanie-z-pin-em-i-weryfikatorami-edycja-dezaktywacja-usunięcie), [IMP-141](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-141--urządzenia-parowanie-token-lista-nazwa-unieważnienie), [IMP-216](06-mobile-fundamenty-i-design-system.md#imp-216--klient-realtime-z-fallbackiem-na-odpytywanie)
- **Odwołania:** FR-501, FR-505, US-040, US-044, SCR-ORG-14, [TC-E2E-ORG-031](../03-test-plans/03-testy-e2e.md#tc-e2e-org-031)
- **Kroki:**
  1. Napisz `app/(org)/judges/[tournamentId].tsx` i `features/judges/JudgesDevicesScreen.tsx`: `BackLink` „‹ Turniej”, tytuł „Sędziowie i urządzenia”, `SegmentedControl` „Sędziowie {n}” / „Urządzenia {n}”.
  2. Zbuduj zakładkę sędziów z `useJudges(tournamentId)` (`GET /v1/tournaments/{id}/judges`, `['judges', id]`): `SectionHeader` „SĘDZIOWIE” + „Dodaj” → SCR-ORG-15, wiersze 60 dp z `Avatar` 38 dp, stanem „Aktywny · {n} ocen” / „PIN zablokowany” (accent-300, `lock-simple`) / „Nieaktywny”, chevron; pusta → „Dodaj sędziów, aby móc rozpocząć kategorie.”.
  3. Zbuduj zakładkę urządzeń z `useDevices(tournamentId)` (`GET /v1/tournaments/{id}/devices`, `['devices', id]`): kafelek `device-tablet`, nazwa, „Online · {sędzia}” / „Online · nikt nie jest zalogowany” / „Offline od {czas}” + „· {n} niewysłane oceny”, ikona `battery-*` z %; pusta → „Brak sparowanych tabletów.”.
  4. Dodaj `StickyActionBar` z primary „Sparuj tablet” (`qr-code`) → SCR-ORG-16 (ukryty w turnieju Zakończona).
  5. Podłącz realtime: `device.status` i `device.paired` → aktualizacja `['devices', id]` w cache, `judges.changed` → `invalidateQueries(['judges', id])`; odświeżaj czas „offline od” co 30 s.
  6. Dodaj przypadki „puste / mieszane stany / PIN zablokowany” w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-E2E-ORG-031 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-273: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-031 przechodzi
  - [ ] Ekran zgodny z SCR-ORG-14 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** niskie

### IMP-274 – SCR-ORG-15 – sędzia (nowy z PIN-em, edycja, reset, aktywność, usunięcie)
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator dodaje sędziego i jednorazowo widzi jego PIN do przekazania, edytuje dane, resetuje PIN, dezaktywuje lub usuwa sędziego bez ocen.
- **Zakres:** Arkusz nowego sędziego → krok PIN (4 cyfry, „Kopiuj” → toast „Skopiowano PIN”, ostrzeżenie), edycja (nazwa, inicjały), „Resetuj PIN” z potwierdzeniem → krok PIN, „Dezaktywuj/Aktywuj”, „Usuń sędziego” (bez ocen); PIN nie trafia do cache ani logów; **Poza zakresem:** –
- **Zależności:** [IMP-273](#imp-273--scr-org-14--sędziowie-i-urządzenia), [IMP-131](03-backend-konto-i-konfiguracja-turnieju.md#imp-131--reset-pin-u-sędziego), [IMP-206](06-mobile-fundamenty-i-design-system.md#imp-206--komponent-sheet-bottom-sheet--implementacja-własna)
- **Odwołania:** FR-502, FR-503, US-040, US-041, US-042, SCR-ORG-15, [TC-E2E-ORG-028](../03-test-plans/03-testy-e2e.md#tc-e2e-org-028), [TC-E2E-ORG-029](../03-test-plans/03-testy-e2e.md#tc-e2e-org-029)
- **Kroki:**
  1. Napisz `features/judges/JudgeSheet.tsx` („Nowy sędzia”: `TextField` „Imię i nazwisko”, primary „Dodaj sędziego”) z mutacją `POST /v1/tournaments/{id}/judges` i błędem `JUDGE_NAME_TAKEN` pod polem („Sędzia o tym imieniu i nazwisku już istnieje.”).
  2. Napisz krok `PinRevealStep`: „PIN dla {imię i nazwisko}”, karta z 4 cyframi (40 dp/500, accent-200, odstęp 16), ghost „Kopiuj” (`copy`, `expo-clipboard`, toast „Skopiowano PIN”), ostrzeżenie „Zapisz PIN – nie będzie można go ponownie wyświetlić.”, primary „Gotowe”.
  3. Trzymaj PIN tylko w stanie komponentu (bez `setQueryData`, bez persystencji MMKV, bez logów i breadcrumbów Sentry) i czyść go po zamknięciu arkusza.
  4. Dodaj tryb edycji („Edytuj sędziego”: „Imię i nazwisko”, „Inicjały” maks. 3, primary „Zapisz zmiany” → `PATCH /v1/judges/{id}`) i secondary „Dezaktywuj sędziego” / „Aktywuj sędziego” (`isActive`).
  5. Dodaj secondary „Resetuj PIN” (`key`) z drugim krokiem „Zresetować PIN? Sędzia zostanie wylogowany ze wszystkich tabletów.” → `POST /v1/judges/{id}/pin/reset` → `PinRevealStep`.
  6. Dodaj ghost „Usuń sędziego” (tylko `sheetCount === 0`, `DELETE`, `HAS_SCORES` → toast) i po każdej akcji `invalidateQueries(['judges', tournamentId])`, `['tournament', tournamentId]`.
  7. Dopisz lub uruchom przypadki TC-E2E-ORG-028, TC-E2E-ORG-029 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Dodaj stany do DevCatalog lub zrzuty ekranu (telefon/tablet, iOS/Android) do PR; sprawdź etykiety a11y i skalowanie tekstu.
  9. Otwórz PR `IMP-274: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-028, TC-E2E-ORG-029 przechodzą
  - [ ] Ekran zgodny z SCR-ORG-15 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-275 – SCR-ORG-16 – parowanie tabletu
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator pokazuje kod parowania jako QR i tekst z odliczaniem ważności i od razu widzi tablety, które się sparowały.
- **Zakres:** Arkusz z instrukcją, kartą QR (jasne tło – `react-native-qrcode-svg`), kodem „XXXX-XXXX”, odliczaniem, listą „Sparowane teraz” (`device.paired`), stanem wygaśnięcia i „Nowy kod”; **Poza zakresem:** –
- **Zależności:** [IMP-273](#imp-273--scr-org-14--sędziowie-i-urządzenia), [IMP-140](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-140--kody-parowania)
- **Odwołania:** FR-504, US-043, SCR-ORG-16, [TC-E2E-ORG-030](../03-test-plans/03-testy-e2e.md#tc-e2e-org-030), [TC-DESIGN-025](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-025)
- **Kroki:**
  1. Napisz `features/devices/PairTabletSheet.tsx` („Sparuj tablet”) z instrukcją „1. Otwórz PoleChamp na tablecie i wybierz „Tablet sędziowski”. 2. Zeskanuj kod lub wpisz go ręcznie.”.
  2. Napisz mutację `useCreatePairingCode()` (`POST /v1/tournaments/{id}/pairing-codes`) wywoływaną przy otwarciu arkusza i przy „Nowy kod”.
  3. Renderuj kartę QR 200×200 dp `react-native-qrcode-svg` z `qrPayload` na jasnym tle neutral-100 i modułach neutral-900 (wyjątek kolorystyczny) oraz kod „K7QM-4ZTX” (28 dp/500, tabelaryczny, odstęp liter 0,1 em).
  4. Dodaj odliczanie „Kod ważny jeszcze {mm:ss}” z `expiresAt`; po wygaśnięciu przygaś kod, pokaż „Kod wygasł.” i aktywuj secondary „Nowy kod”.
  5. Dodaj listę „Sparowane teraz” zasilaną zdarzeniem `device.paired` (filtr po czasie otwarcia arkusza) i primary „Gotowe” (zamknięcie + `invalidateQueries(['devices', id])`).
  6. Ustaw `expo-keep-awake` na czas otwarcia arkusza i dodaj przypadki „aktywny / wygasły / z nowymi tabletami” w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-E2E-ORG-030, TC-DESIGN-025 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-275: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-030 (część organizatora), TC-DESIGN-025 przechodzą
  - [ ] Ekran zgodny z SCR-ORG-16 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-276 – Akcje urządzenia: zmiana nazwy i odłączenie
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator zmienia nazwę tabletu lub odłącza go od turnieju, wiedząc, ile niewysłanych ocen przepadnie.
- **Zakres:** Arkusz akcji z wiersza urządzenia: „Zmień nazwę”, „Odłącz urządzenie” z potwierdzeniem i liczbą niewysłanych ocen; **Poza zakresem:** –
- **Zależności:** [IMP-273](#imp-273--scr-org-14--sędziowie-i-urządzenia)
- **Odwołania:** FR-505, US-044, SCR-ORG-14, [TC-E2E-ORG-030](../03-test-plans/03-testy-e2e.md#tc-e2e-org-030)
- **Kroki:**
  1. Napisz `features/devices/DeviceActionsSheet.tsx` otwierany z wiersza urządzenia w SCR-ORG-14 z akcjami „Zmień nazwę” i „Odłącz urządzenie”.
  2. Dodaj formularz nazwy (`TextField`, ≤ 60) z mutacją `PATCH /v1/devices/{id}` i toastem „Zapisano zmiany”.
  3. Dodaj drugi krok odłączenia „Odłączyć „{nazwa}”? Niewysłane oceny ({n}) nie dotrą do systemu.” → `DELETE /v1/devices/{id}`.
  4. Po sukcesie `invalidateQueries(['devices', tournamentId])` i zamknięcie arkusza; dodaj przypadki w DevCatalog.
  5. Dopisz lub uruchom przypadki TC-E2E-ORG-030 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-276: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-030 (odłączenie) przechodzi
  - [ ] Ekran zgodny z SCR-ORG-14 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

### IMP-277 – SCR-ORG-21 – konto
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Organizator widzi swoje konto, dokumenty prawne i wersję aplikacji, wylogowuje się (z wyczyszczeniem danych) i może usunąć konto po wpisaniu „USUŃ”.
- **Zakres:** Karta profilu ze stanem weryfikacji, lista dokumentów (linki z `app-config`), wersja aplikacji, „Wyloguj się” (unieważnienie, czyszczenie cache MMKV i SecureStore), „Usuń konto” z wpisaniem „USUŃ” i obsługą `ACTIVE_TOURNAMENT_EXISTS`; **Poza zakresem:** –
- **Zależności:** [IMP-250](#imp-250--scr-org-13--logowanie-i-sesja-organizatora), [IMP-118](03-backend-konto-i-konfiguracja-turnieju.md#imp-118--profil-i-usunięcie-konta), [IMP-120](03-backend-konto-i-konfiguracja-turnieju.md#imp-120--konfiguracja-aplikacji-i-minimalna-wersja)
- **Odwołania:** FR-105, FR-106, FR-903, US-003, SCR-ORG-21, TL-22, [TC-E2E-ORG-004](../03-test-plans/03-testy-e2e.md#tc-e2e-org-004), [TC-E2E-ORG-033](../03-test-plans/03-testy-e2e.md#tc-e2e-org-033)
- **Kroki:**
  1. Napisz `app/(org)/account.tsx` i `features/account/AccountScreen.tsx` z `useMe()` (`GET /v1/me`, `['me']`) i `useAppConfig()` (`['appConfig']`): `BackLink` „‹ Turnieje”, tytuł „Konto”, karta z nazwą, e-mailem i pigułką „Zweryfikowany” albo linkiem „Zweryfikuj e-mail”.
  2. Dodaj `GroupedList`: „Regulamin”, „Polityka prywatności”, „Umowa powierzenia danych”, „Pomoc i kontakt” (adresy z `legal.*`, `expo-web-browser`) i „Wersja aplikacji {x.y.z}”.
  3. Dodaj secondary „Wyloguj się” (`sign-out`): `POST /v1/auth/logout`, `orgSession.clear()` (SecureStore), `queryClient.clear()`, usunięcie persystencji MMKV, rozłączenie WS, przejście do SCR-ORG-13.
  4. Dodaj ghost neutral-300 „Usuń konto” → drugi krok z polem do wpisania „USUŃ” (przycisk aktywny dopiero po zgodności) → `DELETE /v1/me`.
  5. Mapuj `ACTIVE_TOURNAMENT_EXISTS` na „Najpierw zakończ trwający turniej.”; sukces → wylogowanie jak wyżej i komunikat o usunięciu po 30 dniach.
  6. Dodaj przypadki „zweryfikowany / niezweryfikowany / potwierdzenie usunięcia” w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-E2E-ORG-004, TC-E2E-ORG-033 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-277: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-004 (wylogowanie), TC-E2E-ORG-033 przechodzą
  - [ ] Ekran zgodny z SCR-ORG-21 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-278 – Tryb offline organizatora na wszystkich ekranach
- **Epik / obszar:** EP-07 Mobile – ekrany organizatora | **Rola:** MOB
- **Cel:** Bez połączenia organizator nadal przegląda wszystkie ekrany z cache, widzi baner offline, a żadna akcja zapisu nie jest dostępna, dopóki sieć nie wróci.
- **Zakres:** Przegląd wszystkich akcji zapisu (przyciski, „Dodaj”, arkusze) – podłączenie `useCanWrite()`, baner pod nawigacją, stany cache; test E2E w trybie samolotowym; **Poza zakresem:** Kolejka zapisów offline (v1.1)
- **Zależności:** [IMP-215](06-mobile-fundamenty-i-design-system.md#imp-215--tanstack-query-cache-mmkv-i-tryb-offline-organizatora), [IMP-257](#imp-257--scr-org-03--szczegóły-turnieju), [IMP-261](#imp-261--scr-org-060708--rama-szczegółów-kategorii), [IMP-273](#imp-273--scr-org-14--sędziowie-i-urządzenia)
- **Odwołania:** FR-807, US-084, [TC-E2E-ORG-032](../03-test-plans/03-testy-e2e.md#tc-e2e-org-032)
- **Kroki:**
  1. Przejrzyj wszystkie przyciski i wejścia do arkuszy zapisu w `features/**` (np. „+”, „Dodaj”, „Rozpocznij…”, „Zakończ…”, „Zapisz”, „Usuń…”) i podłącz `disabled={!useCanWrite()}` (opacity 0,45).
  2. Upewnij się, że `OfflineBanner` („Brak połączenia — dane mogą być nieaktualne. Zmiany są niedostępne.”) jest w `ScreenContainer` każdego ekranu organizatora pod wierszem nawigacji.
  3. Zamykaj otwarte arkusze zapisu przy utracie sieci z zachowaniem wpisanych wartości (stan formularza w pamięci do ponownego otwarcia).
  4. Po odzyskaniu połączenia wywołaj `queryClient.invalidateQueries()` dla aktywnych ekranów i ponownie połącz WS.
  5. Dodaj scenariusz Maestro w trybie samolotowym (lista → turniej → kategoria → próba dodania) i przypadki z banerem w DevCatalog.
  6. Dopisz lub uruchom przypadki TC-E2E-ORG-032 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-278: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-032 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

