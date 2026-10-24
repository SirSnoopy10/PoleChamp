# Budżet (szacunek)

> Dokument: `05-project-management/08-budzet.md` · Project Manager (Agent 3) · Wersja 1.0 · 24.10.2026
> Podstawa: godziny z [99-przekazanie-dla-pm §1–§2](../04-implementation-plans/99-przekazanie-dla-pm.md#1-suma-szacunków) i [planu sprintów](03-plan-sprintow.md), koszty AWS z [98-weryfikacja §5](../01-architecture/98-weryfikacja-tech-leada.md#5-zgrubny-koszt-środowisk-aws), alokacja zespołu z [00-zalozenia](00-zalozenia-planistyczne.md#2-założenia).
> **Wszystkie stawki, ceny i kurs są założeniami (oznaczone ⚠)** do potwierdzenia przez sponsora przed akceptacją budżetu. Kwoty netto (bez VAT), w PLN. Okres budżetu MVP: 26.10.2026–30.04.2027 (SP-01…SP-13).

## 1. Parametry i założenia kosztowe

| Parametr | Wartość | Uwagi |
|---|---|---|
| ⚠ Stawka BE | 170 PLN/h | B2B, senior/mid, rynek PL 2026 |
| ⚠ Stawka MOB (React Native/Expo) | 170 PLN/h | j.w. |
| ⚠ Stawka QA (automatyzacja) | 140 PLN/h | j.w. |
| ⚠ Stawka DevOps (AWS, Terraform) | 190 PLN/h | j.w. |
| ⚠ Stawka projektanta | 150 PLN/h | j.w. |
| ⚠ Stawka Tech Leada | 210 PLN/h | 0,5 etatu przez cały projekt (poza szacunkiem zadań) |
| ⚠ Stawka PM | 160 PLN/h | 0,5 etatu |
| PO | po stronie zamawiającego | nie wliczono |
| ⚠ Kurs | 1 USD = 4,00 PLN | koszty usług w USD |
| Godziny płatne | 8 h/dzień roboczy × etat; dni świąteczne i 50% w okresie świątecznym nie są płatne (B2B) | 118 dni roboczych efektywnych w SP-01…SP-13 |
| Godziny efektywne | 6 h/dzień (ZAL-02) | godziny z buforem 2308 h odpowiadają 3077 h płatnym |

## 2. Koszt pracy

### 2.1 Według alokacji zespołu (podstawa budżetu)

| Rola | Alokacja | Osobodni płatnych | Godzin płatnych | Stawka ⚠ | Koszt (PLN) |
|---|---|---|---|---|---|
| BE | 2 × 1,0 (SP-01…SP-13) | 236,0 | 1 888 | 170 | 320 960 |
| MOB | 2 × 1,0 (SP-01…SP-13) | 236,0 | 1 888 | 170 | 320 960 |
| QA | 0,5 (SP-02), 1,0 (SP-03…SP-13) | 104,0 | 832 | 140 | 116 480 |
| DevOps | 1,0 (SP-01…SP-03), 0,5 (SP-04…SP-13) | 73,5 | 588 | 190 | 111 720 |
| Projektant | 0,6 (SP-01), 0,2 (SP-02…SP-13) | 27,2 | 218 | 150 | 32 640 |
| Tech Lead | 0,5 | 59,0 | 472 | 210 | 99 120 |
| PM | 0,5 | 59,0 | 472 | 160 | 75 520 |
| **Razem praca** | | | **6 358** | | **1 077 400** |

### 2.2 Kontrola krzyżowa – według godzin zadań

| Rola | h zadań z buforem (TL) | h płatne (× 8/6) | Koszt (PLN) |
|---|---|---|---|
| BE (+ ½ FULL) | 746 | 995 | 169 093 |
| MOB (+ ½ FULL) | 986 | 1 315 | 223 493 |
| QA | 308 | 411 | 57 493 |
| DevOps | 219 | 292 | 55 480 |
| Projektant | 48 | 64 | 9 600 |
| **Razem zadania** | **2 307** (2308 h w sumie całkowitej – różnica z zaokrągleń per rola) | **3 077** | **515 160** |
| + TL i PM (alokacja) | | | 174 640 |
| **Razem – wariant „tylko zadania”** | | | **689 800** |

Różnica między 2.1 a 2.2 (ok. 388 tys. PLN) to pojemność zespołu niewykorzystana przez zadania IMP: przede wszystkim BE w SP-08…SP-13, MOB w SP-10…SP-13 i role częściowe po fazie startowej. W planie jest ona **rezerwą na defekty z E2E/UAT/pentestu, wsparcie QA i przygotowanie v1.1** (ZAL-12, BL-01). Wariant 2.2 jest dolną granicą kosztu i wymagałby elastycznego zwalniania osób z projektu.

## 3. Infrastruktura, usługi i licencje (okres MVP)

| Pozycja | Założenie ⚠ | USD | PLN |
|---|---|---|---|
| AWS `dev` | ≈ 80 USD/mies. × 6 mies. (XI 2026–IV 2027) | 480 | 1 920 |
| AWS `staging` | ≈ 150 USD/mies. × 5 mies. (od XII 2026) | 750 | 3 000 |
| AWS `production` | ≈ 385 USD/mies. × 1 mies. (od 30.03.2027) | 385 | 1 540 |
| Sentry Team (region UE) | ≈ 30 USD/mies. × 6 | 180 | 720 |
| EAS (plan Production) | ≈ 199 USD/mies. × 6 (górna granica z 98-weryfikacji) | 1 194 | 4 776 |
| GitHub Team | 4 USD/użytkownik/mies. × 10 × 6 | 240 | 960 |
| Maestro Cloud lub runner macOS dla E2E iOS (opcja, Q-19) | ≈ 250 USD/mies. × 4 (XII–III) | 1 000 | 4 000 |
| Apple Developer Program (rok), Google Play (jednorazowo), domena `.app` (rok) | 99 + 25 + ok. 20 | 144 | 576 |
| Menedżer haseł zespołu | ≈ 5 USD/użytkownik/mies. × 10 × 6 | 300 | 1 200 |
| **Razem** | | **4 673** | **18 692** |

Koszty AWS wg [98-weryfikacja §5](../01-architecture/98-weryfikacja-tech-leada.md#5-zgrubny-koszt-środowisk-aws) – do przeliczenia w AWS Pricing Calculator przed akceptacją (zakres produkcji 350–450 USD/mies.). Oszczędności: nocne skalowanie `staging` do 0 (IMP-029), Fargate Spot dla workera, wyłączenie `dev` w nocy.

## 4. Pozycje jednorazowe

| Pozycja | Założenie ⚠ | PLN |
|---|---|---|
| Urządzenia referencyjne | iPhone 12 (używany) ≈ 1 400, Pixel 6a (używany) ≈ 900, iPad 9. gen. ≈ 1 700, Galaxy Tab A8 ≈ 800 | 4 800 |
| Tablety zapasowe na UAT i pilot | iPad 9. gen. + Galaxy Tab A8 | 2 500 |
| Router sterowany, powerbanki (4), kable, ładowarki, stojaki | – | 1 400 |
| Pentest zewnętrzny (API + iOS + Android, z retestem) | zakres rynkowy 30–45 tys. PLN | 38 000 |
| Prawnik (regulamin, polityka prywatności, umowa powierzenia, opinia RODO) | zakres 8–15 tys. PLN | 12 000 |
| Logistyka próby generalnej i pilota (dojazdy, nocleg 2 os. × 2 wydarzenia, podziękowania dla sędziów i wolontariuszek, druk kart papierowych) | – | 5 500 |
| **Razem** | | **64 200** |

## 5. Podsumowanie

| Pozycja | PLN |
|---|---|
| Praca (alokacja zespołu – §2.1) | 1 077 400 |
| Infrastruktura, usługi i licencje (§3) | 18 692 |
| Pozycje jednorazowe (§4) | 64 200 |
| **Razem bazowo** | **1 160 292** |
| Rezerwa zarządcza 10% (zmiany stawek, zakresu, kursu, ryzyka RP-09) | 116 029 |
| **Razem z rezerwą (rekomendowany budżet MVP)** | **1 276 321** |

Bufor ryzyka (328 h) i narzut 15% (301 h) są już w godzinach zadań – rezerwa zarządcza ich nie dubluje. Wydatkowanie rezerwy zatwierdza PO (powyżej 25 tys. PLN – komitet sterujący).

### 5.1 Profil wydatków (praca + usługi, szacunek)

| Miesiąc | Główne pozycje | PLN |
|---|---|---|
| X 2026 (tydzień 0) | urządzenia, konta Apple/Google, domena | 9 276 |
| XI 2026 | start zespołu (DevOps 1,0, projektant 0,6 w SP-01, QA od SP-02), zaliczka dla prawnika | 192 236 |
| XII 2026 | pełny zespół, okres świąteczny (50% od 21.12), `staging`, farma urządzeń | 163 716 |
| I 2027 | pełny zespół (ferie zimowe – ryzyko RP-02) | 165 916 |
| II 2027 | pełny zespół | 183 996 |
| III 2027 | pełny zespół, pentest, próba generalna, rozliczenie prawnika | 248 826 |
| IV 2027 | rezerwa SP-12, produkcja AWS, pilot | 196 326 |
| **Razem** | | **1 160 292** |

Profil liczony dzień po dniu z alokacji (§2.1), świąt i okresu 50% (ZAL-03, ZAL-04); praca PM w tygodniu 0 (26–30.10, ok. 2,5 osobodnia ≈ 3 200 PLN) jest pokrywana z rezerwy zarządczej.

## 6. Opcje optymalizacji

| Opcja | Oszczędność (PLN) | Wpływ / ryzyko | Decyzja |
|---|---|---|---|
| Zwolnienie jednej osoby BE po SP-08 (BE bez zadań IMP w SP-09…SP-10) | −65 280 | mniejsza rezerwa na defekty i pentest, większe ryzyko RP-11 | przegląd SP-07 (5.02.2027), PM + TL |
| Projektant „na zlecenie” zamiast 0,2 etatu (zadania 48 h + projekt G-30 ≈ 120 h) | −14 640 | dłuższy czas reakcji na pytania UI | PO, do M2 |
| DevOps 0,5 etatu od początku (wariant D) | −22 040 | +2 tygodnie do gotowości pilotażowej (Wielkanoc), spike IMP-604 w SP-05 | **nie rekomendowane** |
| EAS Starter zamiast Production poza okresami wydań | do −3 500 | limity buildów | PM, co miesiąc |
| Runner macOS (GitHub) zamiast Maestro Cloud | do −2 500 | utrzymanie po stronie DevOps | QA + DevOps, do 11.12.2026 |

## 7. Koszty po pilocie (poza budżetem MVP)

| Pozycja | Szacunek |
|---|---|
| Utrzymanie infrastruktury i usług (produkcja ≈ 385, `staging` ≈ 100–150, `dev` ≈ 60–80, Sentry ≈ 30, EAS 19–199 USD/mies.) | ok. 600–850 USD/mies. (2 400–3 400 PLN/mies.) |
| v1.1 – etap 1 (SP-14…SP-15: 2 MOB, 0,5 BE, 0,5 QA, 0,2 projektant, 0,25 TL, 0,25 PM, 0,25 DevOps) | ok. 96 000 PLN |
| v1.1 – etap 2 i v2 | do wyceny po warsztacie priorytetów (M8, 29.04.2027) |
| Apple Developer Program (kolejne lata) | 99 USD/rok |

## 8. Rejestr zmian

| Data | Wersja | Zmiana | Autor |
|---|---|---|---|
| 24.10.2026 | 1.0 | Pierwsza wersja (wariant bazowy A) | PM |
