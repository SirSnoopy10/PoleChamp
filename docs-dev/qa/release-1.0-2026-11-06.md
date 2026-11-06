# Gotowość do wydania 1.0 – próba turnieju (6.11.2026)

Turniej próbny „Puchar Wrocławia Pole Dance 2026” przeprowadzony w całości na lokalnym środowisku: backend z obrazu produkcyjnego (`apps/api/Dockerfile`) w Dockerze, aplikacja w buildzie **release 1.0.0** (R8, Hermes, bez DevCatalog) na czterech emulatorach Androida 15. Zrzuty ekranu, PDF i CSV: `.ux/rc-2026-11-06/` (lokalnie, poza repozytorium).

## Werdykt

**Aplikacja jest gotowa funkcjonalnie do turnieju** – wszystkie przepływy organizatora i sędziów przeszły po naprawie 7 błędów znalezionych w próbie (w tym 4 poważnych dla dnia zawodów). **Wydanie do sklepów 1.0 jest zablokowane** przez elementy spoza kodu: konta Apple/Google/EAS, produkcja AWS, ikona i grafiki, dokumenty prawne (szkice „PROJEKT”), Sentry. Lista w sekcji „Blokery sklepowe”.

## Środowisko

| Element | Wartość |
|---|---|
| Backend | `docker compose -p polechamp-rc --profile app up -d --build` – nowy profil `app` w `docker-compose.yml`: `migrate` → `api` + `worker` z obrazu produkcyjnego (`NODE_ENV=production`, `DEPLOY_ENV=staging`, `E2E_HELPERS=false`, `APP_MIN_VERSION=1.0.0`), PostgreSQL 18, Valkey 8, S3Mock, Mailpit |
| Aplikacja | `assembleRelease` x86_64, `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`, `EXPO_PUBLIC_APP_VARIANT=production`, wersja 1.0.0 |
| Telefon organizatora | Pixel 9 (1080×2424, 420 dpi) |
| Tablet 1 | 10″ 1920×1200, 240 dpi |
| Tablet 2 | 10″ 1340×800, 160 dpi (klasa Lenovo Tab M10) |
| Tablet 3 | 11″ 2560×1600, 320 dpi (klasa Galaxy Tab S) |
| Sterowanie | `tools/tournament/` – `drive.mjs` (adb + uiautomator: testID, tapnięcia, zrzuty, sieć), `score.mjs` (ocena występu), `api.mjs` (API organizatora, Mailpit) |

## Przebieg turnieju

3 kategorie (Pole Sport Amateur Senior – 8 zawodniczek, kryteria domyślne + własna kara; Pole Art Advanced Open – 6 + 1 dopisana w trakcie; Exotic Pro Masters 40+ – 5, własne kryteria z krokiem 0,1), 3 sędziów, 3 tablety, 60 ocen.

| # | Scenariusz | Wynik |
|---|---|---|
| 1 | Rejestracja organizatora, kod z e-maila (Mailpit), turniej z datą i miejscem, kategoria, kara, zawodniczki (w tym niepełnoletnia – walidacja zgody opiekuna) | OK |
| 2 | 3 sędziów z PIN-ami, zmiana nazwiska widoczna na telefonie na żywo | OK |
| 3 | Parowanie 3 tabletów jednym kodem wpisanym ręcznie, nazwy tabletów, lista „Tablety” u organizatora | OK |
| 4 | Start turnieju i kategorii, logowanie PIN-em (zły PIN → „Pozostało 9 prób”) | OK |
| 5 | Równoległe ocenianie 3 sędziów, kara, auto-przejście do następnej, ranking na żywo – wynik sprawdzony ręcznie (np. (46,00 + 47,25 + 46,00) / 3 = 46,42) | OK |
| 6 | Tablet offline: 3 oceny w kolejce („Brak sieci · 3 w kolejce”), u organizatora „wstępny 2/3”, po odzyskaniu sieci wysyłka w ~10 s i 3/3 na żywo | OK |
| 7 | Restart kontenera API w trakcie oceniania – tablety dosłały oceny | OK |
| 8 | Wycofanie zawodniczki w trakcie oceniania: znika z kolejek; ocena offline i online → ENTRY_WITHDRAWN, baner, „Wymaga uwagi”, lista „Odrzucone oceny” | OK (B3, U4, U5) |
| 9 | Przywrócenie zawodniczki, „Przyjmij” jedną ocenę, „Odrzuć” drugą, ponowna ocena sędziego | OK (potwierdzone „Przyjmij” z EP-17) |
| 10 | Dopisanie zawodniczki do trwającej kategorii – pojawia się na tabletach | OK |
| 11 | Korekta oceny (rewizja 2) – ranking przeliczony | OK |
| 12 | Zakończenie kategorii – tablet od razu „Kategoria zakończona – tylko podgląd” | OK |
| 13 | Korekta offline po zakończeniu kategorii → CATEGORY_LOCKED → odblokowanie, „Przyjmij”, ponowne zakończenie | OK |
| 14 | Kryteria z krokiem 0,1; szkic oceny po twardym zabiciu aplikacji; sesja bez ponownego PIN-u (< 15 min) | OK |
| 15 | Reset PIN-u sędziego w trakcie pracy – wylogowanie, stary PIN odrzucony, nowy działa, szkic zachowany | OK |
| 16 | Odłączenie tabletu przez organizatora – ekran „To urządzenie zostało odłączone” | OK |
| 17 | Eksport PDF (worker, 684 ms) i CSV z telefonu, arkusz udostępniania Androida; zawartość zgodna z rankingiem, polskie znaki poprawne | OK |
| 18 | Zakończenie turnieju – tablety „Turniej … został zakończony” | OK |
| 19 | Aktualizacja aplikacji „w miejscu” (`install -r`) na wszystkich urządzeniach – stan zachowany | OK |
| 20 | „Sparuj z nowym turniejem” bez restartu aplikacji, kolejny turniej | OK po poprawce B5 |
| 21 | Reset hasła organizatora: e-mail → link uniwersalny `polechamp.app/reset` → nowe hasło → logowanie | OK |
| 22 | Chaos: Valkey wyłączony 60 s; start API bez Valkey; SIGTERM w trakcie pracy | OK po poprawkach B2, B6 |

## Naprawione błędy

| ID | Waga | Błąd | Poprawka |
|---|---|---|---|
| B1 | S1 | Aplikacja miała wersję 0.1.0, a API produkcyjne domyślnie wymaga `APP_MIN_VERSION=1.0.0` – każdy użytkownik zobaczyłby „Wymagana aktualizacja” | `app.config.ts` → `version: '1.0.0'` |
| B2 | S2 | API nie startowało, gdy Valkey był niedostępny (np. failover w czasie wdrożenia): `psubscribe` adaptera Socket.IO bez obsługi błędu kończył proces – pętla restartów w ECS | `realtime/adapter.ts`: subskrybent czeka na Valkey bez limitu prób, odrzucone (un)subskrypcje logowane; test jednostkowy; znika też 8 „Unhandled Rejection” z `test:int` (CI kończył się kodem 1) |
| B3 | S2 | Pigułka „Wymaga uwagi” zostawała na tablecie do końca turnieju, choć odrzucenie zostało rozwiązane (organizator przyjął ocenę albo sędzia ocenił ponownie) – popover był pusty | `outbox.countFailed` liczy tylko arkusze nadal `REJECTED` (jak popover); asercja w TC-SYNC-008; potwierdzone na tablecie |
| B4 | S2 | Po „Sparuj z nowym turniejem” tablet nie dostawał zdarzeń realtime (gniazdo zostawało w pokoju starego turnieju) – nowe zawodniczki, blokady i przyjęcia docierały tylko przy ręcznej synchronizacji | `judge/runtime.ts`: `connectRealtime` przełącza subskrypcję przy innym turnieju; test; potwierdzone na tablecie (≤ 2 s) |
| B5 | S2 | Łagodne zamykanie API nie działało: `app.enableShutdownHooks()` zamykał serwer natychmiast po SIGTERM (bez 503 przez `SHUTDOWN_DELAY_MS`, bez `server.restarting` i wygaszania WS), drugi `close()` dawał „Called end on pool more than once” | `bootstrap.ts` bez haków Nesta (zamykanie tylko przez `installShutdown`); test w `realtime.test.ts`; potwierdzone w Dockerze: 503 przez 2 s, „WS wygaszone”, kod wyjścia 0 |
| B6 | S3 | Formularz oceny: po zmianie kryteriów z pierwszego rzędu znikał podpis „nieruszone” i drugi rząd kart przesuwał się pod palcem (~38 px na 11″) – ryzyko chybienia „+” | `CriterionCard`: podpis zawsze zajmuje miejsce (niewidoczny po zmianie, ukryty dla czytnika); test; potwierdzone na tablecie |
| B7 | S3 | Manifest release: ruch bez TLS dozwolony w każdym buildzie, zbędne uprawnienia `SYSTEM_ALERT_WINDOW`, `USE_BIOMETRIC`, `USE_FINGERPRINT` | `app.config.ts`: `usesCleartextTraffic` tylko dla API `http://`, uprawnienia zablokowane; scalony manifest: kamera, internet, wibracje, stan sieci |
| B8 | CI | 5 testów jednostkowych czerwonych od EP-17 (30.10): słownik i18n zmieniony bez specyfikacji, seed sprzed D-SC-05 | specyfikacja (`03-api`, `06-ekrany-sedziego`, `09-design-system`) i testy zgodne z przyjętymi tekstami |
| B9 | ops | Obraz workera oznaczany jako `unhealthy` (HEALTHCHECK API na porcie 3000); kontekst buildu obrazu bez wykluczenia `apps/mobile/android` | `docker-compose.yml` (healthcheck workera wyłączony), `.dockerignore` |

Dodatkowo: `apps/mobile/eas.json` z profilami `development` / `preview` (kanał `staging`) / `production` (kanał `production`, `autoIncrement`) wg IMP-023 krok 1 – bez projektu EAS nieprzetestowany.

## Uwagi do decyzji PO (bez zmian w kodzie)

| ID | Obserwacja | Propozycja |
|---|---|---|
| U1 | Tablet 8,7″ (1340×800, 213 dpi – Galaxy Tab A7 Lite / A9) nie może być sędziowski (NFR-702, ≥ 1024 dp) | Wymagania sprzętowe w opisie sklepu i instrukcji dla organizatorów (IMP-557) |
| U2 | Ta sama ocena: „42,8” w stopce sędziego (FR-606: 1 miejsce) i „42,75” w arkuszu organizatora | Rozważyć 2 miejsca w stopce |
| U3 | „Pełne wyniki: 3 z 3”, gdy 3 z 6 zawodniczek jeszcze nie występowały (mianownik = ocenione) | Mianownik = aktywne zawodniczki |
| U4 | Arkusz „Odrzucone oceny”: kwoty „45”, „33,5” (gdzie indziej zawsze 2 miejsca); podpis „najpierw odblokuj kategorię” także przy powodzie „Zawodniczka wycofana” | Format 2 miejsca; podpis zależny od powodu |
| U5 | Formularz wycofanej zawodniczki zostaje otwarty z aktywnym „Zatwierdź”, baner ogólny „Lista startowa została zaktualizowana” (zgodnie ze specyfikacją) | Baner „Zawodniczka wycofana” i wyłączone zatwierdzanie |
| U6 | Popover online z pustą kolejką: „Wyślemy je automatycznie po odzyskaniu połączenia.” | Tekst tylko offline |
| U7 | Po resecie PIN-u tablet wraca do profili bez trwałego komunikatu o powodzie (toast znika) | Komunikat na ekranie profili |
| U8 | Nazwa pliku eksportu zawsze „PoleChamp-wyniki.pdf/.csv” (znane z IMP-710) | Nazwa z turnieju i daty |
| U9 | „Wersja wyników 27” w PDF pokazuje wewnętrzny licznik | Bez zmian albo opis |

## Automaty (stan po poprawkach)

| Zestaw | Wynik |
|---|---|
| `pnpm typecheck`, `pnpm lint` | zielone |
| Testy jednostkowe (bez mobile) | zielone (16 zadań turbo) |
| Mobile Jest (`-w 2`) | 60 plików, 405 testów |
| API `test:int` (Testcontainers) | 29 plików, 783 testy, 0 nieobsłużonych błędów |
| Obraz Docker API | build OK z `pnpm-workspace.yaml` z repozytorium |

## Blokery sklepowe (poza kodem)

1. **Konta i EAS (IMP-550, IMP-023):** projekt EAS, `EAS_PROJECT_ID`, poświadczenia podpisu, App Store Connect i Google Play; build `production` przez EAS nigdy nie powstał.
2. **Produkcja (IMP-555):** `infra/terraform` jest pusty – brak `api.polechamp.app`, S3, SES, Valkey, sekretów; `SHUTDOWN_DELAY_MS=30000` do ustawienia w ECS.
3. **Grafika:** ikona i splash to zastępczy okrąg (`assets/icon.png`) – akceptacja projektanta (IMP-650); zrzuty sklepowe i opisy (IMP-551).
4. **Prawne (Q-10):** regulamin, polityka prywatności, umowa powierzenia i strona usunięcia konta w `apps/site` to szkice „PROJEKT”; deklaracje prywatności sklepów (IMP-407).
5. **Obserwowalność:** brak `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG/PROJECT` – brak raportów awarii w dniu zawodów.
6. **Linki sklepów:** `EXPO_PUBLIC_APP_STORE_URL` / `PLAY_STORE_URL` – wartości zastępcze (ekran wymuszonej aktualizacji).
7. **iOS:** nietestowany (brak macOS) – iPad jako tablet sędziowski, przegląd Apple z kontem demo (IMP-553).
8. **Pentest (IMP-408)**, pomiary na fizycznych tabletach (IMP-600…609), próba generalna z ludźmi (IMP-465).

## Ograniczenia próby

Emulatory, nie fizyczne tablety (dotyk, bateria, Wi-Fi hali); kamera (QR) nietestowana – parowanie kodem wpisanym ręcznie; sieć lokalna bez opóźnień; jeden organizator. Lokalny build wymagał podmiany `ninja` 1.10 → 1.12 w CMake 3.22.1 SDK (limit 260 znaków ścieżki na Windows; kopia `ninja-1.10.2.exe.bak`).
