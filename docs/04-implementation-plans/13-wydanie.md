# EP-13 – Wydanie i pilotaż

> Dokument: `04-implementation-plans/13-wydanie.md` · Tech Lead (Agent 2) · 23.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md)

Sklepy (App Store, Google Play), przegląd aplikacji (usuwanie konta w aplikacji – App Store 5.1.1(v), turniej do przeglądu – TL-40), lista kontrolna wydania, uruchomienie produkcji, wsparcie pilotażowego turnieju i instrukcja dla organizatorów. Zależności zewnętrzne (konta deweloperskie, dostęp produkcyjny SES, treść dokumentów prawnych) – [99-przekazanie-dla-pm.md §7](99-przekazanie-dla-pm.md#7-zależności-zewnętrzne).

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 8 | 46 h | MOB 10 · FULL 12 · DEVOPS 12 · QA 6 · DESIGN 6 |


## Zadania

### IMP-550 – Konta i rekordy aplikacji w App Store Connect i Google Play
- **Epik / obszar:** EP-13 Wydanie i pilotaż | **Rola:** MOB
- **Cel:** Aplikacja ma rekordy w App Store Connect i Google Play z podpisywaniem przez EAS i ścieżkami testowymi gotowymi do dystrybucji pilotażowej.
- **Zakres:** Rekordy aplikacji (identyfikator `app.polechamp`), wsparcie iPhone + iPad, kategorie, podpisywanie przez EAS credentials, grupy testerów TestFlight, ścieżki Play (internal → closed → production); **Poza zakresem:** Konta deweloperskie (PM – zależność)
- **Zależności:** [IMP-022](01-fundamenty-i-devops.md#imp-022--eas-profile-kanały-runtimeversion-poświadczenia)
- **Odwołania:** ADR-007, R-12
- **Kroki:**
  1. Utwórz rekord aplikacji w App Store Connect (`app.polechamp`, iPhone + iPad, kategoria „Sport”/„Narzędzia”, język PL) i w Google Play Console (nazwa, kategoria, kraj docelowy).
  2. Podłącz poświadczenia EAS (`eas credentials`) i klucz App Store Connect API do `eas submit`; w Play – konto usługi z uprawnieniem publikacji.
  3. Utwórz grupy testerów TestFlight (wewnętrzna, pilotaż) i ścieżki Play (internal → closed → production).
  4. Zapisz identyfikatory i dostępy w menedżerze haseł zespołu i opisz konfigurację w `ops/runbooks/store-setup.md`.
  5. Otwórz PR `IMP-550: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Build preview dostępny w TestFlight i Play internal
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-551 – Wpisy w sklepach (PL)
- **Epik / obszar:** EP-13 Wydanie i pilotaż | **Rola:** DESIGN
- **Cel:** Strony aplikacji w sklepach mają po polsku opis, zrzuty telefonu i tabletu oraz wymagane linki, gotowe do pierwszego zgłoszenia.
- **Zakres:** Opis PL, słowa kluczowe, zrzuty telefonu i tabletu (z danych demo), URL polityki prywatności i wsparcia, klasyfikacja wiekowa (aplikacja nie dla dzieci); **Poza zakresem:** –
- **Zależności:** [IMP-550](#imp-550--konta-i-rekordy-aplikacji-w-app-store-connect-i-google-play), [IMP-652](15-design-i-akceptacje.md#imp-652--ikona-aplikacji-splash-statyczny-materiały-do-sklepów)
- **Odwołania:** R-12, FR-903
- **Kroki:**
  1. Napisz opis PL (krótki i pełny), słowa kluczowe i tekst promocyjny zgodne z tonem marki i funkcjami MVP.
  2. Przygotuj zrzuty: telefon 6,7″ i 6,5″ (lista turniejów, szczegóły, ranking), iPad 12,9″ i tablet Android 10″ (wybór profilu, formularz oceny) z danych demo.
  3. Uzupełnij URL-e polityki prywatności, wsparcia i usunięcia konta z `polechamp.app` oraz klasyfikację wiekową (aplikacja nie dla dzieci).
  4. Przekaż materiały do IMP-552/553 w katalogu `store/` repozytorium.
  5. Przekaż decyzje i pliki zespołowi (link w zadaniu); zaktualizuj specyfikację ekranów, jeśli zmienia się tekst lub układ.
- **Definition of Done:**
  - [ ] Wpisy zatwierdzone przez PO
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-552 – Dystrybucja testowa dla pilotażu
- **Epik / obszar:** EP-13 Wydanie i pilotaż | **Rola:** MOB
- **Cel:** Organizator pilotażowy i sędziowie instalują aplikację przed zawodami z TestFlight i Google Play, z instrukcją krok po kroku.
- **Zakres:** TestFlight (zewnętrzni testerzy, review beta), Play closed testing, instrukcja instalacji, kanał EAS Update `production` dla buildów pilotażowych; **Poza zakresem:** –
- **Zależności:** [IMP-550](#imp-550--konta-i-rekordy-aplikacji-w-app-store-connect-i-google-play), [IMP-023](01-fundamenty-i-devops.md#imp-023--ci-mobile-buildy-eas-i-publikacja-aktualizacji)
- **Odwołania:** ADR-007
- **Kroki:**
  1. Zgłoś build `production` do przeglądu beta TestFlight (testerzy zewnętrzni) i do ścieżki Play closed testing.
  2. Dodaj testerów z listy od PM do grup (e-maile przez konsolę, bez zapisu w repozytorium).
  3. Przypisz buildy pilotażowe do kanału EAS Update `production` i sprawdź otrzymanie aktualizacji OTA.
  4. Napisz instrukcję instalacji (iOS: TestFlight, Android: link testowy) i przekaż ją PM.
  5. Otwórz PR `IMP-552: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Wszyscy uczestnicy UAT mają zainstalowaną aplikację
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

### IMP-553 – Przygotowanie przeglądu w sklepach
- **Epik / obszar:** EP-13 Wydanie i pilotaż | **Rola:** MOB
- **Cel:** Recenzenci Apple i Google mogą przetestować oba tryby aplikacji bez prawdziwego turnieju, więc przegląd przechodzi za pierwszym podejściem.
- **Zakres:** Turniej do przeglądu (CLI IMP-178) z długoważnym kodem parowania, konto demo organizatora, notatki dla recenzenta (jak przetestować tryb sędziego na iPadzie), usuwanie konta w aplikacji (5.1.1(v)), strona usunięcia konta (Google); **Poza zakresem:** –
- **Zależności:** [IMP-178](05-backend-eksport-audyt-rodo.md#imp-178--narzędzia-operatora-cli), [IMP-277](07-mobile-ekrany-organizatora.md#imp-277--scr-org-21--konto), [IMP-179](05-backend-eksport-audyt-rodo.md#imp-179--strona-statyczna-dokumenty-prawne-usunięcie-konta-linki-uniwersalne)
- **Odwołania:** TL-22, TL-40, R-12
- **Kroki:**
  1. Utwórz turniej do przeglądu poleceniem `review-tournament:create` (IMP-178) z fikcyjnymi zawodniczkami i kodem parowania ważnym 30 dni.
  2. Utwórz konto demo organizatora (zweryfikowany e-mail) i zapisz poświadczenia w polu „Sign-in information” App Store Connect i „App access” w Play.
  3. Napisz notatki dla recenzenta: jak wybrać tryb „Tablet sędziowski” na iPadzie, wpisać kod parowania, zalogować się PIN-em sędziego demo i ocenić występ.
  4. Sprawdź wymagania: usuwanie konta w aplikacji (wytyczna 5.1.1(v)), strona usunięcia konta dla Google, deklaracje prywatności (IMP-407).
  5. Opisz procedurę i unieważnienie kodu po decyzji sklepu w `ops/runbooks/store-review.md`.
  6. Otwórz PR `IMP-553: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Pierwsze zgłoszenie do przeglądu zaakceptowane lub uwagi zaadresowane
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** średnie

### IMP-554 – Lista kontrolna wydania i runbook dnia zawodów
- **Epik / obszar:** EP-13 Wydanie i pilotaż | **Rola:** DEVOPS
- **Cel:** Wydanie i dzień zawodów przebiegają według spisanych procedur: zespół wie, co sprawdzić przed wydaniem, kto ma dyżur i jak reagować na typowe problemy.
- **Zakres:** Checklista (testy, raporty k6/ZAP/pentest, SBOM, migracje, okna zamrożenia, kanał OTA), runbook dnia zawodów (dashboard, alarmy, typowe problemy: tablet offline, odrzucenia, reset PIN, procedury), harmonogram dyżurów; **Poza zakresem:** –
- **Zależności:** [IMP-019](01-fundamenty-i-devops.md#imp-019--metryki-ślady-dashboard-i-alarmy), [IMP-017](01-fundamenty-i-devops.md#imp-017--okna-zamrożenia-wydań-freeze-guard)
- **Odwołania:** NFR-905, NFR-902, ADR-010
- **Kroki:**
  1. Napisz `ops/runbooks/release.md`: lista kontrolna (CI, E2E P1, raporty k6/ZAP/pentest, SBOM, migracje wstecznie zgodne, okno zamrożenia w `freeze-windows.yaml`, kanał OTA, notatki wydania).
  2. Napisz `ops/runbooks/event-day.md`: dashboard i alarmy, procedury dla „tablet offline z kolejką”, „odrzucone oceny”, „reset PIN-u”, „tablet odłączony”, „awaria WS/Valkey”, „PDF nie generuje się”.
  3. Dodaj harmonogram dyżurów (`ops/on-call.yaml`) z kontaktami i eskalacją.
  4. Przeprowadź przegląd runbooków z zespołem na podstawie próby generalnej.
  5. Otwórz PR `IMP-554: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Przegląd z PM i dyżurnymi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-555 – Uruchomienie produkcji
- **Epik / obszar:** EP-13 Wydanie i pilotaż | **Rola:** DEVOPS
- **Cel:** Środowisko produkcyjne działa z pełnym monitoringiem, API 1.0 jest wdrożone, a buildy 1.0 są zgłoszone do sklepów.
- **Zakres:** `terraform apply` production, DNS, SES produkcyjny, sekrety, kanarek, alarmy, wdrożenie 1.0 API, zgłoszenie buildów 1.0 do sklepów, weryfikacja poprawek z pentestu; **Poza zakresem:** –
- **Zależności:** [IMP-408](10-bezpieczenstwo-i-rodo.md#imp-408--pentest-zewnętrzny-i-poprawki), [IMP-465](11-qa-i-automatyzacja-testow.md#imp-465--próba-generalna--wsparcie-i-poprawki), [IMP-466](11-qa-i-automatyzacja-testow.md#imp-466--regres-ręczny-przed-wydaniem-i-triage-defektów), [IMP-554](#imp-554--lista-kontrolna-wydania-i-runbook-dnia-zawodów), [IMP-553](#imp-553--przygotowanie-przeglądu-w-sklepach)
- **Odwołania:** ADR-007, NFR-304, [TC-REL-001](../03-test-plans/05-testy-niefunkcjonalne.md#tc-rel-001), [TC-SEC-003](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-003)
- **Kroki:**
  1. Wykonaj `terraform apply` dla `envs/production` (sieć, RDS Multi-AZ, Valkey z repliką, ECS, ALB, S3, CloudFront, SES, WAF, alarmy) z przeglądem planu przez drugą osobę.
  2. Wygeneruj i załaduj sekrety produkcyjne (klucze JWT ES256, HMAC PIN, hasła baz) oraz potwierdź wyjście SES z sandboxa.
  3. Uruchom migracje i wdrożenie API 1.0 workflow `deploy.yml` (zatwierdzenie środowiska), smoke test i kanarek co 5 min.
  4. Zweryfikuj poprawki z pentestu na produkcji (nagłówki TLS, WAF, polityki IAM) i alarmy (test SNS).
  5. Zgłoś buildy 1.0 do App Store i Google Play (`eas submit --profile production`) według listy kontrolnej IMP-554.
  6. Dopisz lub uruchom przypadki TC-REL-001, TC-SEC-003 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-555: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Smoke test produkcji zielony; TC-REL-001 aktywny
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-556 – Wsparcie pilotażowego turnieju
- **Epik / obszar:** EP-13 Wydanie i pilotaż | **Rola:** FULL
- **Cel:** Pilotażowy turniej przebiega bez utraconych ocen, z wynikami i PDF dostępnymi zaraz po kategoriach, a zespół zbiera metryki sukcesu MVP.
- **Zakres:** Dyżur (zdalnie + 1 osoba na miejscu), monitoring, szybkie decyzje, zbieranie metryk sukcesu (utracone oceny, czas do wyników, PDF), raport po pilocie; **Poza zakresem:** –
- **Zależności:** [IMP-555](#imp-555--uruchomienie-produkcji)
- **Odwołania:** NFR-308, NFR-304, [TC-REL-006](../03-test-plans/05-testy-niefunkcjonalne.md#tc-rel-006)
- **Kroki:**
  1. Przygotuj plan dyżuru: 1 osoba na miejscu (tablety, organizator), 1 zdalnie (dashboard, logi, decyzje o hotfixie), kanały kontaktu.
  2. Sprawdź przed zawodami: parowanie wszystkich tabletów, migawki, poziom baterii, sieć w hali (WSS lub odpytywanie).
  3. Monitoruj w trakcie: `pending_mutations`, odrzucenia, opóźnienia publikatora, 5xx, czas generowania PDF; reaguj wg `event-day.md`.
  4. Zbierz metryki sukcesu z 02-zakres-mvp §1 (utracone oceny = 0, czas od ostatniej oceny do wyników, czas PDF, liczba interwencji) z bazy i logów.
  5. Napisz raport po pilocie (metryki, incydenty, opinie organizatora i sędziów, rekomendacje) dla PM.
  6. Dopisz lub uruchom przypadki TC-REL-006 w API (Vitest) i aplikacji (Jest/Maestro); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-556: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Raport pilotażu z metrykami sukcesu MVP
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 12 h (L) | **Ryzyko:** wysokie

### IMP-557 – Instrukcja dla organizatorów (onboarding)
- **Epik / obszar:** EP-13 Wydanie i pilotaż | **Rola:** QA
- **Cel:** Organizator po lekturze krótkiego przewodnika samodzielnie przygotowuje turniej, tablety i sędziów oraz wie, jak bezpiecznie zamykać kategorie.
- **Zakres:** Krótki przewodnik (PDF/strona): przygotowanie turnieju, parowanie, PIN-y, praca bez sieci, sprawdzenie urządzeń przed blokadą, odrzucone oceny, PDF, usuwanie danych; **Poza zakresem:** README produktu (PM)
- **Zależności:** [IMP-464](11-qa-i-automatyzacja-testow.md#imp-464--przygotowanie-uat-i-próby-generalnej)
- **Odwołania:** ADR-010, FR-309
- **Kroki:**
  1. Napisz przewodnik (strona w `apps/site/pomoc` i PDF): przygotowanie turnieju i kategorii, lista startowa, dodanie sędziów i przekazanie PIN-ów, parowanie tabletów.
  2. Opisz pracę bez sieci i sprawdzenie urządzeń przed blokadą (SCR-ORG-14, ostrzeżenia SCR-ORG-18) oraz decyzje w „Odrzucone oceny” (ADR-010).
  3. Opisz eksport PDF, zakończenie turnieju, usuwanie danych osobowych i usunięcie konta.
  4. Dodaj zrzuty ekranów z danych demo i podlinkuj przewodnik z „Pomoc i kontakt” w SCR-ORG-21 (`legal.supportUrl`).
  5. Otwórz PR `IMP-557: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Przegląd PO i organizatora pilotażowego
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

