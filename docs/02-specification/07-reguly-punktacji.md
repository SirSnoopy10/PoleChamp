# Reguły punktacji i sędziowania

> Dokument: `02-specification/07-reguly-punktacji.md` · Wersja 1.0 · 23.10.2026
> Decyzja architektoniczna: [ADR-006](../01-architecture/adr/ADR-006-model-punktacji-i-agregacji.md). Implementacja referencyjna: pakiet `@polechamp/scoring` ([ADR-011](../01-architecture/adr/ADR-011-monorepo-i-wspoldzielony-silnik-punktacji.md)). Kontekst sportowy: [02-reguly-oceniania-w-pole-sport.md](../00-research/02-reguly-oceniania-w-pole-sport.md).
> Prototyp: funkcje `judgeTotalFor`, `aggregateFor`, `computeRanking`, `fmt` w `design/PoleChamp v2.dc.html`. Odstępstwa od prototypu mają identyfikatory **D-SC-xx** (§9).

## 1. Pojęcia i oznaczenia

| Symbol | Znaczenie | Dziedzina (MVP) |
|---|---|---|
| `k` | kryterium kategorii | 1–12 kryteriów |
| `S_k` | skala kryterium („Skala 0–max”) | liczba całkowita 1–20 (domyślnie 10) |
| `w_k` | waga kryterium | 0,5–5,0 co 0,5 |
| `v_k` | nota sędziego za kryterium | 0 … `S_k`, krok 0,5 |
| `p` | rodzaj kary | 0–10 rodzajów |
| `c_p` | „Punkty za 1 raz” | 0,5–50 co 0,5 |
| `N_p` | „Maks. wystąpień” | 1–10 |
| `n_p` | liczba wystąpień kary w arkuszu | 0 … `N_p` |
| `j` | sędzia panelu kategorii | – |
| `J` | liczba sędziów oczekiwanych (panel) | 1–30 |
| `n` | liczba sędziów, którzy ocenili start | 0 … `J` |
| `T_j` | wynik sędziego `j` (arkusz) | ≥ 0 |
| `R` | wynik oficjalny startu | ≥ 0, 2 miejsca po przecinku |

## 2. Wynik sędziego (arkusz)

```
K_j = Σ_k ( v_k × w_k )                  – suma ważona kryteriów
P_j = Σ_p ( n_p × c_p )                  – suma kar
T_j = max( 0 ; K_j − P_j )               – wynik sędziego (D-SC-03)
```

- **Maksymalny wynik sędziego** (wyświetlany jako „Maksymalny wynik sędziego: {max} pkt” i „/ {max}”): `MAX = Σ_k S_k × w_k`. Domyślnie: Pole Sport / Pole Art / Doubles = 10×2 + 10×1,5 + 10 + 10 + 10 = **65**; Exotic (+ „Praca na podłodze” ×1) = **75**.
- **Wartości początkowe nowego formularza:** `v_k = S_k / 2` (dla całkowitej skali to zawsze wielokrotność 0,5: skala 10 → 5,0; skala 7 → 3,5; w dziesiątych `v = S_k × 5`), `n_p = 0` (zgodnie z prototypem – D-SC-09; uproszczenie zapisu TL-29).
- **Kompletność arkusza:** arkusz zawiera notę dla każdego kryterium kategorii i licznik dla każdej kary. Brak → odrzucenie `SCHEMA_MISMATCH` (INT-02).
- **Arytmetyka:** wszystkie wartości w liczbach całkowitych:
  - `v` i `w` w dziesiątych (`8,5 → 85`, `×1,5 → 15`), więc `v×w` wychodzi w setnych punktu;
  - `c` w dziesiątych, więc `n×c×10` wychodzi w setnych;
  - `T_j` w setnych – zawsze wielokrotność 0,25 pkt (wynik dokładny, bez zaokrągleń).

## 3. Agregacja ocen wielu sędziów

### 3.1 Metoda MVP: średnia arytmetyczna (`MEAN`) – zgodnie z designem
```
R = round_half_up( (Σ_{j ocenił} T_j) / n ; 2 miejsca )     dla n ≥ 1
R = brak („—”)                                               dla n = 0
```
- Średnia liczona z sędziów, **którzy złożyli ocenę** (jak w prototypie), także gdy `n < J` – wynik jest wtedy **niekompletny** (etykieta „{n}/{J} sędziów”).
- `J` = liczba sędziów w panelu kategorii (`category_judge`), którzy są aktywni **lub** złożyli w tej kategorii co najmniej jedną ocenę. MVP: panel = wszyscy aktywni sędziowie turnieju w chwili startu kategorii, plus sędziowie dodani później, dopóki kategoria nie jest zablokowana.
- Implementacja całkowitoliczbowa (setne, `S = Σ T_j` w setnych, `S ≥ 0`): `R_setne = ⌊(2·S + n) / (2·n)⌋`.

### 3.2 Metoda v1.1: średnia obcięta (`TRIMMED_MEAN`) – poza MVP
- Gdy `n ≥ 5`: odrzucić jedną najwyższą i jedną najniższą wartość `T_j`, a z pozostałych policzyć średnią jak wyżej. Gdy `n < 5`, stosowana jest zwykła średnia. Wzorzec: POSA (≥ 5 sędziów) i ISU ([02-reguly-oceniania-w-pole-sport.md §5](../00-research/02-reguly-oceniania-w-pole-sport.md#5-agregacja-not-wielu-sędziów)).

### 3.3 Postęp oceniania
- Kategoria: `done = liczba arkuszy` (aktywne starty), `exp = aktywne starty × J`; „{done}/{exp} ocen”, procent = round(100·done/exp).
- Turniej: sumy po kategoriach Trwa i Zakończona; „{done} z {exp} ocen w rozpoczętych kategoriach”.
- Sędzia (tablet): „{x}/{y} ocenione” = własne arkusze / aktywne starty w kategorii.
- Zawodniczka (lista startowa): „{n}/{J}”.

## 4. Zaokrąglenia i prezentacja

| Wartość | Precyzja przechowywania | Prezentacja |
|---|---|---|
| Nota `v` | 0,5 (dziesiąte) | „8,5”, „10,0” (zawsze 1 miejsce, jak w prototypie) |
| Waga `w` | 0,5 | „×2”, „×1,5” (bez zbędnych zer) |
| Kara `c` | 0,5 | „−2 pkt”, „−0,5 pkt” |
| Wynik sędziego `T_j` | 0,01 (dokładny, wielokrotność 0,25) | „Twój wynik” – 1 miejsce, half-up: 54,25 → „54,3” |
| Suma kar w formularzu | 0,01 | chip „kary −4,0” (1 miejsce) |
| Wynik oficjalny `R` | 0,01 (half-up ze średniej) | 1 miejsce, half-up **z wartości `R`** (D-SC-05): 54,75 → „54,8”; 55,13 → „55,1” |
| Wynik przy pozornym remisie | 0,01 | Jeśli dwa **sąsiednie** wiersze rankingu mają różne miejsca, a ten sam wynik po zaokrągleniu do 0,1, oba pokazują 2 miejsca: „52,70” i „52,65” (D-SC-05) |
| PDF | jak ranking | jak ranking + stopka z wersją i sumą kontrolną |

- Separator dziesiętny: przecinek. Minus: znak „−” (U+2212). Cyfry tabelaryczne.
- `round_half_up` jest liczone na liczbach całkowitych (bez liczb zmiennoprzecinkowych). Prototyp używa `Math.round` na `double`, co daje identyczne wyniki dla wartości dodatnich poza przypadkami granicznymi błędów reprezentacji.
- Pasek w rankingu: szerokość = `min(100%, R / MAX)`.

## 5. Ranking, remisy i miejsca

Kolejność sortowania startów **aktywnych z co najmniej jedną oceną**:
1. `R` malejąco (porównanie w setnych).
2. **Remis 1:** średnia not kryterium rozstrzygającego (`tie_break_criterion_id`, domyślnie **pierwsze kryterium** listy = „Technika”), liczona z tych samych arkuszy: `round_half_up(Σ v / n ; 2)` – malejąco. (Prototyp: średnia `vals[criteria[0]]`.) Całkowitoliczbowo (TL-30): `tie_setne = ⌊(2·10·Σv_dziesiąte + n) / (2·n)⌋`, np. noty 9,0 i 8,5 → `⌊(2·10·175 + 2)/4⌋ = 875` → 8,75.
3. **Remis 2 (D-SC-04):** średnia punktów karnych `round_half_up(Σ P_j / n ; 2)` – **rosnąco** (mniej kar wygrywa). Całkowitoliczbowo: `kary_setne = ⌊(2·Σ P_j_setne + n) / (2·n)⌋`. Porównania remisów są wykonywane na tych zaokrąglonych wartościach całkowitych (deterministycznie na kliencie i serwerze).
4. **Remis 3 (D-SC-04):** **ex aequo** – to samo miejsce, kolejne miejsce pominięte (1, 2, 2, 4). Kolejność wyświetlania w ex aequo: numer startowy rosnąco.

Następnie:
- Starty aktywne **bez ocen**: wynik „—”, miejsce „–” (D-SC-06), etykieta „brak ocen”, na końcu listy wg kolejności startowej.
- Starty **wycofane**: poza rankingiem, w zakładce Wyniki na samym końcu z etykietą „Wycofana”, bez wyniku i miejsca (D-SC-10).
- Wyniki niekompletne (`n < J`) uczestniczą w rankingu (jak w prototypie) z etykietą „{n}/{J} sędziów”. W kategorii zablokowanej i w PDF mają dodatkowo oznaczenie „wstępny” (D-SC-11).
- Kolor miejsca: miejsca 1–3 (z wynikiem) accent-300, pozostałe neutral-500. Pasek: 1. miejsce accent, pozostałe accent-700.
- Tekst objaśnienia pod rankingiem: „Wynik = średnia sędziów z (kryterium × waga − kary). Remis rozstrzyga wyższa ocena za Technikę.” (nazwa kryterium dynamicznie – [05-ekrany-organizatora.md](05-ekrany-organizatora.md#scr-org-08--zakładka-wyniki)).

## 6. Przykłady liczbowe

Wszystkie przykłady są zgodne z prototypem (dane demo i zrzuty z `uploads/`), chyba że oznaczono inaczej. Wagi domyślne: Technika ×2, Artyzm / interpretacja muzyki ×1,5, Choreografia ×1, Płynność i przejścia ×1, Wrażenie ogólne ×1; kary: Upadek 2 pkt (maks. 3×), Przekroczenie czasu 1 pkt (maks. 2×).

### P1 – Arkusz sędziego bez kar („Suma z tego formularza: 54.3”, `draw-7df0e943`)
| Kryterium | Nota `v` | Waga `w` | `v × w` | w setnych |
|---|---|---|---|---|
| Technika | 8,5 | 2 | 17,00 | 85 × 20 = 1700 |
| Artyzm / interpretacja muzyki | 8,5 | 1,5 | 12,75 | 85 × 15 = 1275 |
| Choreografia | 8,0 | 1 | 8,00 | 80 × 10 = 800 |
| Płynność i przejścia | 8,0 | 1 | 8,00 | 800 |
| Wrażenie ogólne | 8,5 | 1 | 8,50 | 850 |
| **K** | | | **54,25** | **5425** |

`P = 0` → `T = 54,25` → „Twój wynik **54,3** / 65” ✔ (prototyp v2: „54,3”; v1: „54.3”).

### P2 – Ten sam arkusz z karą Upadek ×2 (`draw-ec4d7712`)
`P = 2 × 2 = 4,00` (20 dziesiątych × 2 × 10 = 400 setnych) → `T = 5425 − 400 = 5025` setnych = **50,25 → „50,3”**, chip „kary −4,0” ✔ (zrzut: „Suma z tego formularza: 50.3”).

### P3 – Arkusz z danych demo (c3, sędzia jA, zawodniczka nr 41)
Noty 8,5 / 9 / 8 / 9 / 7,5, Przekroczenie czasu ×1: `K = 17 + 13,5 + 8 + 9 + 7,5 = 55,00`; `P = 1,00` → **T = 54,00** ✔ (zgodne z wynikiem 54 w danych prototypu).

### P4 – Średnia 5 sędziów (c3, nr 43 Amelia Król)
`T = 55,25; 56,25; 55,25; 53,00; 54,00` → `S = 273,75`, `n = 5` → `R = 54,75` (setne: ⌊(2·27375 + 5)/10⌋ = ⌊5475,5⌋ = 5475) → wyświetlane **„54,8”** ✔.

### P5 – Średnia z wartością x,x0 (c3, nr 45 Magdalena Kaczmarek)
`54,50 + 54,25 + 52,75 + 55,25 + 54,75 = 271,50` → `R = 54,30` → **„54,3”** ✔.

### P6 – Pozorny remis po zaokrągleniu (c3, nr 42 i nr 41)
- nr 42 Agnieszka Mazur: `51 + 53,75 + 51 + 52,5 + 55,25 = 263,50` → `R = 52,70`.
- nr 41 Zuzanna Król: `54 + 50,5 + 55 + 53,5 + 50,25 = 263,25` → `R = 52,65`.
- Prototyp pokazuje obie jako „52,7” na miejscach 5 i 6. **Specyfikacja (D-SC-05):** miejsca 5 i 6 bez zmian, wyświetlane **„52,70”** i **„52,65”**.

### P7 – Wynik niekompletny (c3, nr 47 Natalia Sikora, 3/5)
`54,75 + 56,00 + 55,75 = 166,50`, `n = 3` → `R = 55,50` → „55,5”, „3/5 sędziów”, miejsce 1 (wynik wstępny – w kategorii Trwa bez pigułki, po blokadzie z pigułką „wstępny”).

### P8 – Zaokrąglenie połówki (c3, nr 46 Paulina Lewandowska, 2/5)
`54,00 + 56,25 = 110,25`, `n = 2` → dokładnie 55,125 → `R = 55,13` (half-up) → „55,1” ✔ (prototyp: „55,1”).

### P9 – Remis rozstrzygnięty kryterium „Technika” (przykład syntetyczny)
| Start | `T_j` (2 sędziów) | `R` | Technika (noty) | Średnia Techniki | Miejsce |
|---|---|---|---|---|---|
| A | 54,50; 54,00 | 54,25 | 9,0; 8,5 | 8,75 | **1** |
| B | 54,25; 54,25 | 54,25 | 8,5; 8,5 | 8,50 | **2** |

### P10 – Remis po Technice, rozstrzygnięty karami, oraz ex aequo (syntetyczny)
| Start | `R` | Śr. Techniki | Śr. kar | Miejsce |
|---|---|---|---|---|
| C | 50,00 | 8,00 | 0,00 | 1 |
| D | 50,00 | 8,00 | 1,00 | 2 |
| E | 49,00 | 7,50 | 0,00 | 3 |
| F | 49,00 | 7,50 | 0,00 | 3 (ex aequo) |
| G | 48,25 | 7,00 | 0,00 | 5 |

### P11 – Obcięcie do zera (D-SC-03, syntetyczny)
Wszystkie noty 0,5, Upadek ×3: `K = 0,5×2 + 0,5×1,5 + 0,5×3 = 3,25`, `P = 6,00` → `K − P = −2,75` → **T = 0,00** („Twój wynik 0,0 / 65”, chip „kary −6,0”). Prototyp pokazałby „-2,7” (`Math.round(−27,5) = −27` w JavaScript, z dywizem zamiast znaku minus – poprawka TL-28).

### P12 – Exotic (6 kryteriów, MAX = 75)
Noty 8 / 8,5 / 7,5 / 9 (Praca na podłodze) / 8 / 8: `K = 16 + 12,75 + 7,5 + 9 + 8 + 8 = 61,25`; Przekroczenie czasu ×2: `P = 2` → **T = 59,25 → „59,3” / 75**.

### P13 – Średnia obcięta (v1.1, poza MVP) dla nr 43
Posortowane `53,00 < 54,00 < 55,25 = 55,25 < 56,25`, odrzucone 53,00 i 56,25 → `(54,00 + 55,25 + 55,25) / 3 = 164,50 / 3 = 54,8333…` → `R = 54,83` → „54,8”.

### P14 – Wartość domyślna
Nowy formularz, Pole Sport, wszystkie noty 5,0 i brak kar: `K = 10 + 7,5 + 5 + 5 + 5 = 32,5` → „Twój wynik 32,5 / 65”.

## 7. Cykl oceniania – kompletność, blokada, korekty

| Sytuacja | Reguła |
|---|---|
| Kiedy można oceniać | Kategoria **Trwa**, turniej **Trwa**, sędzia w panelu i aktywny, start aktywny (INT-01) |
| Kategoria W przygotowaniu | Sędzia widzi kartę przygaszoną, a tapnięcie pokazuje toast „Ta kategoria jeszcze się nie rozpoczęła” |
| Korekta przez sędziego | Dowolnie wiele razy, dopóki kategoria jest Trwa („Zaktualizuj ocenę”). Każda korekta = nowa rewizja w audycie |
| Korekta przez organizatora | **Niemożliwa** bezpośrednio. Organizator może odblokować kategorię, żeby sędzia poprawił ocenę, albo przyjąć odrzucone zgłoszenie |
| Blokada („Zakończ i zablokuj”) | Wyniki ostateczne: przeliczenie `category_result` (nowa `results_version`), zapis `category.locked_at` i `category.final_results_hash` (ostateczność wynika ze statusu `LOCKED` – w modelu nie ma osobnej kolumny `is_final`; korekta TL-15). Przy brakach – ostrzeżenie (FR-309). Sędziowie: tylko podgląd |
| Odblokowanie („Odblokuj”) | Tylko gdy turniej nie jest Zakończona. Wyniki tracą status ostatecznych do kolejnej blokady (nowa suma kontrolna) |
| Zakończenie turnieju | Kategorie Trwa są automatycznie blokowane, kategorie W przygotowaniu oznaczone „nierozegrana”. Po zakończeniu brak zmian (MVP) |
| Oceny po blokadzie (offline) | Odrzucane i zapisywane do decyzji organizatora ([ADR-010](../01-architecture/adr/ADR-010-blokada-kategorii-a-oceny-offline.md)) |
| Zmiana konfiguracji punktacji | Tylko w W przygotowaniu (D-SC-07) – nie ma przeliczeń wstecznych |
| Wycofanie startu z ocenami | Oceny zostają (audyt), start poza rankingiem (D-SC-10) |
| Dezaktywacja sędziego w trakcie | Jego złożone oceny liczą się nadal; jeśli nie złożył żadnej w kategorii, nie wlicza się do `J` |

## 8. Szablony kryteriów i kar

Kopiowane do nowej kategorii przy jej utworzeniu (FR-301), potem edytowalne w statusie W przygotowaniu.

| Styl | Kryteria (kolejność, skala, waga, opis) | Kary |
|---|---|---|
| Pole Sport, Pole Art, Doubles | 1. Technika (10, ×2, „Siła, elementy na rurze”); 2. Artyzm / interpretacja muzyki (10, ×1,5, „Muzykalność i wyraz”); 3. Choreografia (10, ×1, „Struktura i pomysłowość układu”); 4. Płynność i przejścia (10, ×1, „Płynność ruchu i transferów”); 5. Wrażenie ogólne (10, ×1, „Ogólne wrażenie sceniczne”) | Upadek (2 pkt, maks. 3×); Przekroczenie czasu (1 pkt, maks. 2×) |
| Exotic | jak wyżej + na 4. pozycji „Praca na podłodze” (10, ×1, „Floorwork i przejścia parterowe”) | jak wyżej |

Uwaga: w prototypie kryterium „Praca na podłodze” dostają tylko kategorie Exotic z danych demo. Nowa kategoria utworzona formularzem dostaje zawsze 5 kryteriów. Specyfikacja ujednolica to w szablonie stylu (D-SC-12). Szablon dla Doubles bez „Synchronizacji” – **Q-05** dla PO (polskie regulaminy duetów mają synchronizację [S9]).

## 9. Decyzje i odstępstwa od prototypu

| ID | Decyzja | Prototyp | Uzasadnienie | Do potwierdzenia |
|---|---|---|---|---|
| D-SC-01 | Agregacja = średnia arytmetyczna (MVP) | tak samo | Zgodność z designem | – |
| D-SC-02 | Arytmetyka całkowitoliczbowa, `R` z dokładnością 0,01 (half-up), ranking na `R` | `double`, ranking na wartości niezaokrąglonej | Determinizm klient/serwer, czytelność oficjalnego wyniku | – |
| D-SC-03 | `T_j = max(0, K − P)` | brak dolnego ograniczenia | Wynik ujemny jest nieintuicyjny; IPSF: minimum 0 [S1] | Q-02 |
| D-SC-04 | Remis: Technika → mniej kar → ex aequo | tylko Technika (dalej kolejność listy) | Jednoznaczność, brak arbitralności kolejności dodania | Q-01 |
| D-SC-05 | Wyświetlanie z `R`; 2 miejsca przy pozornym remisie sąsiadów | 1 miejsce z wartości dokładnej | Czytelność rankingu (przykład P6) | – |
| D-SC-06 | Starty bez ocen: miejsce „–” | numer pozycji | Nie przypisujemy miejsca bez oceny | – |
| D-SC-07 | Konfiguracja punktacji edytowalna tylko w W przygotowaniu | edytowalna zawsze | Integralność wyników | – |
| D-SC-08 | Kary liczone per sędzia (każdy sędzia w swoim arkuszu) | tak samo | Zgodność z designem. Kary sędziego głównego – v1.1 | – |
| D-SC-09 | Domyślne noty = połowa skali | tak samo | Zgodność z designem | Q-03 (wskaźnik „nieruszone”) |
| D-SC-10 | Wycofane starty poza rankingiem | brak pojęcia | Obsługa nieobecnych zawodniczek | – |
| D-SC-11 | Wyniki niekompletne w rankingu z oznaczeniem, „wstępny” po blokadzie i w PDF | tylko „n/5 sędziów” | Przejrzystość | – |
| D-SC-12 | Szablon Exotic z „Praca na podłodze” także dla nowych kategorii | tylko w danych demo | Spójność | – |

## 10. Pseudokod referencyjny (`@polechamp/scoring`)

```ts
// Wszystkie wartości całkowite: tenths (dziesiąte), hundredths (setne).
type Criterion = { id: string; scaleMaxTenths: number; weightTenths: number };
type PenaltyType = { id: string; pointsTenths: number; maxOccurrences: number };
type Sheet = { judgeId: string; values: Record<string, number /* tenths */>; penalties: Record<string, number /* count */> };

const roundHalfUpDiv = (num: number, den: number) => Math.floor((2 * num + den) / (2 * den)); // num >= 0, den > 0

function sheetTotal(sheet: Sheet, criteria: Criterion[], penalties: PenaltyType[]) {
  const k = criteria.reduce((s, c) => s + sheet.values[c.id] * c.weightTenths, 0);            // hundredths
  const p = penalties.reduce((s, t) => s + (sheet.penalties[t.id] ?? 0) * t.pointsTenths * 10, 0); // hundredths
  return { criteria: k, penalty: p, total: Math.max(0, k - p) };
}

function aggregate(totals: number[] /* hundredths */) {
  if (totals.length === 0) return null;
  const sum = totals.reduce((a, b) => a + b, 0);
  return roundHalfUpDiv(sum, totals.length); // R w setnych
}

function displayOneDecimal(rHundredths: number) {
  return roundHalfUpDiv(rHundredths, 10); // dziesiąte, np. 5475 -> 548 -> "54,8"
}
// Ranking: sortuj po (R desc, tieBreakMean desc, penaltyMean asc); równe trójki -> ten sam rank (1,2,2,4).
```
