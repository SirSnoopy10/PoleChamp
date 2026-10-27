# Formularz oceny – profil i optymalizacja (IMP-500)

TC: [TC-PERF-004](../../docs/03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-004), [TC-EDGE-024](../../docs/03-test-plans/08-przypadki-brzegowe.md#tc-edge-024) · NFR-104 · R-01.
Budżet: „Twój wynik” ≤ 50 ms po zmianie wartości; FPS ≥ 55 (p95 próbek) na wątku UI i JS przy przeciąganiu suwaka; Reassure – brak regresji renderów, czas ≤ +10%.

## Stan architektury (przed IMP-500)

| Element | Stan | Uwagi |
|---|---|---|
| Suwak (`ui/scoring/ScoreSlider.tsx`) | worklet | pozycja kciuka i przyciąganie (`snapTenths`) na wątku UI; `scheduleOnRN` tylko przy zmianie kroku 0,5 – bez mostu JS co klatkę |
| Stan formularza (`formStore.ts`) | Zustand per formularz | `CriterionField`/`PenaltyField` subskrybują jedno pole (`s.criteria[id]`) |
| Karty (`CriterionCard`, `PenaltyCounter`) | `React.memo` | stabilne `onChange(id, v)` ze store'u |
| Stopka (`ScoreFooter.tsx`) | **do poprawy** | subskrybowała `criteria`/`penalties` w całości – każdy krok renderował też przycisk zatwierdzenia i separator, `sheetTotal` bez memoizacji |
| Cienie | `shadow.sm` = `elevation: 4` na Androidzie | `shadow*` ignorowane przez Androida; elevation renderuje RenderThread – bez zmian, do potwierdzenia w Flashlight (kolumna UI CPU) |

## Zmiany

- `ScoreFooter`: wynik wydzielony do `LiveTotal` (`memo`) – jedyna część stopki subskrybująca noty i kary; `sheetTotal` w `useMemo` po zmianie wartości; stopka subskrybuje tylko `submitting`.
- Testy regresji renderów (Jest, `src/features/scoring/__tests__/perf.test.tsx`): zmiana noty renderuje wyłącznie swoją kartę – inne karty, kary i przycisk zatwierdzenia 0 renderów (test nie przechodzi na wersji sprzed zmiany: przycisk renderował się przy każdym kroku).
- Reassure (`ScoreForm.perf-test.tsx`: ScoreForm 12/10, CriterionCard, PenaltyCounter, ScoreFooter) uruchamiane przez `pnpm --filter @polechamp/mobile perf:test` (`jest.perf.config.js` – wcześniej `testPathIgnorePatterns` wykluczał pliki `*.perf-test.tsx` także z Reassure i pomiar `Button` nie wykonywał się). Próg w CI: job `perf` w `.github/workflows/pr.yml` + `apps/mobile/scripts/reassure-gate.mjs`.

## Pomiary lokalne (Jest/Reassure, Windows, Node 24)

| Scenariusz | Przed | Po | Renderów (commity) |
|---|---|---|---|
| ScoreForm – 12 kryteriów, 10 kar, 10 kroków noty + 2 kary | 46,6 ms | 46,5 ms | 13 → 13 |
| ScoreFooter – 20 zmian noty | 5,5 ms | 5,3 ms | 21 → 21 |
| CriterionCard – 10 kroków + | 2,6 ms | 2,7 ms | 1 → 1 |
| PenaltyCounter – render 10 kar | 12,0 ms | 12,0 ms | 1 → 1 |
| Renderów przycisku „Zatwierdź” na 10 kroków noty | 10 | 0 | – |
| Commit Reacta po kroku noty (Profiler, 12/10) | – | ≤ 50 ms (asercja) | – |
| `sheetTotal` 12/10 × 1 000 | – | < 50 ms (asercja) | – |

Reassure liczy commity korzenia – zysk widać w licznikach komponentów (test Jest), nie w liczbie commitów. Czasy Jest nie odpowiadają urządzeniu; rozstrzygają pomiary poniżej.

## Pomiary na urządzeniach (do wykonania – brak urządzeń)

Przepływ: `apps/mobile/e2e/maestro/perf/tc-perf-004-score-form.yaml` (10 × przeciągnięcie suwaka w obie strony + kary, przewinięcie 12/10). Build `preview` (Hermes, bez dev menu).

- **Android (Tab A8):** `node tools/e2e/src/flashlight.ts wynik.json` – Flashlight, 5 iteracji × 30 s; podsumowanie: FPS p5/p50, CPU wątku JS (`mqt_v_js`) i UI p95, RAM maks.; kod wyjścia 1 przy FPS p5 < 55. Tylko podsumowanie: `--summary-only`.
- **iPad 9:** Xcode Instruments – szablony Time Profiler + Core Animation (FPS), Hitches; ten sam przepływ Maestro, 30 s przeciągania.
- Czas „Twój wynik” na urządzeniu: Instruments (Points of Interest) lub nagranie 240 fps – odstęp między ruchem palca a zmianą liczby.

| Urządzenie | Build | FPS p5 | FPS p50 | CPU JS p95 | CPU UI p95 | RAM maks. | Wynik ≤ 50 ms | Wynik |
|---|---|---|---|---|---|---|---|---|
| Galaxy Tab A8 (przed) | {sha} | {…} | {…} | {…} | {…} | {…} | {…} | {…} |
| Galaxy Tab A8 (po) | {sha} | {…} | {…} | {…} | {…} | {…} | {…} | {…} |
| iPad 9 (po) | {sha} | {…} | {…} | {…} | {…} | {…} | {…} | {…} |

Jeśli Tab A8 nie spełni budżetu: kolejne kroki – `scheduleOnRN` z throttlingiem do jednego zdarzenia na klatkę, wartość karty jako `Animated` tekst (bez renderu Reacta podczas przeciągania), zastąpienie `elevation` obrysem na Androidzie (wymaga akceptacji projektanta – IMP-650).
