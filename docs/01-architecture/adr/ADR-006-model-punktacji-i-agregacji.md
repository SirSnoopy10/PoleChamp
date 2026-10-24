# ADR-006: Model punktacji – suma ważona per sędzia, średnia arytmetyczna, arytmetyka stałoprzecinkowa, remisy

- **Status:** Zaakceptowana – technicznie potwierdzona przez Tech Leada 23.10.2026 (przykłady P1–P14 przeliczone ponownie, wszystkie poprawne poza opisem zachowania prototypu w P11 – TL-28); reguły sportowe do potwierdzenia przez PO (Q-01, Q-02)
- **Data:** 2026-10-23
- **Powiązane:** [07-reguly-punktacji.md](../../02-specification/07-reguly-punktacji.md), [02-reguly-oceniania-w-pole-sport.md](../../00-research/02-reguly-oceniania-w-pole-sport.md), [ADR-011](ADR-011-monorepo-i-wspoldzielony-silnik-punktacji.md)

## Kontekst
- Prototyp liczy: wynik sędziego = Σ(nota × waga) − Σ(liczba × punkty kary); wynik zawodniczki = **średnia arytmetyczna** wyników sędziów, którzy ją ocenili; remis rozstrzyga wyższa średnia **pierwszego kryterium** („Technika”). Wyświetlanie: 1 miejsce po przecinku.
- Federacje stosują też średnią obciętą (POSA przy ≥ 5 sędziach, ISU, FIG) i inne reguły remisów.
- Prototyp liczy na liczbach zmiennoprzecinkowych (`Math.round`), co grozi błędami zaokrągleń (np. 52,65).
- Prototyp nie ogranicza wyniku od dołu (kary mogą dać wynik ujemny), a IPSF przyjmuje minimum 0.
- Prototyp pozwala zmieniać wagi i skale w trakcie oceniania, co zmieniałoby wyniki wstecz.

## Decyzja
1. **Wynik sędziego** `T_j = max(0, Σ_k v_k·w_k − Σ_p n_p·c_p)`, gdzie nota `v_k ∈ {0; 0,5; …; S_k}`, waga `w_k ∈ {0,5; 1,0; …; 5,0}`, kara `c_p ≥ 0,5` (krok 0,5), `n_p ∈ {0…N_p}`. Obcięcie do 0 to decyzja **D-SC-03** (rozszerzenie względem prototypu).
2. **Agregacja (MVP): średnia arytmetyczna** wyników sędziów, którzy złożyli ocenę (`MEAN`), zgodnie z designem. Model danych ma pole `aggregation_method`. `TRIMMED_MEAN` (odrzucenie jednej najwyższej i jednej najniższej, gdy n ≥ 5) planowana w v1.1.
3. **Arytmetyka stałoprzecinkowa:** noty i wagi w dziesiątych, sumy w setnych (liczby całkowite). Wynik oficjalny = średnia zaokrąglona **ROUND_HALF_UP do 0,01**. Ranking liczony na wyniku oficjalnym (0,01).
4. **Remis:** (1) wyższa średnia noty kryterium rozstrzygającego (domyślnie pierwsze kryterium = „Technika”), (2) niższa średnia punktów karnych, (3) **ex aequo** (to samo miejsce, kolejne pominięte: 1, 2, 2, 4).
5. **Prezentacja:** 1 miejsce po przecinku z przecinkiem dziesiętnym (design). Jeśli sąsiednie miejsca mają identyczny wynik po zaokrągleniu do 0,1, oba wiersze pokazują 2 miejsca (np. „52,70” i „52,65”).
6. **Zamrożenie konfiguracji:** kryteria, wagi, skale i kary są edytowalne tylko w kategorii „W przygotowaniu”.
7. Starty bez ocen nie mają miejsca („–”) i są na końcu listy, posortowane wg numeru. Wyniki niekompletne (n < J) są oznaczone.

## Rozważane alternatywy
| Opcja | Werdykt | Powód |
|---|---|---|
| Średnia obcięta od razu w MVP | Odłożona do v1.1 | Design wprost opisuje średnią. Przy typowych 3–5 sędziach na zawodach krajowych obcięcie usuwa 40–67% danych |
| Mediana | Odrzucona | Rzadko stosowana w sportach ocenianych, mało intuicyjna dla organizatorów |
| Suma zamiast średniej | Odrzucona | Wyniki nieporównywalne przy brakujących ocenach (n < J) |
| Liczby zmiennoprzecinkowe (double) | Odrzucona | Błędy zaokrągleń w granicznych przypadkach (x,x5) |
| Ranking na wartości wyświetlanej (0,1) | Odrzucona | Sztuczne remisy (52,70 i 52,65 → „52,7”) |
| Kary nakładane raz przez sędziego głównego | v1.1 | Wymaga nowej roli. W MVP kary per sędzia, jak w prototypie |

## Konsekwencje
- ➕ Zgodność z prototypem dla typowych przypadków (sprawdzone na danych demo: 54,25 → „54,3”, 55,125 → „55,1”).
- ➕ Deterministyczne wyniki niezależne od platformy. Wspólna biblioteka na serwerze i tablecie.
- ➖ Odstępstwa od prototypu: obcięcie do 0, 2 miejsca przy sztucznych remisach, „–” zamiast numeru dla startów bez ocen, blokada konfiguracji po starcie. Każde opisane jako decyzja w [07-reguly-punktacji.md](../../02-specification/07-reguly-punktacji.md).
- ⚠ Do potwierdzenia przez PO: reguła remisu nr 2 (kary) i ex aequo (Q-01), obcięcie do 0 (Q-02).
