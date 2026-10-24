# EP-02 – Pakiety współdzielone

> Dokument: `04-implementation-plans/02-pakiety-wspoldzielone.md` · Tech Lead (Agent 2) · 23.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md)

Silnik punktacji `@polechamp/scoring` (wspólny dla tabletu, API i PDF – [ADR-006](../01-architecture/adr/ADR-006-model-punktacji-i-agregacji.md), [ADR-011](../01-architecture/adr/ADR-011-monorepo-i-wspoldzielony-silnik-punktacji.md)), kontrakty `@polechamp/contracts` (zod 4 + OpenAPI 3.1 – [ADR-012](../01-architecture/adr/ADR-012-kontrakty-walidacja-i-openapi.md)), tokeny Nocturne i i18n. Silnik punktacji leży na ścieżce krytycznej ([90-graf-zaleznosci.md](90-graf-zaleznosci.md)) – zadania IMP-050…057 należy realizować jako pierwsze po szkielecie repozytorium, najlepiej przez jedną osobę BE z przeglądem TL. Wszystkie przykłady P1–P14 i decyzje D-SC-01…12 są przypadkami testowymi tych zadań.

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 21 | 127 h | BE 89 · MOB 10 · FULL 18 · QA 10 |


## Zadania

### IMP-050 – @polechamp/scoring – szkielet pakietu
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** BE
- **Cel:** Pakiet `@polechamp/scoring` buduje się do ESM z typami, działa jednakowo w Node i w React Native i nie może zaimportować żadnego modułu platformowego.
- **Zakres:** Struktura `src/` (types, fixed-point, sheet, aggregate, rank, format, progress, canonical), build `tsup` (ESM + d.ts), Vitest 5, reguła `no-restricted-imports` (zakaz `node:*`, `react-native`, `expo-*`); **Poza zakresem:** –
- **Zależności:** [IMP-001](01-fundamenty-i-devops.md#imp-001--monorepo-pnpm-workspaces--turborepo--bazowa-konfiguracja-ts), [IMP-002](01-fundamenty-i-devops.md#imp-002--lint-formatowanie-i-hooki-git)
- **Odwołania:** ADR-011, ADR-006
- **Kroki:**
  1. Utwórz `packages/scoring/package.json` (`"type": "module"`, `exports` → `dist/index.js` + `dist/index.d.ts`, `sideEffects: false`, zero `dependencies`).
  2. Dodaj szkielety modułów `src/{types,fixed,sheet,aggregate,rank,format,progress,canonical,templates}.ts` i `src/index.ts` z jawnymi eksportami.
  3. Skonfiguruj `tsup.config.ts` (ESM, `dts: true`, `target: es2022`) i skrypt `build` w turbo.
  4. Skonfiguruj `vitest.config.ts` z `coverage.thresholds.branches = 100` i `include: ['src/**']`.
  5. Dodaj w `eslint.config.mjs` blok `no-restricted-imports` dla `packages/scoring/**` (`node:*`, `react-native`, `expo-*`, `big.js` poza testami) i test przykładowy `src/index.test.ts`.
  6. Otwórz PR `IMP-050: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Pakiet importowany przez `apps/api` i `apps/mobile` (Metro)
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

### IMP-051 – scoring: typy i arytmetyka stałoprzecinkowa
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** BE
- **Cel:** Wszystkie obliczenia punktów odbywają się na liczbach całkowitych (dziesiąte i setne), więc 8,5 × 1,5 zawsze daje dokładnie 12,75 bez błędów zmiennoprzecinkowych.
- **Zakres:** Typy `Tenths`, `Hundredths` (branded), `toTenths(decimal)` z walidacją kroku 0,5, `roundHalfUpDiv(num, den)`, walidatory domen (skala 1–20, waga 5–50 dziesiątych, kara 5–500, maks. 1–10); **Poza zakresem:** Formatowanie (IMP-055)
- **Zależności:** [IMP-050](#imp-050--polechampscoring--szkielet-pakietu)
- **Odwołania:** ADR-006, FR-305, FR-307, [TC-SCORING-016](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-016), [TC-SCORING-039](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-039), [TC-SCORING-044](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-044)
- **Kroki:**
  1. Zdefiniuj w `src/types.ts` typy markowane `Tenths`, `Hundredths` i `Weight` (dziesiąte) oraz `type Result<T> = { ok: true; value: T } | { ok: false; code: FieldErrorCode }`.
  2. Zaimplementuj w `src/fixed.ts` `toTenths(decimal: number)`: mnożenie przez 10 z `Math.round`, odrzucenie wartości niebędących wielokrotnością 0,5 (`INVALID_STEP`) i ujemnych (`OUT_OF_RANGE`).
  3. Zaimplementuj `roundHalfUpDiv(num, den)` = `floor((2·num + den) / (2·den))` dla liczb nieujemnych i `mulTenths(a, b): Hundredths` (nota × waga).
  4. Dodaj walidatory domen: `validateScaleMax` (1–20 całkowite), `validateWeightTenths` (5–50, krok 5), `validatePenaltyPointsTenths` (5–500, krok 5), `validateMaxOccurrences` (1–10).
  5. Napisz testy graniczne: 0, 0,5, skala, skala + 0,5, wartości 0,3 i 8,3 (`INVALID_STEP`), `roundHalfUpDiv(5, 2) = 3`, `roundHalfUpDiv(4, 2) = 2`.
  6. Dopisz lub uruchom przypadki TC-SCORING-016, TC-SCORING-039, TC-SCORING-044 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-051: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SCORING-016, TC-SCORING-039, TC-SCORING-044 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-052 – scoring: wynik sędziego, maksimum, wartości domyślne, walidacja arkusza
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** BE
- **Cel:** Wynik sędziego (kryteria × wagi − kary, nie mniej niż zero), maksymalny wynik kategorii i wartości startowe formularza są liczone jedną funkcją, a arkusz niepasujący do kryteriów kategorii jest wykrywany jako `SCHEMA_MISMATCH`.
- **Zakres:** `sheetTotal`, `maxJudgeScore`, `defaultSheet`, `validateSheet` (SCHEMA_MISMATCH, zakresy), `templateForStyle` (szablony stylów z 07-reguly §8); **Poza zakresem:** Agregacja (IMP-053)
- **Zależności:** [IMP-051](#imp-051--scoring-typy-i-arytmetyka-stałoprzecinkowa)
- **Odwołania:** FR-603, FR-604, FR-606, FR-301, D-SC-03, D-SC-09, D-SC-12, [TC-SCORING-001](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-001)…003, [TC-SCORING-011](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-011), [TC-SCORING-012](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-012), [TC-SCORING-014](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-014), [TC-SCORING-017](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-017), [TC-SCORING-021](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-021), [TC-SCORING-023](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-023), [TC-SCORING-026](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-026), [TC-SCORING-037](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-037)
- **Kroki:**
  1. Zaimplementuj w `src/sheet.ts` `sheetTotal({ criteria, penalties }, config)`: `criteriaTotal = Σ value_tenths × weight_tenths` (setne), `penaltyTotal = Σ count × points_tenths × 10`, `total = max(0, criteriaTotal − penaltyTotal)` (D-SC-03).
  2. Zaimplementuj `maxJudgeScore(criteria)` = `Σ scale_max × weight` w setnych (65 dla szablonu Pole Sport, 75 dla Exotic).
  3. Zaimplementuj `defaultSheet(config)`: noty = połowa skali (`scale_max × 5` dziesiątych: skala 10 → 5,0, skala 7 → 3,5), kary 0, komentarz pusty (P14).
  4. Zaimplementuj `validateSheet(payload, config)`: zbiór `criterionId`/`penaltyTypeId` musi być równy konfiguracji (inaczej `SCHEMA_MISMATCH`), noty w [0; skala] i krok 0,5, kary w [0; `max_occurrences`], komentarz ≤ 500.
  5. Zaimplementuj w `src/templates.ts` `templateForStyle(style)` z kryteriami i karami z 07-reguly §8 (Exotic z „Praca na podłodze” na 4. pozycji – D-SC-12).
  6. Napisz testy przykładów P1 (54,3), P2 (Upadek ×2), P3, P11 (obcięcie do zera), P12 (Exotic, MAX 75), P14 (wartość domyślna).
  7. Dopisz lub uruchom przypadki TC-SCORING-001…003, TC-SCORING-011, TC-SCORING-012, TC-SCORING-014, TC-SCORING-017, TC-SCORING-021, TC-SCORING-023, TC-SCORING-026, TC-SCORING-037 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-052: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SCORING-001…003, 011, 012, 014, 017, 021, 023, 026, 037 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-053 – scoring: agregacja i średnie remisowe
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** BE
- **Cel:** Wynik oficjalny startu jest średnią wyników sędziów zaokrągloną do 0,01 metodą ROUND_HALF_UP, razem ze średnimi do rozstrzygania remisów.
- **Zakres:** `aggregate(totals, method)` (MEAN; TRIMMED_MEAN przygotowana na v1.1), `tieBreakMean`, `penaltyMean`, `expectedJudges` (J); **Poza zakresem:** Ranking (IMP-054)
- **Zależności:** [IMP-052](#imp-052--scoring-wynik-sędziego-maksimum-wartości-domyślne-walidacja-arkusza)
- **Odwołania:** FR-702, FR-704, D-SC-01, D-SC-02, TL-30, [TC-SCORING-004](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-004), [TC-SCORING-005](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-005), [TC-SCORING-007](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-007), [TC-SCORING-008](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-008), [TC-SCORING-013](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-013), [TC-SCORING-015](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-015), [TC-SCORING-022](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-022), [TC-SCORING-033](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-033), [TC-SCORING-040](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-040)
- **Kroki:**
  1. Zaimplementuj w `src/aggregate.ts` `aggregate(totals: Hundredths[], method)`: dla `MEAN` `roundHalfUpDiv(Σ totals, n)`, `null` przy n = 0; gałąź `TRIMMED_MEAN` rzuca `NotSupportedInMvp` (przygotowana na v1.1).
  2. Zaimplementuj `tieBreakMean(sheets, tieBreakCriterionId)` (`⌊(2·10·Σv + n) / (2·n)⌋` w setnych, TL-30: noty 9,0 i 8,5 → 875) i `penaltyMean(sheets)` (średnia punktów karnych w setnych).
  3. Zaimplementuj `expectedJudges(panel, sheets)` (J = sędziowie panelu aktywni lub z co najmniej jedną oceną w kategorii) i `isComplete(n, J)`.
  4. Zwróć strukturę `EntryAggregate { sheetCount, expectedCount, sumHundredths, officialHundredths, tieBreakHundredths, penaltyMeanHundredths, isComplete }` odpowiadającą kolumnom `category_result`.
  5. Napisz testy P4 (średnia 5 sędziów), P5 (wynik x,x0), P7 (3/5 – niekompletny), P8 (zaokrąglenie połówki), P13 (oczekiwany błąd `NotSupportedInMvp`).
  6. Dopisz lub uruchom przypadki TC-SCORING-004, TC-SCORING-005, TC-SCORING-007, TC-SCORING-008, TC-SCORING-013, TC-SCORING-015, TC-SCORING-022, TC-SCORING-033, TC-SCORING-040 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-053: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SCORING-004, 005, 007, 008, 013, 015, 022, 033, 040 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-054 – scoring: ranking, remisy, starty bez ocen i wycofane
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** BE
- **Cel:** Ranking kategorii jest deterministyczny w formacie „1, 2, 2, 4”: najpierw wynik, potem Technika, potem mniejsze kary, a starty bez ocen i wycofane są poza miejscami.
- **Zakres:** `rankEntries` (R desc → Technika desc → kary asc → ex aequo; wyświetlanie ex aequo wg numeru), starty bez ocen na końcu wg kolejności startowej, wycofane poza rankingiem, flaga `isProvisional`; **Poza zakresem:** Formatowanie (IMP-055)
- **Zależności:** [IMP-053](#imp-053--scoring-agregacja-i-średnie-remisowe)
- **Odwołania:** FR-311, FR-702, FR-704, D-SC-04, D-SC-06, D-SC-10, D-SC-11, [TC-SCORING-006](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-006), [TC-SCORING-009](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-009), [TC-SCORING-010](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-010), [TC-SCORING-018](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-018), [TC-SCORING-020](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-020), [TC-SCORING-024](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-024), [TC-SCORING-025](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-025)
- **Kroki:**
  1. Zaimplementuj w `src/rank.ts` `rankEntries(rows)`: sortowanie po `officialHundredths` malejąco → `tieBreakHundredths` malejąco → `penaltyMeanHundredths` rosnąco; pełny remis = ex aequo z tym samym miejscem i przeskokiem (1, 2, 2, 4).
  2. Ustal kolejność wyświetlania wierszy ex aequo po numerze startowym rosnąco (D-SC-06).
  3. Umieść starty bez ocen (n = 0) na końcu wg `startOrder` z `rank = null`, a wycofane (`entryStatus = WITHDRAWN`) za nimi, poza rankingiem.
  4. Ustaw flagę `isProvisional = !isComplete && categoryStatus === 'LOCKED'` (D-SC-11); wyniki niekompletne (n < J) nadal uczestniczą w rankingu.
  5. Napisz testy P6 (pozorny remis po zaokrągleniu – różne miejsca), P9 (remis rozstrzygnięty Techniką), P10 (remis po Technice rozstrzygnięty karami + ex aequo) i stabilności sortowania przy permutacji wejścia.
  6. Dopisz lub uruchom przypadki TC-SCORING-006, TC-SCORING-009, TC-SCORING-010, TC-SCORING-018, TC-SCORING-020, TC-SCORING-024, TC-SCORING-025 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-054: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SCORING-006, 009, 010, 018, 020, 024, 025 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-055 – scoring: formatowanie wyników i postęp
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** BE
- **Cel:** Wynik „55,5”, „52,70” lub „—”, wagi „×1,5” i kary „−0,5 pkt” wyglądają identycznie w aplikacji, API (`display`) i PDF.
- **Zakres:** `formatScore`, `formatRanking` (reguła 2 miejsc dla pozornych remisów sąsiadów), `formatWeight`, `formatPenaltyPoints`, `formatPenaltySum` (U+2212), `barRatio`, `categoryProgress`, `tournamentProgress`, `judgeProgress`; **Poza zakresem:** Teksty i18n (IMP-069)
- **Zależności:** [IMP-054](#imp-054--scoring-ranking-remisy-starty-bez-ocen-i-wycofane)
- **Odwołania:** FR-606, FR-701, FR-702, FR-209, D-SC-05, UI-14, [TC-SCORING-019](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-019), [TC-SCORING-035](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-035), [TC-SCORING-036](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-036), [TC-SCORING-038](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-038), [TC-SCORING-041](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-041)
- **Kroki:**
  1. Zaimplementuj w `src/format.ts` `formatScore(h: Hundredths, decimals: 1 | 2)` z przecinkiem dziesiętnym i bez separatora tysięcy oraz `'—'` dla `null`.
  2. Zaimplementuj `formatRanking(rows)`: domyślnie 1 miejsce po przecinku; gdy sąsiednie wiersze o różnych miejscach mają ten sam tekst po zaokrągleniu, oba dostają 2 miejsca (07-reguly §4, D-SC-05).
  3. Zaimplementuj `formatWeight` („×2”, „×1,5”), `formatPenaltyPoints` („−0,5 pkt”) i `formatPenaltySum` („kary −2”) ze znakiem minus U+2212 (UI-14).
  4. Zaimplementuj `barRatio(total, max)` (0–1, przycięte) dla pasków rankingu.
  5. Zaimplementuj w `src/progress.ts` `categoryProgress` (done = arkusze aktywnych startów, expected = aktywne starty × J, percent = round(100·done/expected), 30/45 → 67%), `tournamentProgress` (suma kategorii Trwa i Zakończona) i `judgeProgress` („{x}/{y} ocenione”).
  6. Napisz testy przykładów z 07-reguly §4 (np. 52,70 vs 52,65) i wartości granicznych 0% / 100%.
  7. Dopisz lub uruchom przypadki TC-SCORING-019, TC-SCORING-035, TC-SCORING-036, TC-SCORING-038, TC-SCORING-041 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-055: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SCORING-019, 035, 036, 038, 041 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-056 – scoring: testy właściwości i zgodności klient–serwer
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** QA
- **Cel:** Poprawność scoringu jest potwierdzona testami właściwości, a ten sam zestaw 200 przypadków daje identyczne wyniki w Node (API) i w Hermes (aplikacja).
- **Zakres:** fast-check 4 (TC-SCORING-027…034), referencja BigInt i big.js (tylko devDependencies), zestaw 200 przypadków JSON uruchamiany w Vitest i w Jest (`jest-expo`), bramka 100% gałęzi; **Poza zakresem:** –
- **Zależności:** [IMP-055](#imp-055--scoring-formatowanie-wyników-i-postęp), [IMP-201](06-mobile-fundamenty-i-design-system.md#imp-201--metro-pnpm-workspace-i-środowisko-testów-mobile)
- **Odwołania:** NFR-903, R-09, ADR-011, [TC-SCORING-027](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-027)…034
- **Kroki:**
  1. Napisz `test/properties/sheet.prop.test.ts` (fast-check 4): `0 ≤ sheetTotal ≤ maxJudgeScore`, monotoniczność względem not, wpływ każdej kary.
  2. Napisz `test/properties/aggregate.prop.test.ts` porównujący `aggregate` z referencją BigInt i `big.js` (devDependencies) dla losowych zbiorów wyników.
  3. Napisz `test/properties/rank.prop.test.ts`: niezmienność rankingu przy permutacji wejścia, poprawność przeskoku miejsc po ex aequo.
  4. Wygeneruj `test/parity/cases.json` (200 przypadków ze stałym ziarnem) skryptem `test/parity/generate.ts`.
  5. Dodaj test parytetu w `apps/mobile/src/domain/__tests__/scoring-parity.test.ts` (Jest + `jest-expo`) czytający ten sam plik.
  6. Utrzymaj bramkę 100% pokrycia gałęzi pakietu w CI.
  7. Dopisz lub uruchom przypadki TC-SCORING-027…034 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-056: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SCORING-027…034 przechodzą w CI obu aplikacji
  - [ ] Pokrycie 100% gałęzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** niskie

### IMP-057 – scoring: kanoniczny JSON wyników
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** BE
- **Cel:** Suma kontrolna wyników zablokowanej kategorii jest liczona ze stabilnego, kanonicznego JSON bez danych osobowych, więc ten sam stan zawsze daje ten sam hash.
- **Zakres:** `canonicalResults(category, rows)` – zawartość wg 05-bezpieczenstwo §6 (TL-16), posortowane klucze, liczby całkowite; **Poza zakresem:** Liczenie SHA-256 (API, IMP-127)
- **Zależności:** [IMP-054](#imp-054--scoring-ranking-remisy-starty-bez-ocen-i-wycofane)
- **Odwołania:** FR-706, TL-16, [TC-SCORING-042](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-042), [TC-SCORING-043](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-043)
- **Kroki:**
  1. Zaimplementuj w `src/canonical.ts` `canonicalResults(category, rows)` z polami z 05-bezpieczenstwo §6 (TL-16): `categoryId`, `resultsVersion`, kryteria (id, skala, waga), wiersze (`entryId`, `startNumber`, `rank`, wartości w setnych, `sheetCount`).
  2. Wyklucz pola osobowe (`fullName`, `club`, `birthYear`) i znaczniki czasu.
  3. Serializuj z posortowanymi kluczami, liczbami całkowitymi i bez białych znaków (własny serializer, bez `JSON.stringify` z obiektami w niekontrolowanej kolejności).
  4. Napisz test stabilności: permutacja wierszy i kolejności kluczy daje identyczny ciąg; zmiana jednej noty zmienia ciąg.
  5. Dopisz lub uruchom przypadki TC-SCORING-042, TC-SCORING-043 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-057: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SCORING-042, 043 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-058 – @polechamp/contracts – szkielet
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** BE
- **Cel:** Pakiet `@polechamp/contracts` jest jedynym źródłem schematów API, z którego korzystają NestJS, aplikacja mobilna i generator OpenAPI.
- **Zakres:** zod 4.6, `@asteasolutions/zod-to-openapi` 9, struktura `schemas/`, `errors/`, `events/`, `openapi/registry.ts`, eksport typów; **Poza zakresem:** –
- **Zależności:** [IMP-001](01-fundamenty-i-devops.md#imp-001--monorepo-pnpm-workspaces--turborepo--bazowa-konfiguracja-ts)
- **Odwołania:** ADR-012
- **Kroki:**
  1. Utwórz `packages/contracts/package.json` z zależnościami `zod@4.6` i `@asteasolutions/zod-to-openapi@9` oraz eksportami podścieżek (`./schemas`, `./errors`, `./events`).
  2. Dodaj strukturę `src/schemas/`, `src/errors/`, `src/events/`, `src/openapi/registry.ts` (instancja `OpenAPIRegistry` z `extendZodWithOpenApi`).
  3. Skonfiguruj build `tsup` (ESM + d.ts) i Vitest dla testów schematów.
  4. Dodaj przykładowy schemat `HealthResponse` zarejestrowany w rejestrze i test generowania fragmentu dokumentu.
  5. Otwórz PR `IMP-058: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Pakiet używany przez API i mobile
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

### IMP-059 – contracts: schematy wspólne i katalog błędów
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** BE
- **Cel:** API i aplikacja używają tych samych typów podstawowych i tego samego katalogu kodów błędów, a każda zmiana katalogu w dokumentacji bez zmiany kodu (lub odwrotnie) psuje test.
- **Zakres:** `Uuid`, `UuidV7`, `DecimalStep05`, `IsoDate`, `Pagination`, `Problem` (RFC 9457), enum `ErrorCode` (03-api §1.2), `FieldErrorCode` (§1.3), normalizacja tekstów (przycięcie; decyzja o wielokrotnych spacjach – zachowane), test dokumentacyjny katalogu; **Poza zakresem:** –
- **Zależności:** [IMP-058](#imp-058--polechampcontracts--szkielet)
- **Odwołania:** NFR-401, NFR-906, TL-08, [TC-CONTRACT-001](../03-test-plans/01-testy-jednostkowe.md#tc-contract-001), [TC-CONTRACT-009](../03-test-plans/01-testy-jednostkowe.md#tc-contract-009), [TC-CONTRACT-011](../03-test-plans/01-testy-jednostkowe.md#tc-contract-011), [TC-CONTRACT-014](../03-test-plans/01-testy-jednostkowe.md#tc-contract-014), [TC-CONTRACT-016](../03-test-plans/01-testy-jednostkowe.md#tc-contract-016)
- **Kroki:**
  1. Zdefiniuj w `src/schemas/common.ts` `Uuid`, `UuidV7`, `IsoDate`, `IsoDateTime`, `DecimalStep05` (liczba z maks. 2 miejscami i krokiem 0,5), `TrimmedString(min, max)` (przycięcie, wielokrotne spacje zachowane), `CursorPage<T>`.
  2. Zdefiniuj `Problem` (RFC 9457: `type`, `title`, `status`, `code`, `detail`, `instance`, `requestId`, `errors[]`) z rozszerzeniami `retryAfterSeconds`, `remainingAttempts`, `requiresReset`.
  3. Zdefiniuj w `src/errors/codes.ts` enum `ErrorCode` (wszystkie kody z 03-api §1.2 wraz z HTTP) i `FieldErrorCode` (`REQUIRED`, `TOO_SHORT`, `TOO_LONG`, `OUT_OF_RANGE`, `INVALID_STEP`, `INVALID_FORMAT`, `PASSWORD_BREACHED`, `DATE_RANGE`, `UNKNOWN_FIELD`).
  4. Dodaj mapę `errorHttpStatus: Record<ErrorCode, number>` używaną przez filtr wyjątków API.
  5. Napisz test `codes.doc.test.ts` parsujący tabelę §1.2 i §1.3 z `docs/01-architecture/03-api.md` i porównujący zbiory kodów.
  6. Dopisz lub uruchom przypadki TC-CONTRACT-001, TC-CONTRACT-009, TC-CONTRACT-011, TC-CONTRACT-014, TC-CONTRACT-016 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-059: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-CONTRACT-001, 009, 011, 014, 016 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-060 – contracts: konto i uwierzytelnianie
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** BE
- **Cel:** Wszystkie żądania i odpowiedzi konta, sesji i konfiguracji aplikacji mają schematy zod z opisem uprawnień w OpenAPI.
- **Zakres:** Register, verify, resend, login, refresh, logout, forgot, reset, me (GET/PATCH/DELETE), app-config; wpisy rejestru OpenAPI z `x-permissions`; **Poza zakresem:** –
- **Zależności:** [IMP-059](#imp-059--contracts-schematy-wspólne-i-katalog-błędów)
- **Odwołania:** FR-101, FR-102, FR-103, FR-104, FR-105, FR-106, FR-107, NFR-706
- **Kroki:**
  1. Zdefiniuj w `src/schemas/auth.ts`: `RegisterRequest` (`email`, `password` min. 10, `displayName` 2–60, `acceptTerms: z.literal(true)`, `termsVersion`), `VerifyEmailRequest` (kod 6 cyfr), `LoginRequest`, `TokenPair`, `RefreshRequest`, `ForgotRequest`, `ResetRequest`.
  2. Zdefiniuj `Me`, `MePatch` (`displayName`, `locale`), `AppConfig` (`minAppVersion`, `minSyncAppVersion`, `termsVersion`, `legal { termsUrl, privacyUrl, dpaUrl, accountDeletionUrl, supportUrl }`).
  3. Zarejestruj ścieżki w `src/openapi/paths/auth.ts` (register, verify-email, resend, login, refresh, logout, password/forgot, password/reset, GET/PATCH/DELETE `/me`, `/app-config`) z `x-permissions` (`PUBLIC`/`ORG`) i odpowiedziami błędów (`INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `CODE_INVALID`, `RESET_TOKEN_INVALID`, `ACTIVE_TOURNAMENT_EXISTS`).
  4. Dodaj testy schematów: hasło 9 znaków → `TOO_SHORT`, `acceptTerms: false` → `REQUIRED`, nieznane pole → `UNKNOWN_FIELD` (tryb `strict`).
  5. Otwórz PR `IMP-060: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Schematy użyte w IMP-114…120
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-061 – contracts: turnieje, kategorie, kryteria, kary
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** BE
- **Cel:** Formularze turnieju, kategorii, kryterium i kary oraz API walidują dane tymi samymi regułami (np. nazwa 3–120, skala 1–20, waga 0,5–5 co 0,5).
- **Zakres:** Tournament (lista, szczegóły, create, patch, finish response), Category (create/patch/details/lock warnings), Criterion, PenaltyType z walidacjami z FR-202, FR-301, FR-305, FR-307; **Poza zakresem:** –
- **Zależności:** [IMP-059](#imp-059--contracts-schematy-wspólne-i-katalog-błędów)
- **Odwołania:** FR-202, FR-301, FR-305, FR-307, FR-309, [TC-CONTRACT-002](../03-test-plans/01-testy-jednostkowe.md#tc-contract-002)…005
- **Kroki:**
  1. Zdefiniuj w `src/schemas/tournaments.ts` `TournamentCreate` (`name` 3–120, `startDate`, `endDate` z refine `DATE_RANGE`, `venue` ≤ 120), `TournamentPatch`, `TournamentListItem` (z `progress`), `TournamentDetails` (`stats`, `progress`, `pendingRejectedSubmissions`, `categories[]`), `FinishResponse`.
  2. Zdefiniuj w `src/schemas/categories.ts` `CategoryCreate` (`name` 1–80, `style`, `level`, `ageGroup` ≤ 40 z domyślnym „Open”), `CategoryPatch`, `CategoryDetails` (`maxJudgeScore`, `criteria[]`, `penaltyTypes[]`, `version`) i `LockWarnings` (`missingSheets`, `devicesWithPending[]`, `offlineDevices[]`).
  3. Zdefiniuj `CriterionInput` (`name` 1–60, `scaleMax` 1–20 całkowite, `weight` 0,5–5 krok 0,5, `description` ≤ 200) i `PenaltyTypeInput` (`name` 1–60, `points` 0,5–50 krok 0,5, `maxOccurrences` 1–10).
  4. Zarejestruj ścieżki turniejów, kategorii, kryteriów i kar z `x-permissions: ORG:owner`, nagłówkami `If-Match`/`ETag` i kodami 409.
  5. Dodaj testy granic dla każdego pola (wartość minimalna, maksymalna, poza zakresem, zły krok).
  6. Dopisz lub uruchom przypadki TC-CONTRACT-002…005 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-061: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-CONTRACT-002…005 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-062 – contracts: zawodniczki, sędziowie, urządzenia, parowanie
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** BE
- **Cel:** Lista startowa, sędziowie i urządzenia mają schematy, które wymuszają zgodę opiekuna dla niepełnoletnich i normalizują kod parowania wpisany ręcznie.
- **Zakres:** Entry (create z refine zgody opiekuna, patch, anonymize), Judge (create response z `pin`, list z `pinLocked`/`sheetCount`), PairingCode (normalizacja), Device (list, pair request/response z `pinPepper`), heartbeat; **Poza zakresem:** –
- **Zależności:** [IMP-059](#imp-059--contracts-schematy-wspólne-i-katalog-błędów)
- **Odwołania:** FR-402, FR-406, FR-502, FR-504, FR-505, FR-806, [TC-CONTRACT-006](../03-test-plans/01-testy-jednostkowe.md#tc-contract-006), [TC-CONTRACT-007](../03-test-plans/01-testy-jednostkowe.md#tc-contract-007), [TC-CONTRACT-015](../03-test-plans/01-testy-jednostkowe.md#tc-contract-015)
- **Kroki:**
  1. Zdefiniuj w `src/schemas/entries.ts` `EntryCreate` (`startNumber` 1–9999, `fullName` 2–100, `club` ≤ 100, `birthYear` 1920–bieżący rok) z `superRefine`: `isMinor` lub wiek < 18 wymaga `guardianConsentConfirmed: true` (`REQUIRED`), `EntryPatch`, `EntryRow` (`judged { done, expected }`, `status`).
  2. Zdefiniuj w `src/schemas/judges.ts` `JudgeCreate` (`fullName` 3–80), `JudgeCreated` (`pin`, `pinShownOnce`), `JudgeRow` (`isActive`, `pinLocked`, `sheetCount`), `JudgePatch` (`initials` ≤ 3).
  3. Zdefiniuj w `src/schemas/devices.ts` `PairingCode` (transformacja: wielkie litery, usunięcie myślnika i spacji, alfabet bez znaków mylących), `PairRequest`, `PairResponse` (`deviceId`, `deviceSecret`, `pinPepper` base64 32 B), `DeviceRow`, `Heartbeat`.
  4. Zarejestruj ścieżki entries, judges, pairing-codes, devices z błędami `START_NUMBER_TAKEN`, `JUDGE_NAME_TAKEN`, `PAIRING_CODE_INVALID`, `LIMIT_EXCEEDED`.
  5. Dodaj testy: „k7qm 4ztx” → `K7QM4ZTX`, rok urodzenia 2015 bez zgody → błąd pola, numer 10000 → `OUT_OF_RANGE`.
  6. Dopisz lub uruchom przypadki TC-CONTRACT-006, TC-CONTRACT-007, TC-CONTRACT-015 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-062: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-CONTRACT-006, 007, 015 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-063 – contracts: synchronizacja i sesje sędziów
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** BE
- **Cel:** Kontrakt synchronizacji tabletu (migawka, zmiany, paczka mutacji i wynik każdej mutacji) jest jednoznacznie typowany, a przykładowe żądania i odpowiedzi z dokumentacji API przechodzą walidację.
- **Zakres:** Snapshot (z `wrapped` weryfikatorami), Changes (entity union), Push request (unia 4 typów mutacji, ≤ 100) i response (APPLIED/DUPLICATE/REJECTED/RETRY + kody), JudgeSession, ScoreSheet payload; **Poza zakresem:** –
- **Zależności:** [IMP-059](#imp-059--contracts-schematy-wspólne-i-katalog-błędów)
- **Odwołania:** FR-801, FR-802, FR-806, ADR-004, TL-04, TL-12, [TC-CONTRACT-008](../03-test-plans/01-testy-jednostkowe.md#tc-contract-008), [TC-CONTRACT-010](../03-test-plans/01-testy-jednostkowe.md#tc-contract-010)
- **Kroki:**
  1. Zdefiniuj w `src/schemas/sync.ts` `Snapshot` (`cursor`, `serverTime`, `tournament`, `judges[]` z `pinVerifier { alg, iterations, salt, wrapped }`, `categories[]` z `panelJudgeIds`, kryteriami, karami i startami).
  2. Zdefiniuj `ChangesResponse` jako unię dyskryminowaną po `entityType` (`tournament`, `category`, `criterion`, `penalty_type`, `entry`, `athlete`, `judge`, `score_sheet`) z `op: 'U' | 'D'`, `cursor`, `hasMore`.
  3. Zdefiniuj `PushRequest` (`deviceTime`, `mutations` 1–100) jako unię `SUBMIT_SCORE_SHEET` (`scoreSheetId`, `categoryId`, `entryId`, `baseRevision`, `criteria[]`, `penalties[]`, `comment`, `clientTotal`), `JUDGE_SESSION_STARTED`, `JUDGE_SESSION_ENDED`, `PIN_ATTEMPTS_REPORT`; `mutationId` jako `UuidV7`.
  4. Zdefiniuj `PushResponse` z `results[]` (`APPLIED` | `DUPLICATE` | `REJECTED` + `code` z listy 03-api §5.1 | `RETRY`) i `cursor`.
  5. Zdefiniuj `JudgeSessionCreate` (`judgeId`, `pin` 4 cyfry) i `JudgeSessionCreated` (`judgeToken`, `sessionId`, `expiresIn`).
  6. Dodaj testy schematów na przykładach JSON z 03-api §4 i §5 oraz przypadki odrzucenia (101 mutacji, nieznany typ, `mutationId` UUIDv4).
  7. Dopisz lub uruchom przypadki TC-CONTRACT-008, TC-CONTRACT-010 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-063: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-CONTRACT-008, 010 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-064 – contracts: wyniki, oceny, odrzucenia, eksporty, audyt
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** BE
- **Cel:** Odczyty organizatora (ranking, oceny sędziów, rewizje, odrzucone zgłoszenia, eksporty, audyt) mają schematy odpowiadające polom używanym na ekranach.
- **Zakres:** Results (wiersze z `display`, `entryStatus`, `isProvisional`), ScoreSheet dla organizatora, Revision, RejectedSubmission, Export, AuditEntry; **Poza zakresem:** –
- **Zależności:** [IMP-059](#imp-059--contracts-schematy-wspólne-i-katalog-błędów)
- **Odwołania:** FR-701, FR-707, FR-805, FR-705, FR-901
- **Kroki:**
  1. Zdefiniuj w `src/schemas/results.ts` `ResultsResponse` (`resultsVersion`, `maxJudgeScore`, `judgeCount`, `formula`, `tieBreak`, `rows[]` z `rank`, `official`, `display`, `sheetCount`, `isComplete`, `isProvisional`, `entryStatus`).
  2. Zdefiniuj `OrgScoreSheet` (sędzia, noty z wagami, kary, komentarz, `total`, `authMode`, `revision`) i `ScoreSheetRevision` (`revision`, `createdAt`, `total`, `actorType`).
  3. Zdefiniuj `RejectedSubmission` (`judge`, `entry`, `category`, `reason`, `receivedAt`, `payloadTotal`, `resolution`) oraz `ExportCreate`/`ExportStatus` (`status`, `downloadUrl`, `expiresAt`, `resultsHash`).
  4. Zdefiniuj w `src/schemas/audit.ts` `AuditEntry` i stronicowaną odpowiedź `CursorPage<AuditEntry>`.
  5. Zarejestruj ścieżki z 03-api §3.6 w rejestrze OpenAPI z `x-permissions: ORG:owner`.
  6. Otwórz PR `IMP-064: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Schematy użyte w testach IMP-151, IMP-152
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-065 – contracts: zdarzenia realtime
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** BE
- **Cel:** Zdarzenia Socket.IO są typowane po obu stronach, więc serwer nie wyemituje, a klient nie obsłuży zdarzenia z błędnym ładunkiem.
- **Zakres:** Mapa `ServerToClientEvents`, `ClientToServerEvents` z ładunkami (03-api §6, w tym `device.paired`, rozszerzone `session.revoked`); **Poza zakresem:** –
- **Zależności:** [IMP-059](#imp-059--contracts-schematy-wspólne-i-katalog-błędów)
- **Odwołania:** FR-703, FR-804, TL-14, [TC-CONTRACT-012](../03-test-plans/01-testy-jednostkowe.md#tc-contract-012)
- **Kroki:**
  1. Zdefiniuj w `src/events/index.ts` schematy ładunków wszystkich zdarzeń serwer → klient z 03-api §6 (`tournament.updated`, `category.updated`, `category.locked`, `category.unlocked`, `config.changed`, `judges.changed`, `scoresheet.accepted`, `results.updated`, `progress.updated`, `device.status`, `rejected.created`, `device.paired`, `session.revoked`, `sync.hint`).
  2. Zdefiniuj `session.revoked.reason` jako enum `DEVICE_REVOKED | PIN_RESET | REPLACED | JUDGE_DEACTIVATED | TOURNAMENT_FINISHED` (TL-14).
  3. Wyprowadź typy `ServerToClientEvents` i `ClientToServerEvents` (`subscribe`, `heartbeat`) w formacie oczekiwanym przez `socket.io` i `socket.io-client`.
  4. Dodaj mapę `EVENT_ROOM` (zdarzenie → pokój `tournament` / `org` / `device`) używaną przez publikator i testy.
  5. Napisz test zgodności z tabelą w 03-api §6 (zbiory nazw zdarzeń i pokoi).
  6. Dopisz lub uruchom przypadki TC-CONTRACT-012 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-065: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-CONTRACT-012 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

### IMP-066 – contracts: generowanie OpenAPI 3.1 i kontrola zmian łamiących
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** BE
- **Cel:** Każdy build publikuje `openapi.json` z rejestru schematów, a zmiana łamiąca zgodność wsteczną kontraktu zatrzymuje PR.
- **Zakres:** Skrypt `openapi` (rejestr → `dist/openapi.json`), lint Redocly, `oasdiff breaking` względem ostatniego tagu, publikacja dokumentacji (Redoc static do `site/docs/api`); **Poza zakresem:** Test zgodności tras (IMP-102)
- **Zależności:** [IMP-060](#imp-060--contracts-konto-i-uwierzytelnianie), [IMP-061](#imp-061--contracts-turnieje-kategorie-kryteria-kary), [IMP-062](#imp-062--contracts-zawodniczki-sędziowie-urządzenia-parowanie), [IMP-063](#imp-063--contracts-synchronizacja-i-sesje-sędziów), [IMP-064](#imp-064--contracts-wyniki-oceny-odrzucenia-eksporty-audyt)
- **Odwołania:** NFR-906, NFR-907, ADR-012, [TC-CONTRACT-013](../03-test-plans/01-testy-jednostkowe.md#tc-contract-013), [TC-CI-002](../03-test-plans/00-strategia-testowania.md#tc-ci-002), [TC-CI-004](../03-test-plans/00-strategia-testowania.md#tc-ci-004)
- **Kroki:**
  1. Napisz `src/openapi/build.ts`: `OpenApiGeneratorV31` z rejestru → `dist/openapi.json` (info, serwery, `securitySchemes` dla `org`/`device`/`judge`, komponent `Problem`).
  2. Dodaj lint `@redocly/cli lint` z regułami (opis operacji, `operationId`, odpowiedzi błędów `application/problem+json`).
  3. Dodaj krok `oasdiff breaking` porównujący z `openapi.json` ostatniego tagu `v*` (blokuje PR bez etykiety `api-breaking-approved`).
  4. Generuj statyczną dokumentację `redocly build-docs` do `site/docs/api/index.html` publikowaną z workflow wydania.
  5. Udostępnij `dist/openapi.json` jako artefakt CI dla testu zgodności tras (IMP-102), ZAP i generatora typów klienta.
  6. Dopisz lub uruchom przypadki TC-CONTRACT-013, TC-CI-002, TC-CI-004 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-066: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-CONTRACT-013, TC-CI-002, TC-CI-004 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-067 – Klient API dla aplikacji (typy z OpenAPI)
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** MOB
- **Cel:** Aplikacja mobilna wywołuje API przez typowanego klienta generowanego z OpenAPI, więc zmiana kontraktu ujawnia się jako błąd kompilacji.
- **Zakres:** `openapi-typescript` 7 → `packages/contracts/dist/api-types.ts`, wrapper `openapi-fetch` 0.17 w `apps/mobile/src/data/api/client.ts` (bazowy URL z konfiguracji, middleware w IMP-214); **Poza zakresem:** Uwierzytelnianie klienta (IMP-214)
- **Zależności:** [IMP-066](#imp-066--contracts-generowanie-openapi-31-i-kontrola-zmian-łamiących), [IMP-200](06-mobile-fundamenty-i-design-system.md#imp-200--inicjalizacja-aplikacji-expo-sdk-58)
- **Odwołania:** ADR-012, ADR-003
- **Kroki:**
  1. Dodaj skrypt `gen:client` w `packages/contracts`: `openapi-typescript dist/openapi.json -o dist/api-types.ts` jako zadanie turbo zależne od `openapi`.
  2. Utwórz `apps/mobile/src/data/api/client.ts`: `createClient<paths>({ baseUrl: env.apiUrl })` z `openapi-fetch` 0.17 i miejscem na middleware (IMP-214).
  3. Wyeksportuj pomocnicze typy `ApiBody<'/v1/tournaments', 'post'>` i `ApiResponse<…>` w `src/data/api/types.ts`.
  4. Dodaj test kompilacji (`tsc --noEmit` na pliku z przykładowymi wywołaniami `GET /v1/tournaments` i `POST /v1/sync/push`) w CI.
  5. Otwórz PR `IMP-067: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Zmiana kontraktu bez regeneracji typów powoduje błąd typecheck w CI
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-068 – @polechamp/tokens – tokeny Nocturne
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** MOB
- **Cel:** Wszystkie kolory, odstępy, promienie, cienie, style tekstu i czasy animacji Nocturne są stałymi TypeScript zgodnymi 1:1 z `design/styles.css`, a kontrast tekstu jest sprawdzany testem.
- **Zakres:** `color` (w tym `mix`, `overlay`), role semantyczne, `space` + skala `layout`, `radius`, `shadow` (iOS/Android), `typography` (style z 09-design-system §2.5), `motion`; test kontrastu i mieszanek; **Poza zakresem:** Komponenty (EP-06)
- **Zależności:** [IMP-001](01-fundamenty-i-devops.md#imp-001--monorepo-pnpm-workspaces--turborepo--bazowa-konfiguracja-ts)
- **Odwołania:** NFR-202, NFR-210, 09-design-system §2, [TC-TOKENS-001](../03-test-plans/01-testy-jednostkowe.md#tc-tokens-001), [TC-TOKENS-002](../03-test-plans/01-testy-jednostkowe.md#tc-tokens-002), [TC-TOKENS-004](../03-test-plans/01-testy-jednostkowe.md#tc-tokens-004), [TC-A11Y-001](../03-test-plans/05-testy-niefunkcjonalne.md#tc-a11y-001)
- **Kroki:**
  1. Przenieś skale kolorów do `packages/tokens/src/color.ts` (`neutral-50…950`, `accent-100…900`, `bg`, `surface`, `divider`) oraz funkcje `mix(color, pct, over)` i `overlay`.
  2. Zdefiniuj role semantyczne w `src/roles.ts` (`text.primary`, `text.secondary` = neutral-400, `danger.text` = accent-300, `pill.live`, `pill.draft`, `pill.done`, `sheetBackdrop`).
  3. Zdefiniuj `space`, `layout` (16 dp marginesy, 44/48/52 wysokości), `radius` (`md`, `lg`, 999), `shadow` (`sm`, `md`, `lg` z wariantami iOS `shadow*` i Android `elevation`).
  4. Zdefiniuj `typography` (style z 09-design-system §2.5: rozmiar, waga 400/500, interlinia, `letterSpacing`, `fontVariant: ['tabular-nums']`) i `motion` (180 ms, 200 ms, 300 ms, krzywe).
  5. Napisz `src/__tests__/parity.test.ts` porównujący wartości z parsowanym `design/styles.css` (tylko odczyt pliku).
  6. Napisz `src/__tests__/contrast.test.ts` (port skryptu weryfikacji TL): par tekst/tło z ról semantycznych ≥ 4,5:1 (tekst) i ≥ 3:1 (duży tekst, ikony).
  7. Dopisz lub uruchom przypadki TC-TOKENS-001, TC-TOKENS-002, TC-TOKENS-004, TC-A11Y-001 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-068: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-TOKENS-001, 002, 004 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-069 – @polechamp/i18n – infrastruktura, liczba mnoga, formatery
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** FULL
- **Cel:** Aplikacja, PDF i e-maile korzystają z jednego pakietu tekstów PL z poprawną odmianą liczebników („1 kategoria / 2 kategorie / 5 kategorii”) i formatami dat.
- **Zakres:** i18next 26, przestrzenie nazw (`common`, `org`, `judge`, `errors`, `toasts`, `pdf`, `email`), `plural()` CLDR pl, `formatTournamentDate` (Intl pl-PL, Europe/Warsaw), `tieBreakSentence`, tryb pseudolokalizacji, skrypt kompletności kluczy; **Poza zakresem:** Treści – IMP-070
- **Zależności:** [IMP-001](01-fundamenty-i-devops.md#imp-001--monorepo-pnpm-workspaces--turborepo--bazowa-konfiguracja-ts)
- **Odwołania:** NFR-601, NFR-602, NFR-603, NFR-604, [TC-I18N-001](../03-test-plans/01-testy-jednostkowe.md#tc-i18n-001)…004, [TC-I18N-009](../03-test-plans/01-testy-jednostkowe.md#tc-i18n-009), [TC-I18N-010](../03-test-plans/01-testy-jednostkowe.md#tc-i18n-010)
- **Kroki:**
  1. Skonfiguruj `packages/i18n/src/index.ts`: instancja i18next 26 z przestrzeniami `common`, `org`, `judge`, `errors`, `toasts`, `pdf`, `email` i językiem `pl`.
  2. Zaimplementuj `src/plural.ts` `plural(n, { one, few, many })` wg reguł CLDR pl (12–14 → many, 22–24 → few) i integrację z kluczami `_one/_few/_many`.
  3. Zaimplementuj `src/dates.ts` `formatTournamentDate(start, end)` (Intl pl-PL, `Europe/Warsaw`): „18 kwietnia 2027”, „3–4 października 2026”, „30 września – 1 października 2026”, „Data do ustalenia”.
  4. Zaimplementuj `tieBreakSentence(criterionName)` z wariantem bezpiecznym „…wyższa ocena w kryterium „{nazwa}”.” gdy biernik jest niepewny.
  5. Dodaj `src/pseudo.ts` (pseudolokalizacja: wydłużenie o 40%, znaki diakrytyczne, nawiasy) włączaną flagą.
  6. Napisz skrypt `check-keys.ts` (brakujące, nieużywane i puste klucze) i testy formaterów dla przykładów z 05-ekrany-organizatora.
  7. Dopisz lub uruchom przypadki TC-I18N-001…004, TC-I18N-009, TC-I18N-010 w API (Vitest) i aplikacji (Jest/Maestro); nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-069: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-I18N-001…004, 009, 010 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** niskie

### IMP-070 – i18n: katalog tekstów wiążących PL
- **Epik / obszar:** EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | **Rola:** FULL
- **Cel:** Każdy tekst wiążący „…” ze specyfikacji ekranów, toastów i błędów ma klucz i18n z dokładnie tą treścią, a rozjazd specyfikacji i katalogu wykrywa test.
- **Zakres:** Wszystkie teksty z 05/06-ekrany, 09-design-system §6 (toasty), 03-api §1.2 (komunikaty błędów), 04-user-stories; plik `binding-texts.json` generowany ze specyfikacji (skrypt) i test porównujący; **Poza zakresem:** –
- **Zależności:** [IMP-069](#imp-069--polechampi18n--infrastruktura-liczba-mnoga-formatery)
- **Odwołania:** NFR-601, FR-201, FR-601, [TC-I18N-006](../03-test-plans/01-testy-jednostkowe.md#tc-i18n-006), [TC-I18N-007](../03-test-plans/01-testy-jednostkowe.md#tc-i18n-007), [TC-I18N-008](../03-test-plans/01-testy-jednostkowe.md#tc-i18n-008)
- **Kroki:**
  1. Napisz `tools/scripts/extract-binding-texts.ts` wyciągający cytaty „…” z `docs/02-specification/05-*.md`, `06-*.md`, `09-design-system.md` §6 i kolumny komunikatów z `03-api.md` §1.2 do `packages/i18n/binding-texts.json` (tekst, plik, sekcja).
  2. Przypisz klucze ręcznie w `packages/i18n/locales/pl/{org,judge,toasts,errors}.json` (np. `toast.tournamentCreated` = „Utworzono turniej”, `errors.CATEGORY_LOCKED` = „Kategoria zablokowana — tylko podgląd”).
  3. Dodaj komunikaty pól `errors.field.<CODE>` z parametrami (np. „Numer {nr} jest już zajęty.”, „Waga od 0,5 do 5 (co 0,5).”).
  4. Napisz test `binding-texts.test.ts`: każdy tekst z `binding-texts.json` występuje dokładnie w jednym kluczu (z normalizacją placeholderów `{…}`), a różnica jest wypisywana jako lista.
  5. Dodaj mapę wyjątków `binding-exceptions.json` (teksty przykładowe i placeholdery formularzy) z uzasadnieniem.
  6. Dopisz lub uruchom przypadki TC-I18N-006, TC-I18N-007, TC-I18N-008 w API (Vitest) i aplikacji (Jest/Maestro); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-070: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-I18N-006, 007, 008 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

