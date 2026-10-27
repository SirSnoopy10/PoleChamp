# Pseudolokalizacja i skalowanie tekstu (IMP-504)

TC: [TC-L10N-002](../../docs/03-test-plans/05-testy-niefunkcjonalne.md#tc-l10n-002), [TC-A11Y-007](../../docs/03-test-plans/05-testy-niefunkcjonalne.md#tc-a11y-007) (organizator 130%), [TC-A11Y-008](../../docs/03-test-plans/05-testy-niefunkcjonalne.md#tc-a11y-008) (sędzia 120%) · NFR-204, NFR-604, UI-05, UI-11.

## Automaty

- `apps/mobile/src/dev/catalog/__tests__/l10n-scaling.test.tsx` – przypadki DevCatalog (sekcje komponentów) ze słownikiem pseudo (+40%, `I18nProvider pseudo`):
  - **TC-L10N-002:** jedyny tekst elementu interaktywnego (przycisk, zakładka, przełącznik, wybór) i każdy tekst pigułki / plakietki / segmentu ma `numberOfLines = 1` (wielokropek zamiast zawijania). Wyjątki wg designu: komunikat banera i pusty stan z ramką (zawijają).
  - **TC-A11Y-007/008:** każdy tekst ma `maxFontSizeMultiplier` ≤ limit trybu (`MAX_FONT_SCALE`: organizator 1,3, sędzia 1,2) – czcionka systemowa ponad limit nie rozpycha układu.
- Regresja wizualna: `tools/visual/maestro/catalog-l10n.yaml` – sekcje z przełącznikami „Pseudo” i „Aa 130%”, zrzuty `<sekcja>__pseudo130__<phone|tablet>.png` (wzorce po buildzie `preview` w CI – IMP-459/608).

## Znalezione i poprawione

| Komponent | Problem (pseudo +40% / 130%) | Poprawka |
|---|---|---|
| `Badge` (waga, numer startowy, kara, „Oceniona”) | tekst mógł się zawinąć w plakietce | `numberOfLines={1}` |
| `SegmentedControl` – licznik segmentu | licznik bez ograniczenia linii | `numberOfLines={1}` |
| `ChoiceChipGroup` – etykieta wyboru (styl, długość turnieju) | etykieta chipa zawijała się | `numberOfLines={1}` |
| `ScreenHeader` – link „wstecz” z nazwą poprzedniego ekranu | długa nazwa turnieju wypychała akcje nagłówka | `numberOfLines={1}` + `flexShrink: 1` (wielokropek, UI-05) |

Zmiany dotyczą tylko przepełnienia (tekst mieszczący się wygląda tak samo) – bez zmian w designie; do potwierdzenia na zrzutach przez projektanta (IMP-650).

## Przegląd ręczny (do wykonania – brak urządzeń)

Build `preview`, słownik pseudo (DevCatalog „Pseudo”; pełne ekrany – `I18nProvider pseudo` w buildzie testowym TC-I18N-009, przełącznik aplikacji jeszcze nie istnieje), czcionka systemowa:

| Urządzenie | Czcionka | Zakres | Wynik |
|---|---|---|---|
| iPhone 12 | 130% | SCR-ORG-01…22 | {…} |
| Pixel 6a | 130% | SCR-ORG-01…22 | {…} |
| iPad 9 | 120% | SCR-JDG-00…10 (wartości not i „Twój wynik” bez zawijania) | {…} |
| Galaxy Tab A8 | 120% | SCR-JDG-00…10 | {…} |

Lista kontrolna ekranu: brak tekstu poza ekranem; przyciski i pigułki w jednej linii; nazwiska, nazwy kategorii i meta z wielokropkiem (UI-05); opisy kryteriów (2 linie) i banery zawijają; brak nachodzenia na stopkę formularza.

| Ekran | Problem | Poprawka | Status |
|---|---|---|---|
| {…} | {…} | {…} | {…} |
