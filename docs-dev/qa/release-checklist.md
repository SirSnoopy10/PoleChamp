# Lista kontrolna wydania i regres ręczny (IMP-466)

Kryteria wyjścia z [00-strategia §8](../../docs/03-test-plans/00-strategia-testowania.md#8-kryteria-wejścia-i-wyjścia). Wypełnia QA dla każdego kandydata do wydania; raport trafia do PM (decyzja go/no-go).

Wersja: ______ Build (iOS / Android): ______ / ______ Commit API: ______ Data: ______

## Automaty (CI)

- [ ] `pr` zielony: lint, typecheck, unit (progi pokrycia §9), secrets, audit
- [ ] `integration`: TC-API, TC-AUTHZ-001…062 (macierz, kompletność), TC-CI-002 (kontrakt N−1/N−2), odporność (TC-SYNC-019, TC-REL-003)
- [ ] `test:pdf`: regresja PDF (wzorce odświeżone na runnerze Linux)
- [ ] `mobile-e2e` (nocny, 3 ostatnie przebiegi): 100% P1, niestabilne ponowione maks. 1 raz i zgłoszone
- [ ] `e2e-full` przed wydaniem: TC-E2E-FULL-001…006, TC-PERF-005 (p95 ocena → ranking ≤ 2 s, status → tablet ≤ 3 s)
- [ ] `visual`: brak zmian bez `visual-approved`
- [ ] Kontrola przepływów Maestro i mapy TC-SYNC (`@polechamp/e2e-tools`)

## Niefunkcjonalne (staging)

- [ ] k6 profil 1x (TC-PERF-002, 011, 013) – raport `docs-dev/perf/k6-<data>.md`; przed 1.0 także 2x (TC-PERF-012)
- [ ] chaos (TC-SYNC-019, TC-REL-003…005) – `docs-dev/reliability/chaos-<data>.md`
- [ ] ZAP i pentest bez krytycznych/wysokich
- [ ] crash-free na becie ≥ progów NFR-308

## Regres ręczny P1

| TC | Procedura | Wynik | Uwagi |
|---|---|---|---|
| TC-SYNC-006 | twarde wyłączenie – `sync/manual.md` P-06 | | |
| TC-SYNC-023 | 12 h offline – `sync/manual.md` P-23 | | |
| TC-EDGE-013 | rozładowanie tabletu z 5 ocenami w kolejce – oceny zachowane i wysłane, logowanie offline < 24 h | | |
| TC-EDGE-048 | pamięć < 10 MB – toast błędu zapisu, brak toastu sukcesu, dane nieuszkodzone | | |
| TC-A11Y-002…014 | `a11y/README.md` – 0 krytycznych | | |
| TC-COMPAT-001…010, TC-PERF-014/015 | `compat-matrix.md` | | |
| TC-UAT (przygotowawcze) | `uat/README.md` – sprzęt, instrukcje, karty | | |

## Defekty

- [ ] 0 otwartych S1 i S2 (`uat/triage.md` / narzędzie zespołu); S3 z planem naprawy
- [ ] poprawki S1/S2 zweryfikowane na buildzie kandydującym

## Raport wydania

| Pole | Wartość |
|---|---|
| Wyniki automatów | |
| Wyniki ręczne | |
| Otwarte ryzyka | |
| Decyzja go / no-go | |
| Podpis QA / PM | |
