# Graf zależności i ścieżka krytyczna

> Dokument: `04-implementation-plans/90-graf-zaleznosci.md` · Tech Lead · 23.10.2026 · Generowany z kart zadań (zależności „IMP-…”). Indeks: [91-indeks-zadan.md](91-indeks-zadan.md)

## 1. Zależności między epikami

Strzałka A → B oznacza, że co najmniej jedno zadanie epiku B zależy od zadania epiku A. Liczby to suma szacunków epiku (bez buforów).

```mermaid
flowchart LR
    EP01["EP-01 Fundamenty i DevOps<br/>178 h"]
    EP02["EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n)<br/>127 h"]
    EP03["EP-03 Backend – rdzeń, konto i konfiguracja turnieju<br/>202 h"]
    EP04["EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime<br/>110 h"]
    EP05["EP-05 Backend – eksport PDF, audyt, RODO, worker<br/>61 h"]
    EP06["EP-06 Mobile – fundamenty i design system Nocturne<br/>153 h"]
    EP07["EP-07 Mobile – ekrany organizatora<br/>195 h"]
    EP08["EP-08 Mobile – ekrany sędziego<br/>131 h"]
    EP09["EP-09 Mobile – offline i synchronizacja<br/>61 h"]
    EP10["EP-10 Bezpieczeństwo i RODO<br/>57 h"]
    EP11["EP-11 QA i automatyzacja testów<br/>194 h"]
    EP12["EP-12 Twardnienie NFR<br/>56 h"]
    EP13["EP-13 Wydanie i pilotaż<br/>46 h"]
    EP14["EP-14 Spike’i techniczne<br/>66 h"]
    EP15["EP-15 Design i akceptacje<br/>42 h"]
    EP01 --> EP02
    EP01 --> EP03
    EP01 --> EP04
    EP01 --> EP05
    EP01 --> EP06
    EP01 --> EP10
    EP01 --> EP11
    EP01 --> EP13
    EP01 --> EP14
    EP02 --> EP01
    EP02 --> EP03
    EP02 --> EP04
    EP02 --> EP05
    EP02 --> EP06
    EP02 --> EP08
    EP02 --> EP09
    EP02 --> EP11
    EP03 --> EP01
    EP03 --> EP04
    EP03 --> EP05
    EP03 --> EP06
    EP03 --> EP07
    EP03 --> EP10
    EP03 --> EP11
    EP04 --> EP03
    EP04 --> EP05
    EP04 --> EP07
    EP04 --> EP08
    EP04 --> EP09
    EP04 --> EP10
    EP04 --> EP11
    EP04 --> EP12
    EP05 --> EP03
    EP05 --> EP07
    EP05 --> EP10
    EP05 --> EP13
    EP06 --> EP01
    EP06 --> EP02
    EP06 --> EP07
    EP06 --> EP08
    EP06 --> EP09
    EP06 --> EP10
    EP06 --> EP11
    EP06 --> EP12
    EP07 --> EP05
    EP07 --> EP10
    EP07 --> EP11
    EP07 --> EP12
    EP07 --> EP13
    EP07 --> EP15
    EP08 --> EP11
    EP08 --> EP12
    EP08 --> EP15
    EP09 --> EP08
    EP09 --> EP10
    EP09 --> EP11
    EP10 --> EP13
    EP11 --> EP01
    EP11 --> EP10
    EP11 --> EP12
    EP11 --> EP13
    EP11 --> EP14
    EP11 --> EP15
    EP13 --> EP10
    EP13 --> EP12
    EP14 --> EP05
    EP14 --> EP06
    EP14 --> EP08
    EP14 --> EP09
    EP14 --> EP11
    EP15 --> EP13
```


## 2. Kluczowe zadania i ścieżka krytyczna

Graf obejmuje zadania ścieżki krytycznej (wyróżnione), spike'i oraz zadania o wysokim ryzyku integralności danych. Pełna lista zależności – w kartach zadań i w [91-indeks-zadan.md](91-indeks-zadan.md).

```mermaid
flowchart TD
    IMP001["IMP-001<br/>Monorepo: pnpm workspaces + Turborepo + bazowa k<br/>6 h"]:::crit
    IMP002["IMP-002<br/>Lint, formatowanie i hooki git<br/>6 h"]:::crit
    IMP050["IMP-050<br/>@polechamp/scoring – szkielet pakietu<br/>3 h"]:::crit
    IMP051["IMP-051<br/>scoring: typy i arytmetyka stałoprzecinkowa<br/>6 h"]:::crit
    IMP052["IMP-052<br/>scoring: wynik sędziego, maksimum, wartości domy<br/>6 h"]:::crit
    IMP053["IMP-053<br/>scoring: agregacja i średnie remisowe<br/>6 h"]:::crit
    IMP054["IMP-054<br/>scoring: ranking, remisy, starty bez ocen i wyco<br/>8 h"]:::crit
    IMP055["IMP-055<br/>scoring: formatowanie wyników i postęp<br/>8 h"]:::crit
    IMP121["IMP-121<br/>Turnieje: lista, utworzenie, szczegóły<br/>8 h"]:::crit
    IMP124["IMP-124<br/>Kategorie: tworzenie z szablonu, odczyt, edycja,<br/>8 h"]:::crit
    IMP125["IMP-125<br/>Kryteria i kary – CRUD z blokadą po starcie<br/>8 h"]:::crit
    IMP126["IMP-126<br/>Start kategorii: warunki, panel, auto-start turn<br/>6 h"]:::crit
    IMP127["IMP-127<br/>Blokada i odblokowanie kategorii z sumą kontroln<br/>8 h"]:::crit
    IMP261["IMP-261<br/>SCR-ORG-06/07/08 – rama szczegółów kategorii<br/>10 h"]:::crit
    IMP278["IMP-278<br/>Tryb offline organizatora na wszystkich ekranach<br/>4 h"]:::crit
    IMP455["IMP-455<br/>E2E organizatora – konto, turnieje, kategorie i <br/>10 h"]:::crit
    IMP457["IMP-457<br/>E2E pełnego turnieju (dwa urządzenia)<br/>12 h"]:::crit
    IMP464["IMP-464<br/>Przygotowanie UAT i próby generalnej<br/>8 h"]:::crit
    IMP465["IMP-465<br/>Próba generalna – wsparcie i poprawki<br/>16 h"]:::crit
    IMP555["IMP-555<br/>Uruchomienie produkcji<br/>8 h"]:::crit
    IMP556["IMP-556<br/>Wsparcie pilotażowego turnieju<br/>12 h"]:::crit
    IMP600["IMP-600<br/>SPIKE: zgodność stosu Expo SDK 58 (limit 8 h)<br/>8 h"]
    IMP601["IMP-601<br/>SPIKE: PBKDF2 600k na tabletach i Argon2id na Fa<br/>6 h"]
    IMP602["IMP-602<br/>SPIKE: bottom sheet – @gorhom/bottom-sheet vs wł<br/>4 h"]
    IMP603["IMP-603<br/>SPIKE: trwałość expo-sqlite przy kill -9 i utrac<br/>8 h"]
    IMP604["IMP-604<br/>SPIKE: Socket.IO przez ALB i klient RN w tle (li<br/>8 h"]
    IMP605["IMP-605<br/>SPIKE: pdfmake z Inter i polskimi znakami, wydaj<br/>6 h"]
    IMP606["IMP-606<br/>SPIKE: animacja splash – Skia vs sekwencja klate<br/>8 h"]
    IMP607["IMP-607<br/>SPIKE: orientacja i zmiana okna (Android 16, iPa<br/>6 h"]
    IMP609["IMP-609<br/>SPIKE: Drizzle na expo-sqlite i zapis migawki (l<br/>6 h"]
    IMP200["IMP-200<br/>Inicjalizacja aplikacji Expo SDK 58<br/>6 h"]
    IMP201["IMP-201<br/>Metro, pnpm workspace i środowisko testów mobile<br/>5 h"]
    IMP206["IMP-206<br/>Komponent Sheet (bottom sheet) – implementacja w<br/>16 h"]
    IMP350["IMP-350<br/>Lokalna baza SQLite: schemat, migracje, PRAGMA<br/>8 h"]
    IMP353["IMP-353<br/>Outbox – rdzeń<br/>6 h"]
    IMP354["IMP-354<br/>SyncEngine – wysyłka (push)<br/>10 h"]
    IMP144["IMP-144<br/>Migawka urządzenia<br/>8 h"]
    IMP146["IMP-146<br/>Sync push: paczki, idempotencja, transakcje per <br/>8 h"]
    IMP147["IMP-147<br/>Mutacja SUBMIT_SCORE_SHEET<br/>10 h"]
    IMP150["IMP-150<br/>Serwis przeliczania wyników kategorii<br/>8 h"]
    IMP305["IMP-305<br/>Logowanie sędziego online/offline i limity prób <br/>10 h"]
    IMP313["IMP-313<br/>Zatwierdzenie oceny i auto-przejście<br/>8 h"]
    IMP456["IMP-456<br/>E2E sędziego – parowanie, logowanie PIN-em, kole<br/>10 h"]
    IMP468["IMP-468<br/>E2E sędziego – blokada, sesje, synchronizacja, o<br/>10 h"]
    IMP458["IMP-458<br/>E2E offline – narzędzia sieci i scenariusze TC-S<br/>10 h"]
    IMP469["IMP-469<br/>E2E offline – scenariusze TC-SYNC-021…040 (pojem<br/>10 h"]
    IMP408["IMP-408<br/>Pentest zewnętrzny i poprawki<br/>16 h"]
    IMP466["IMP-466<br/>Regres ręczny przed wydaniem i triage defektów<br/>12 h"]
    IMP172["IMP-172<br/>Renderer PDF (pdfmake, Inter, polskie znaki)<br/>12 h"]
    IMP011["IMP-011<br/>Terraform: ECS Fargate, ALB, DNS, certyfikaty<br/>12 h"]
    IMP016["IMP-016<br/>CD: build → ECR → migracje → wdrożenie<br/>10 h"]
    IMP001 --> IMP002
    IMP001 --> IMP050
    IMP002 --> IMP050
    IMP050 --> IMP051
    IMP051 --> IMP052
    IMP052 --> IMP053
    IMP053 --> IMP054
    IMP054 --> IMP055
    IMP055 --> IMP121
    IMP121 --> IMP124
    IMP052 --> IMP124
    IMP124 --> IMP125
    IMP125 --> IMP126
    IMP126 --> IMP127
    IMP150 --> IMP127
    IMP126 --> IMP261
    IMP127 --> IMP261
    IMP261 --> IMP278
    IMP278 --> IMP455
    IMP455 --> IMP457
    IMP456 --> IMP457
    IMP468 --> IMP457
    IMP457 --> IMP464
    IMP464 --> IMP465
    IMP408 --> IMP555
    IMP465 --> IMP555
    IMP466 --> IMP555
    IMP555 --> IMP556
    IMP001 --> IMP600
    IMP600 --> IMP601
    IMP600 --> IMP602
    IMP600 --> IMP603
    IMP011 --> IMP604
    IMP600 --> IMP604
    IMP001 --> IMP605
    IMP600 --> IMP606
    IMP600 --> IMP607
    IMP600 --> IMP609
    IMP001 --> IMP200
    IMP600 --> IMP200
    IMP200 --> IMP201
    IMP050 --> IMP201
    IMP602 --> IMP206
    IMP201 --> IMP350
    IMP603 --> IMP350
    IMP609 --> IMP350
    IMP350 --> IMP353
    IMP353 --> IMP354
    IMP146 --> IMP354
    IMP146 --> IMP147
    IMP150 --> IMP147
    IMP055 --> IMP150
    IMP353 --> IMP305
    IMP601 --> IMP305
    IMP353 --> IMP313
    IMP456 --> IMP458
    IMP458 --> IMP469
    IMP457 --> IMP408
    IMP458 --> IMP466
    IMP469 --> IMP466
    IMP605 --> IMP172
    IMP011 --> IMP016
    classDef crit fill:#2b2741,stroke:#9184d9,color:#e7e5fe,stroke-width:2px
```


## 3. Ścieżka krytyczna

Najdłuższy łańcuch zależności liczony sumą godzin przy **nieograniczonych zasobach** wynosi **167 h** (21 zadań, ≈ 5,6 tygodnia pracy jednej osoby przy 30 h efektywnie/tydzień):

IMP-001 → IMP-002 → IMP-050 → IMP-051 → IMP-052 → IMP-053 → IMP-054 → IMP-055 → IMP-121 → IMP-124 → IMP-125 → IMP-126 → IMP-127 → IMP-261 → IMP-278 → IMP-455 → IMP-457 → IMP-464 → IMP-465 → IMP-555 → IMP-556

| # | Zadanie | Rola | h | Narastająco (h) | Najwcześniejszy start (h) |
|---|---|---|---|---|---|
| 1 | [IMP-001](01-fundamenty-i-devops.md#imp-001--monorepo-pnpm-workspaces--turborepo--bazowa-konfiguracja-ts) Monorepo: pnpm workspaces + Turborepo + bazowa konfiguracja TS | DEVOPS | 6 | 6 | 0 |
| 2 | [IMP-002](01-fundamenty-i-devops.md#imp-002--lint-formatowanie-i-hooki-git) Lint, formatowanie i hooki git | DEVOPS | 6 | 12 | 6 |
| 3 | [IMP-050](02-pakiety-wspoldzielone.md#imp-050--polechampscoring--szkielet-pakietu) @polechamp/scoring – szkielet pakietu | BE | 3 | 15 | 12 |
| 4 | [IMP-051](02-pakiety-wspoldzielone.md#imp-051--scoring-typy-i-arytmetyka-stałoprzecinkowa) scoring: typy i arytmetyka stałoprzecinkowa | BE | 6 | 21 | 15 |
| 5 | [IMP-052](02-pakiety-wspoldzielone.md#imp-052--scoring-wynik-sędziego-maksimum-wartości-domyślne-walidacja-arkusza) scoring: wynik sędziego, maksimum, wartości domyślne, walidacja arkusza | BE | 6 | 27 | 21 |
| 6 | [IMP-053](02-pakiety-wspoldzielone.md#imp-053--scoring-agregacja-i-średnie-remisowe) scoring: agregacja i średnie remisowe | BE | 6 | 33 | 27 |
| 7 | [IMP-054](02-pakiety-wspoldzielone.md#imp-054--scoring-ranking-remisy-starty-bez-ocen-i-wycofane) scoring: ranking, remisy, starty bez ocen i wycofane | BE | 8 | 41 | 33 |
| 8 | [IMP-055](02-pakiety-wspoldzielone.md#imp-055--scoring-formatowanie-wyników-i-postęp) scoring: formatowanie wyników i postęp | BE | 8 | 49 | 41 |
| 9 | [IMP-121](03-backend-konto-i-konfiguracja-turnieju.md#imp-121--turnieje-lista-utworzenie-szczegóły) Turnieje: lista, utworzenie, szczegóły | BE | 8 | 57 | 49 |
| 10 | [IMP-124](03-backend-konto-i-konfiguracja-turnieju.md#imp-124--kategorie-tworzenie-z-szablonu-odczyt-edycja-usunięcie) Kategorie: tworzenie z szablonu, odczyt, edycja, usunięcie | BE | 8 | 65 | 57 |
| 11 | [IMP-125](03-backend-konto-i-konfiguracja-turnieju.md#imp-125--kryteria-i-kary--crud-z-blokadą-po-starcie) Kryteria i kary – CRUD z blokadą po starcie | BE | 8 | 73 | 65 |
| 12 | [IMP-126](03-backend-konto-i-konfiguracja-turnieju.md#imp-126--start-kategorii-warunki-panel-auto-start-turnieju) Start kategorii: warunki, panel, auto-start turnieju | BE | 6 | 79 | 73 |
| 13 | [IMP-127](03-backend-konto-i-konfiguracja-turnieju.md#imp-127--blokada-i-odblokowanie-kategorii-z-sumą-kontrolną) Blokada i odblokowanie kategorii z sumą kontrolną | BE | 8 | 87 | 79 |
| 14 | [IMP-261](07-mobile-ekrany-organizatora.md#imp-261--scr-org-060708--rama-szczegółów-kategorii) SCR-ORG-06/07/08 – rama szczegółów kategorii | MOB | 10 | 97 | 87 |
| 15 | [IMP-278](07-mobile-ekrany-organizatora.md#imp-278--tryb-offline-organizatora-na-wszystkich-ekranach) Tryb offline organizatora na wszystkich ekranach | MOB | 4 | 101 | 97 |
| 16 | [IMP-455](11-qa-i-automatyzacja-testow.md#imp-455--e2e-organizatora--konto-turnieje-kategorie-i-kryteria) E2E organizatora – konto, turnieje, kategorie i kryteria | QA | 10 | 111 | 101 |
| 17 | [IMP-457](11-qa-i-automatyzacja-testow.md#imp-457--e2e-pełnego-turnieju-dwa-urządzenia) E2E pełnego turnieju (dwa urządzenia) | QA | 12 | 123 | 111 |
| 18 | [IMP-464](11-qa-i-automatyzacja-testow.md#imp-464--przygotowanie-uat-i-próby-generalnej) Przygotowanie UAT i próby generalnej | QA | 8 | 131 | 123 |
| 19 | [IMP-465](11-qa-i-automatyzacja-testow.md#imp-465--próba-generalna--wsparcie-i-poprawki) Próba generalna – wsparcie i poprawki | FULL | 16 | 147 | 131 |
| 20 | [IMP-555](13-wydanie.md#imp-555--uruchomienie-produkcji) Uruchomienie produkcji | DEVOPS | 8 | 155 | 147 |
| 21 | [IMP-556](13-wydanie.md#imp-556--wsparcie-pilotażowego-turnieju) Wsparcie pilotażowego turnieju | FULL | 12 | 167 | 155 |


**Interpretacja dla planowania:**
- Ścieżka krytyczna zależności przechodzi przez silnik punktacji (`@polechamp/scoring`) i rdzeń API konfiguracji turnieju aż po blokadę kategorii (IMP-127), dalej przez ramę kategorii organizatora, testy E2E pełnego turnieju, próbę generalną, uruchomienie produkcji i pilot. Opóźnienie któregokolwiek z tych zadań przesuwa pilot.
- **W praktyce harmonogram wyznacza obciążenie zespołu mobile** (największa liczba godzin – [99-przekazanie-dla-pm.md §2](99-przekazanie-dla-pm.md#2-założenia-o-składzie-zespołu-i-czas-trwania)), a nie łańcuch zależności. Dlatego zadania MOB z ryzykiem wysokim (IMP-206, IMP-305, IMP-310, IMP-350, IMP-354, IMP-500) należy zaczynać możliwie wcześnie po spike'ach.
- Spike'i IMP-600…609 nie leżą na ścieżce krytycznej, ale ich wyniki zmieniają zakres zadań IMP-200, 206, 211, 305, 350, 351, 172 – muszą zakończyć się w 1.–2. tygodniu.
- Akceptacja projektanta (IMP-650) i treść prawna (Q-10) to zależności zewnętrzne poza grafem: blokują odpowiednio DoR ekranów poza designem i wydanie (IMP-553, IMP-555).
