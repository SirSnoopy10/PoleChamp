# Raport spójności dokumentacji

> Dokument: `05-project-management/99-raport-spojnosci.md` · Project Manager (Agent 3) · Wersja 1.0 · 24.10.2026
> Zakres: cały katalog `docs/` (76 plików Markdown: 63 dokumenty Architekta i Tech Leada, 12 dokumentów PM, [README](../README.md)). Kontrola wykonana skryptami PM i skryptami kontrolnymi poprzednich agentów (sprawdzanie linków, parser Mermaid) oraz przeglądem ręcznym.
> Zasada: drobne niespójności redakcyjne poprawiono od razu; kwestie merytoryczne (decyzje Architekta/TL) opisano jako **otwarte** z właścicielem rozstrzygnięcia – bez zmiany decyzji.

## 1. Wynik kontroli

| # | Sprawdzenie | Metoda | Wynik |
|---|---|---|---|
| 1 | Linki względne i kotwice w całym `docs/` | skrypt kontroli linków (slugi nagłówków jak w generatorze TL, kotwice `<a id>`) | **4485 linków, 0 błędnych** (w trakcie prac 13 błędów w nowych plikach PM – poprawione, PM-13) |
| 2 | Każde użyte ID jest zdefiniowane | skrypt PM z granicami słów (§3) | **0 niezdefiniowanych** w 25 klasach ID |
| 3 | Spójność liczb (zadania, godziny, TC, ścieżka krytyczna) | wyszukiwanie wartości we wszystkich plikach (§4) | spójne; jedna różnica zaokrągleń (2307 vs 2308 h) opisana w [08-budzet](08-budzet.md) |
| 4 | Spójność dat (kamienie milowe, UAT, pilot, sprinty) | wyszukiwanie dat M0…M9 i SP-NN w dokumentach PM i README | spójne we wszystkich 13 plikach PM/README |
| 5 | Plan sprintów vs indeks zadań | skrypt kontroli planu ([03-plan-sprintow §4](03-plan-sprintow.md#4-kontrola-poprawności-planu)) | 250/250 zadań w dokładnie jednym sprincie; 493 zależności TL, 36 zależności PM i 708 relacji bramki RC bez naruszeń; suma 1679 h; maks. obciążenie roli 100% |
| 6 | Zakres MVP vs plan sprintów | pokrycie FR/SCR z modelu TL × przypisanie do sprintów | 80/80 FR w MVP i 35/35 ekranów MVP realizowanych w SP-01…SP-11; brak zadań dla FR-407, FR-709, SCR-PUB-01 (poza MVP – zgodnie z [02-zakres-mvp](../02-specification/02-zakres-mvp.md)) |
| 7 | Diagramy Mermaid | parser `mermaid` 11 (node + jsdom) na wszystkich blokach | **26 diagramów, 0 błędów** (1 błąd w nowym `quadrantChart` – poprawiony, PM-14) |
| 8 | Terminologia, statusy i role | porównanie z [10-glosariusz](../02-specification/10-glosariusz.md), [00-konwencje §9](../04-implementation-plans/00-konwencje-i-definition-of-done.md#9-format-karty-zadania) | statusy (W przygotowaniu / Trwa / Zakończona, nierozegrana, wycofana, odrzucone zgłoszenie) i role zadań (BE, MOB, FULL, DEVOPS, QA, DESIGN) spójne; kolizje prefiksów ID i pisownia „spike'i” – PM-08, PM-09 |
| 9 | Język dokumentów | heurystyka słów funkcyjnych PL/EN poza blokami kodu | wszystkie 76 plików po polsku (angielskie wyłącznie nazwy własne i terminy techniczne, np. „Definition of Done”) |
| 10 | Pliki generowane | porównanie ze źródłami w generatorze TL | pliki `03-test-plans/*`, `04-implementation-plans/*` i `98-weryfikacja-tech-leada.md` **nie były edytowane** przez PM; poprawki redakcyjne PM dotyczą wyłącznie `99-przekazanie-dla-tech-leada.md` (plik niegenerowany) |

## 2. Znaleziska

Status: **poprawione** – zmiana naniesiona; **poprawione w planie PM** – uwzględnione w dokumentach PM bez zmiany dokumentów TL; **otwarte** – wymaga decyzji wskazanej osoby.

| ID | Znalezisko | Plik(i) | Status | Kto rozstrzyga |
|---|---|---|---|---|
| PM-01 | Skrypt kontrolny poprzednich agentów raportował 9 niezdefiniowanych identyfikatorów FR i 1 identyfikator UI – fałszywe trafienia (wzorzec dopasowywał końcówkę `NFR-1xx/4xx/9xx` oraz fragment `TC-UI-00x`). Kontrola PM z granicami słów: 0 niezdefiniowanych. | narzędzia kontrolne (poza `docs/`) | poprawione (w narzędziu PM) | – |
| PM-02 | Spike'i IMP-604 i IMP-608 nie mogą zakończyć się w 1.–2. tygodniu, jak zakładają [90-graf §3](../04-implementation-plans/90-graf-zaleznosci.md#3-ścieżka-krytyczna) i F0 w [99-przekazanie-dla-pm §3](../04-implementation-plans/99-przekazanie-dla-pm.md#3-sugerowane-fazy-i-kolejność): IMP-604 zależy od IMP-011 (łańcuch DevOps ok. 44 h), IMP-608 od IMP-454 (Maestro w CI). W planie: IMP-604 30.11–1.12.2026 (5. tydzień, przy DevOps 1,0 etatu), IMP-608 16–17.12.2026 (7. tydzień). | 90-graf-zaleznosci.md, 99-przekazanie-dla-pm.md | otwarte (plan PM to uwzględnia) | TL – akceptacja albo zmiana zależności (np. spike na tymczasowym ALB w `dev`) |
| PM-03 | Wniosek TL „ok. 16,4 tygodnia do gotowości pilotażowej” nie obejmuje świąt i okresu świątecznego, ścieżki wydania (bramka RC, UAT, pentest, przegląd w sklepach) ani przejścia wąskiego gardła z MOB na QA. Symulacja PM: ok. 21,7 tygodnia do M7 (2.11.2026 → 2.04.2027) i 25 tygodni do pilota (24.04.2027). | 99-przekazanie-dla-pm.md §2 | poprawione w planie PM | PM (informacja dla TL) |
| PM-04 | TL liczył zadania FULL po połowie BE/MOB; PM przypisał je do BE (poza IMP-465 i IMP-556), bo MOB jest wąskim gardłem (ZAL-10). | 99-przekazanie-dla-pm.md §2, [00-zalozenia](00-zalozenia-planistyczne.md) | poprawione w planie PM | TL – potwierdzenie |
| PM-05 | IMP-650 (16 h) ma się odbyć w 1.–2. tygodniu ([15-design-i-akceptacje](../04-implementation-plans/15-design-i-akceptacje.md)), a założony projektant 0,2 etatu (≈ 6 h efektywnie/tydz.) wykona go dopiero w 3.–4. tygodniu, blokując DoR 22 zadań MOB. PM zwiększył alokację projektanta w SP-01 do 0,6 etatu (ZAL-07). | 15-design-i-akceptacje.md, 99-przekazanie-dla-pm.md §2 | poprawione w planie PM | PO – zgoda na koszt (ok. +4 tys. PLN) |
| PM-06 | IMP-406 (materiały RODO dla prawnika) zależy od IMP-176 (retencja) i przypada na SP-07 (4–5.02.2027), a treść prawna blokuje wydanie (Q-10). Mitygacja PM: materiały wstępne w tygodniu 0, opinia prawnika do 22.01.2027, projekty do 19.02.2027 (RT-10, RP-06). | 10-bezpieczenstwo-i-rodo.md (IMP-406) | otwarte | TL (ew. usunięcie zależności IMP-406 → IMP-176) + PO |
| PM-07 | Termin „Google Play target API 37 od VIII 2027” (ADR-013, RT-07, Q-18) to prognoza rocznego cyklu – na 24.10.2026 Google ogłosił oficjalnie wymóg API 36 (od 31.08.2026), nie API 37. Plan PM: v1.1 do 28.05.2027, limit wewnętrzny 31.07.2027. | ADR-013, 02-zakres-mvp.md, 99-przekazanie-dla-pm.md | otwarte (monitorowanie ZZ-15) | TL |
| PM-08 | Kolizje prefiksów ID: `P1…P14` (przykłady punktacji), `P1…P4` (priorytety TC), `P1…P6` (persony); `S1…S35` (źródła) i `S1…S4` (wagi defektów); `R-NN` (ryzyka) i `R-ORG`… (role); `E1…E9` (epiki US) i `EP-NN`. Rozróżnienie opisano w [README §6](../README.md#6-konwencje-identyfikatorów); PM używa `SP-NN` dla sprintów. | 01-role-i-persony.md, 07-reguly-punktacji.md, 00-strategia-testowania.md, 01-analiza-konkurencji.md | poprawione (opis); zmiana numeracji – otwarta propozycja (np. persony `PER-NN`) | PO / TL (opcjonalnie) |
| PM-09 | Pisownia „spike’i” (apostrof typograficzny – nazwa EP-14 w generatorze) i „spike'i” (ASCII) używane zamiennie. | 14-spike.md, 91-indeks-zadan.md, 90-graf-zaleznosci.md i inne | otwarte (kosmetyka) | TL – ujednolicenie w generatorze |
| PM-10 | Zależności kart nie wymuszają ukończenia wszystkich funkcji przed UAT (IMP-464 zależy tylko od IMP-457) – bez dodatkowej reguły próba generalna mogłaby się odbyć przed zakończeniem prac MOB. PM dodał **bramkę RC**: IMP-464, IMP-466 i IMP-408 po wszystkich zadaniach funkcjonalnych. | 11-qa-i-automatyzacja-testow.md, 13-wydanie.md | poprawione w planie PM | TL – propozycja dopisania reguły w 00-konwencje lub kartach |
| PM-11 | Zadania fundamentowe bez następników (IMP-006 środowisko lokalne, IMP-018 logowanie, IMP-102 walidacja, IMP-070 i IMP-219 teksty i i18n) formalnie mogłyby trafić na koniec projektu. PM dodał zależności porządkowe (†): przed pierwszymi migracjami, endpointami i ekranami. | 01-fundamenty-i-devops.md, 02-pakiety-wspoldzielone.md, 03-backend-…md, 06-mobile-…md | poprawione w planie PM | TL – propozycja dopisania do kart |
| PM-12 | DoR „ekrany poza designem po akceptacji projektanta” ([00-konwencje §4](../04-implementation-plans/00-konwencje-i-definition-of-done.md#4-definition-of-ready)) nie jest odwzorowana w zależnościach kart; PM dodał zależność od IMP-650 dla 22 zadań MOB. | 07-mobile-ekrany-organizatora.md, 08-mobile-ekrany-sedziego.md | poprawione w planie PM | TL (opcjonalnie w kartach) |
| PM-13 | Błędne kotwice w nowych dokumentach PM (slug nagłówka z „go/no-go” → `gono-go`, sekcja budżetu) i linki do nieistniejącego wtedy raportu – 13 błędów. | dokumenty PM, README | poprawione | – |
| PM-14 | Błąd parsowania nowego diagramu `quadrantChart` (polskie znaki w etykietach bez cudzysłowów). | 05-rejestr-ryzyk.md | poprawione | – |
| PM-15 | IMP-551 (wpisy w sklepach – zrzuty ekranów) i IMP-552 (dystrybucja pilotażowa) zależą tylko od kont i zasobów graficznych, więc formalnie mogłyby wejść w SP-02/SP-03. PM dodał zależności porządkowe: IMP-551 po IMP-651, IMP-552 po IMP-457. | 13-wydanie.md | poprawione w planie PM | TL (opcjonalnie) |
| PM-16 | Suma godzin z buforem per rola w [99-przekazanie-dla-pm §2](../04-implementation-plans/99-przekazanie-dla-pm.md#2-założenia-o-składzie-zespołu-i-czas-trwania) (746 + 986 + 308 + 219 + 48 = 2307 h) różni się o 1 h od sumy całkowitej 2308 h (zaokrąglenia per rola). | 99-przekazanie-dla-pm.md, 08-budzet.md | poprawione (opis w budżecie) | – |
| PM-17 | Opis numeracji US w przekazaniu Architekta („dziesiątki = epik E0–E9”) był niezgodny z [04-user-stories](../02-specification/04-user-stories.md) (epiki E1…E9; US-05x i US-06x należą do E6); tabela konwencji podawała zakres `Q-01 … Q-14` bez Q-15…Q-19. | 01-architecture/99-przekazanie-dla-tech-leada.md §2 | poprawione (redakcyjnie) | – |
| PM-18 | Według kart konta sklepów są potrzebne dopiero w IMP-550 (SP-10, 8.03.2027), ale poświadczenia EAS dla iOS (IMP-022, 16.11.2026) wymagają konta Apple już w SP-02, a weryfikacja kont organizacyjnych (D-U-N-S) może trwać tygodnie. | 01-fundamenty-i-devops.md (IMP-022), 13-wydanie.md (IMP-550) | poprawione w planie PM (ZZ-01, ZZ-02 – wnioski 26.10.2026) | PM |
| PM-19 | Pojemność QA: w SP-01 brak zadań QA (pierwsze możliwe – IMP-056/IMP-450 po silniku punktacji), a w SP-09…SP-10 QA ma 93–98% obciążenia i staje się wąskim gardłem końcówki. PM przesunął start QA na SP-02 (0,5 etatu) i opisał ryzyko RP-11. | 11-qa-i-automatyzacja-testow.md, 99-przekazanie-dla-pm.md §2 | poprawione w planie PM | PM, TL |

## 3. Identyfikatory – zdefiniowane i użyte

| Klasa | Miejsce definicji (sprawdzane) | Zdefiniowane | Użyte | Niezdefiniowane |
|---|---|---|---|---|
| FR | 03-wymagania-funkcjonalne (wiersze tabel) | 82 | 82 | 0 |
| NFR | 08-wymagania-niefunkcjonalne | 68 | 68 | 0 |
| US | 04-user-stories (nagłówki) | 55 | 55 | 0 |
| SCR | 05/06-ekrany, 03-analiza-designu | 36 | 36 | 0 |
| ADR | `01-architecture/adr/` | 13 | 13 | 0 |
| TC | kotwice w `03-test-plans/` | 703 | 703 | 0 |
| IMP | nagłówki kart w `04-implementation-plans/` | 250 | 250 | 0 |
| Q | 99-przekazanie-dla-tech-leada §5, 98-weryfikacja §8 | 19 | 19 | 0 |
| R | 99-przekazanie-dla-tech-leada §6 | 12 | 12 | 0 |
| RT | 99-przekazanie-dla-pm §6 | 10 | 10 | 0 |
| RP | 05-rejestr-ryzyk | 14 | 14 | 0 |
| TL | 98-weryfikacja §6 | 56 | 56 | 0 |
| UI | 03-analiza-designu §6 | 15 | 15 | 0 |
| G | 03-analiza-designu §9 | 32 | 32 | 0 |
| D-SC | 07-reguly-punktacji §9 | 12 | 12 | 0 |
| D-AR | 01-przeglad-architektury §7 | 7 | 7 | 0 |
| INT | 02-model-danych §5 | 10 | 10 | 0 |
| EP | 91-indeks-zadan §1 | 15 | 15 | 0 |
| FX | 00-strategia-testowania §5 | 11 | 11 | 0 |
| M | 02-kamienie-milowe | 10 | 10 | 0 |
| SP | 03-plan-sprintow, 04-harmonogram | 15 | 15 | 0 |
| ZAL | 00-zalozenia-planistyczne | 20 | 20 | 0 |
| ZZ | 06-decyzje-i-zaleznosci-zewnetrzne | 16 | 16 | 0 |
| BL | 10-backlog-po-pilocie | 31 | 31 | 0 |
| PM | ten dokument | 19 | 19 | 0 |

## 4. Kluczowe liczby – porównanie

| Wartość | 91-indeks | 99-przekazanie-dla-pm | 98-weryfikacja / 00-strategia | Dokumenty PM | README |
|---|---|---|---|---|---|
| Zadania IMP | 250 | 250 | 250 | 250 (plan sprintów, roadmapa, kamienie milowe) | 250 |
| Godziny bez buforów | 1679 h | 1679 h | 1679 h | 1679 h (suma w planie sprintów) | 1679 h |
| Bufor ryzyka / narzut / razem | 328 h / – / 2007 h z buforem ryzyka | 328 h / 301 h / 2308 h | – | 2308 h (plan sprintów, budżet) | 328 / 301 / 2308 h |
| Przypadki testowe | – | – | 703 (P1 480, P2 163, P3 53, P4 7) | odwołania do grup TC | 703 |
| Ścieżka krytyczna | – | 167 h, 21 zadań | – (90-graf: 167 h, 21 zadań) | 167 h ([04-harmonogram §7](04-harmonogram.md#7-ścieżka-krytyczna-w-kalendarzu)) | 167 h |
| FR w MVP / ekrany MVP | 80 / 35 (brak luk) | – | 80 FR (98 §10) | 80 / 35 ([01-roadmapa §2](01-roadmapa.md#2-wersje-produktu)) | 80 / 35 |

## 5. Zalecenia dla kolejnych aktualizacji

1. Przed każdym kamieniem milowym uruchamiać kontrolę linków, identyfikatorów, planu sprintów i Mermaid (zakres jak w §1) i aktualizować ten raport.
2. Zmiany kart zadań (TL) → przeliczenie planu sprintów przez PM na najbliższym planowaniu i wpis w [03-plan-sprintow §5](03-plan-sprintow.md#5-rejestr-zmian-planu).
3. Otwarte znaleziska PM-02, PM-06, PM-07 i PM-10 omówić na przeglądzie architektury w SP-01 (do 13.11.2026).

## 6. Rejestr zmian

| Data | Wersja | Zmiana | Autor |
|---|---|---|---|
| 24.10.2026 | 1.0 | Pierwsza kontrola spójności całej dokumentacji | PM |
