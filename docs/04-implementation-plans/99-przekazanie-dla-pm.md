# Przekazanie dla Project Managera (Agent 3)

> Dokument: `04-implementation-plans/99-przekazanie-dla-pm.md` · Autor: Tech Lead (Agent 2) · 23.10.2026
> Wejście dla roadmapy, sprintów, harmonogramu, rejestru ryzyk i README. Źródła: [91-indeks-zadan.md](91-indeks-zadan.md), [90-graf-zaleznosci.md](90-graf-zaleznosci.md), [plan testów](../03-test-plans/00-strategia-testowania.md), [weryfikacja dokumentacji](../01-architecture/98-weryfikacja-tech-leada.md).
> **Rewizja 1.1 (23.10.2026):** pola „Cel” i „Kroki” wszystkich zadań rozpisano na konkretne kroki techniczne (pliki, komponenty, zapytania, schematy, tabele, endpointy, kody błędów, teksty i zdarzenia). Przy rozpisywaniu trzy zadania QA okazały się większe niż 16 h i zostały podzielone: IMP-455 → IMP-455 + IMP-467 (E2E organizatora), IMP-456 → IMP-456 + IMP-468 (E2E sędziego), IMP-458 → IMP-458 + IMP-469 (E2E offline). Liczba zadań wzrosła z 247 do 250, suma bez buforów z 1 663 h do 1679 h (+16 h, rola QA), ścieżka krytyczna skróciła się do 167 h, bo części E2E organizatora mogą biec równolegle.

## 1. Suma szacunków

| Pozycja | Godziny | Uwagi |
|---|---|---|
| Zadania implementacyjne (bez buforów) | **1679 h** | 250 zadań, 2–16 h każde; obejmują implementację, testy z przypisanych TC i samodzielny przegląd |
| Bufor ryzyka | 328 h | niskie +10%, średnie +25%, wysokie +50% (per zadanie) |
| Narzut 15% | 301 h | przeglądy kodu, spotkania, naprawa defektów z testów i UAT, przełączanie kontekstu |
| **Razem z buforami** | **2308 h** | rekomendowana podstawa budżetu MVP |

Poza szacunkiem: praca Tech Leada (architektura, przeglądy obszarów krytycznych – ok. 0,5 etatu przez cały projekt), PO i PM, treść prawna (prawnik), wycena pentestu, zakup urządzeń.

### 1.1 Per epik (bez buforów)

| Epik | h |
|---|---|
| EP-01 Fundamenty i DevOps | 178 |
| EP-02 Pakiety współdzielone | 127 |
| EP-03 Backend – rdzeń i konfiguracja | 202 |
| EP-04 Backend – urządzenia, ocenianie, sync | 110 |
| EP-05 Backend – PDF, audyt, RODO | 61 |
| EP-06 Mobile – fundamenty i design system | 153 |
| EP-07 Mobile – organizator | 195 |
| EP-08 Mobile – sędzia | 131 |
| EP-09 Mobile – offline i synchronizacja | 61 |
| EP-10 Bezpieczeństwo i RODO | 57 |
| EP-11 QA i automatyzacja | 194 |
| EP-12 Twardnienie NFR | 56 |
| EP-13 Wydanie i pilotaż | 46 |
| EP-14 Spike'i | 66 |
| EP-15 Design i akceptacje | 42 |

## 2. Założenia o składzie zespołu i czas trwania

Założony skład (do potwierdzenia przez PM): **2 × BE**, **2 × MOB** (React Native/Expo), **1 × QA** (automatyzacja), **0,5 × DevOps**, **projektant 0,2 etatu** (ok. 1 dzień w tygodniu), Tech Lead 0,5 etatu kodu + przeglądy, PO, PM. Wydajność: 30 h efektywnej pracy na osobę tygodniowo. Zadania FULL (łączące backend i aplikację) rozdzielono po połowie między BE i MOB.

| Rola | h bez buforów | h z buforami | Osób | Tygodni pracy |
|---|---|---|---|---|
| BE (+ ½ FULL) | 512 (+ 69 FULL) | 746 | 2 | 12,4 |
| MOB (+ ½ FULL) | 682 (+ 69 FULL) | 986 | 2 | 16,4 |
| QA | 218 | 308 | 1 | 10,3 |
| DEVOPS | 162 | 219 | 0,5 | 14,6 |
| DESIGN | 36 | 48 | 0,2 | 8,0 |

**Wniosek:** przy tym składzie wąskim gardłem jest zespół mobile (≈ 16,4 tygodnia), co daje **ok. 16,4 tygodnia do gotowości pilotażowej** plus 1–2 tygodnie na pilot i stabilizację. Trzeci programista MOB skraca część mobile do ≈ 11,0 tygodnia (wtedy wąskim gardłem staje się DevOps/BE). Ścieżka zależności przy nieograniczonych zasobach to 167 h – harmonogram jest ograniczony zasobami, nie zależnościami.

## 3. Sugerowane fazy i kolejność

| Faza | Tygodnie (orientacyjnie, zespół z §2) | Zakres (epiki / zadania) | Kamień milowy / wyjście |
|---|---|---|---|
| F0 – Start i rozpoznanie | 1–2 | IMP-001…006, spike'i IMP-600…609, IMP-007/008, IMP-050…057 (scoring), IMP-650 (akceptacja projektanta), zamówienie kont i urządzeń | decyzje spike'ów zapisane; `@polechamp/scoring` z P1–P14 zielony |
| F1 – Rdzeń | 2–6 | EP-02 (contracts, tokens, i18n), EP-03 (API konto i konfiguracja), EP-06 (fundamenty mobile, komponenty), infrastruktura dev/staging (IMP-009…016) | API konfiguracji turnieju na `dev`; DevCatalog z komponentami Nocturne |
| F2 – Organizator + urządzenia | 5–10 | EP-07 (SCR-ORG-00…22), EP-04 (parowanie, sesje, migawka, sync, wyniki, realtime) | organizator konfiguruje turniej i widzi ranking (dane testowe) |
| F3 – Sędzia + offline | 8–13 | EP-08 (SCR-JDG-00…10), EP-09 (SQLite, outbox, SyncEngine) | pełne ocenianie offline na tablecie; TC-SYNC P1 zielone |
| F4 – Wyniki, PDF, RODO, automatyzacja | 11–15 | EP-05, EP-10, EP-11 (E2E, wizualne, k6) | PDF, retencja, macierz uprawnień 100%; E2E nocne zielone |
| F5 – Twardnienie i UAT | 14–17 | EP-12, IMP-408 (pentest), IMP-464/465 (próba generalna), IMP-466 | kryteria wyjścia UAT; brak S1/S2 |
| F6 – Wydanie i pilot | 17–20 | EP-13 (sklepy, produkcja, pilot) | pilotażowy turniej przeprowadzony (kryterium sukcesu MVP) |

Zasady planowania sprintów: zadania z ryzykiem **wysokim** (IMP-127, 146, 147, 206, 305, 310, 350, 354, 457, 458, 465, 500, 556, 603) planować wcześnie w fazie i z przeglądem TL; zadania „poza designem” dopiero po IMP-650 (lub za flagą funkcji); zamrożenie zakresu 1.0 – 3 tygodnie przed pilotem.

## 4. Ścieżka krytyczna

**W jednym zdaniu:** IMP-001 → IMP-002 → IMP-050 → IMP-051 → IMP-052 → IMP-053 → IMP-054 → IMP-055 → IMP-121 → IMP-124 → IMP-125 → IMP-126 → IMP-127 → IMP-261 → IMP-278 → IMP-455 → IMP-457 → IMP-464 → IMP-465 → IMP-555 → IMP-556 (167 h przy nieograniczonych zasobach; w praktyce czas wyznacza obciążenie zespołu mobile).

Elementy ścieżki krytycznej wymagające szczególnej uwagi PM: silnik punktacji (IMP-050…055 – jedna osoba BE, start w 1. tygodniu), blokada kategorii (IMP-127 – ryzyko wysokie), rama kategorii i tryb offline organizatora (IMP-261, IMP-278), E2E pełnego turnieju na dwóch urządzeniach (IMP-457), próba generalna (IMP-464/465), uruchomienie produkcji (IMP-555 – zależne od pentestu IMP-408 i przeglądu sklepów IMP-553).

## 5. Zadania zależne od decyzji biznesowych

| Pytanie | Zadania | Założenie domyślne w planie | Wpływ zmiany decyzji |
|---|---|---|---|
| Q-01 remisy | IMP-054 | Technika → mniej kar → ex aequo | 4–6 h (zmiana komparatora i testów) |
| Q-02 obcięcie do 0 | IMP-052 | tak | 2 h |
| Q-03 wskaźnik „nieruszone” | IMP-309, IMP-313 | brak | +8 h MOB, +2 h DESIGN |
| Q-04 wznowienie turnieju | – | brak w MVP | +16 h (BE + MOB) |
| Q-05 szablon Doubles | IMP-052 | bez „Synchronizacji” | 1 h |
| Q-06, Q-07 terminologia | IMP-070 | teksty z designu | ≤ 4 h |
| **Q-08 akceptacja ekranów poza designem** | IMP-650, IMP-651, wszystkie ekrany SCR-ORG-13…22, SCR-JDG-06…10 | propozycje z dokumentacji | blokuje DoR; bufor poprawek 12 h w IMP-651 |
| Q-09 blokada zrzutów | IMP-402 | brak | +3 h |
| **Q-10 prawnik** | IMP-176, IMP-179, IMP-406, IMP-553, IMP-555 | 24 mies. retencji, dokumenty od prawnika | **blokuje wydanie** bez treści dokumentów |
| Q-11 model biznesowy | – | brak płatności | płatności w aplikacji = osobny projekt |
| Q-14 sędzia główny, średnia obcięta | – (v1.1) | v1.1 | +60–80 h, jeśli pilot wymaga |
| Q-15 numer startowy osoby | IMP-128, IMP-266 | numer per start | +12 h |
| Q-16 anulowanie usunięcia konta | IMP-118 | natychmiastowa dezaktywacja | +4 h |
| Q-17 przyjmowanie odrzuceń (TL-13) | IMP-149 | tak, z audytem | −2 h przy odmowie |
| Q-18 termin układu pionowego (v1.1) | roadmapa v1.1 | przed VI 2027 | twardy termin Google Play (VIII 2027) |
| Q-19 budżet urządzeń / pentest / EAS | IMP-463, IMP-408, IMP-022 | 4 urządzenia, pentest przed pilotem | brak urządzeń = ryzyko jakości testów |

## 6. Ryzyka techniczne po weryfikacji

| ID | Ryzyko | Wpływ | Prawdop. | Mitygacja (zadania) |
|---|---|---|---|---|
| R-01 | Wydajność suwaków na Galaxy Tab A8 | wysoki | średnie | Reanimated 4 + worklety (IMP-310), profilowanie (IMP-500), TC-PERF-004 |
| R-02 | Błędy synchronizacji (duplikaty, utrata ocen) | krytyczny | średnie | idempotencja (IMP-146, 353), TL-12/13/20, TC-SYNC (IMP-458, IMP-469), fast-check |
| R-03 | Sieć hali blokuje WSS | średni | wysokie | odpytywanie (IMP-216), definicja „online” TL-45, TC-SYNC-018 |
| R-04 | PBKDF2 600k za wolne | średni | **niskie** (obniżone) | natywnie quick-crypto; spike IMP-601 z kryterium |
| R-05 | Weryfikator PIN na przejętym tablecie | średni | niskie | nowy schemat TL-04 (pepper w Keystore, weryfikator zaszyfrowany), unieważnianie urządzeń |
| R-06 | Niezaszyfrowana SQLite tabletu | średni | niskie | szyfrowanie urządzenia, usuwanie po 7 dniach (IMP-319), wyjątek MASVS-STORAGE-1 L2; SQLCipher w v1.1 |
| R-07 | Animacja splash w RN | niski | średnie | spike IMP-606 (Skia vs sprite) |
| R-08 | Złożoność AWS dla małego zespołu | średni | średnie | moduły Terraform, budżety (IMP-007, IMP-029) |
| R-09 | Rozjazd punktacji klient/serwer | wysoki | niskie | jeden pakiet, TC-SCORING-031 (parzystość Node/Hermes) |
| R-10 | Zmiany designu po akceptacji | średni | średnie | IMP-650 na początku, wzorce wizualne (IMP-653) |
| R-11 | Aktualizacje SDK / OTA w sezonie | średni | średnie | `runtimeVersion` fingerprint, freeze-guard (IMP-017), jedna aktualizacja SDK przed 1.0 (IMP-507) |
| R-12 | Wymogi App Store / Google Play | średni | **średnie** (podniesione) | usuwanie konta Must (TL-22), deklaracje prywatności (IMP-407), turniej do przeglądu (IMP-553) |
| RT-01 | Expo SDK 58 świeży (8 dni) – niezgodności modułów natywnych | średni | średnie | spike IMP-600, fallback SDK 57 |
| RT-02 | NestJS 12 świeży (ESM, mniej przykładów) | średni | średnie | ADR-012, testy kontraktowe; fallback NestJS 11 + Node 24 przy blokadzie |
| RT-03 | Złożoność kryptografii weryfikatora PIN (TL-04) po obu stronach | wysoki | niskie | wspólne wektory testowe API/mobile (IMP-144, IMP-305), przegląd TL |
| RT-04 | Trwałość SQLite vs czas zapisu (fsync) | wysoki | średnie | spike IMP-603 z kryterium 100 ms |
| RT-05 | Komponent arkusza (bottom sheet) | średni | średnie | własny `Sheet` (IMP-206, 16 h) |
| RT-06 | Przegląd w sklepach (tryb sędziego na jednym urządzeniu, iPad) | średni | średnie | turniej do przeglądu z długoważnym kodem (IMP-178, IMP-553) |
| RT-07 | Termin układu pionowego tabletu (Google Play target API 37, VIII 2027) | wysoki | wysokie | ADR-013: nakładka w MVP, układ pionowy w v1.1 przed VI 2027 (Q-18) |
| RT-08 | Czas oczekiwania na konta (Apple D-U-N-S, Google weryfikacja), dostęp produkcyjny SES | średni | średnie | zamówienie w F0 (PM) |
| RT-09 | Dostępność urządzeń referencyjnych i farmy | średni | średnie | zakup w F0, emulatory w CI |
| RT-10 | Opóźniona treść prawna (regulamin, polityka, DPA) | wysoki | średnie | zlecenie prawnikowi w F0; materiały IMP-406 |

## 7. Zależności zewnętrzne

| Od kogo | Co | Kiedy potrzebne | Zadania |
|---|---|---|---|
| Projektant | akceptacja ekranów poza designem i propozycji TL (Q-08), ikona, zasoby sklepów, akceptacja wzorców wizualnych | tydz. 1–2 (akceptacja), F4 (wzorce), F6 (sklepy) | IMP-650…653, IMP-551 |
| Prawnik | regulamin, polityka prywatności, umowa powierzenia (z TOM), retencja, zgody opiekunów, wyjątek RODO TL-17 (Q-10) | przed F5 (UAT), najpóźniej przed IMP-553 | IMP-179, IMP-406, IMP-553 |
| Organizator pilotażowy | regulamin zawodów (kryteria, kary, remisy), termin pilotu, udział w UAT, tablety i sędziowie | F4 (dane), F5 (UAT), F6 (pilot) | IMP-464, IMP-465, IMP-556 |
| PO | decyzje Q-01…Q-07, Q-09, Q-14…Q-18 | przed fazą, w której jest zadanie | §5 |
| PM / firma | konta Apple Developer (organizacja, D-U-N-S) i Google Play, konto AWS (Organizations), domena `polechamp.app`, plan EAS i Sentry, wniosek SES production, firma pentestowa, urządzenia referencyjne | F0 | IMP-007, IMP-013, IMP-022, IMP-408, IMP-463, IMP-550 |
| Dyżur w dniu zawodów | grafik dyżurów, okna zamrożenia w `ops/freeze-windows.yaml` | przed UAT i pilotem | IMP-017, IMP-554 |

## 8. Co przekazać do README (Agent 3)

- Mapa dokumentacji: `00-research`, `01-architecture` (z `98-weryfikacja-tech-leada.md` i ADR-001…013), `02-specification`, `03-test-plans`, `04-implementation-plans`.
- Konwencje ID: FR, NFR, US, SCR, ADR, UI, G, D-SC, D-AR, INT, Q, TL, TC, IMP, FX (fikstury), RT (ryzyka po weryfikacji).
- Stos po weryfikacji: Expo SDK 58 / React Native 0.88 / TypeScript 6, NestJS 12 na Node 26 LTS, PostgreSQL 18 (RDS), Drizzle, zod 4, Socket.IO 4.8, BullMQ, pdfmake, AWS eu-central-1, Terraform, GitHub Actions, EAS.
