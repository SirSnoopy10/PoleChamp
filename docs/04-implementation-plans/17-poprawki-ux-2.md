# EP-17 – Poprawki UX po przeglądzie 30.10

> Dokument: `04-implementation-plans/17-poprawki-ux-2.md` · 30.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md) · Źródło: [raport UX 30.10.2026](../../docs-dev/qa/ux-review-2026-10-30.md) (ustalenia #1…#36)

Kolejność zadań = priorytet z raportu. Testy z ID ustalenia w nazwie (`UX2-01`…`UX2-35`). Nowe teksty i ekrany czekają na akceptację [IMP-650](15-design-i-akceptacje.md). Poza zakresem: #28 (zmiana hasła w Konto – sugestia bez wymagania) i #36 (bez zmian – do decyzji projektanta).

## Decyzje PO (30.10.2026)

| Ustalenie | Decyzja | Skutek w specyfikacji |
|---|---|---|
| #1 | Miejsca i kolejność bez zmian; pigułka „wstępny” także w kategorii trwającej, nagłówek z liczbą pełnych wyników | D-SC-11, P7 |
| #2 | Wynik oficjalny zawsze z 2 miejscami – ranking, arkusz not, PDF, CSV | D-SC-05 (zmieniona), §4, P4–P8 |
| #3 | Pasek w wierszu rankingu usunięty | §4, §5, FR-701 |

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 11 | 56 h | MOB 40 · FULL 10 · QA 6 |

## Zadania

### IMP-750 – Ranking na żywo: „wstępny”, 2 miejsca, bez paska
- **Epik / obszar:** EP-17 | **Rola:** FULL
- **Cel:** Organizatorka odróżnia wyniki niepełne od pełnych, a precyzja jest jedna w rankingu, arkuszu not, PDF i CSV.
- **Zakres:** `packages/scoring` (`formatRanking`), `modules/results`, arkusz not, `RankingRow`, `ResultsTab`, wzorce PDF. **Poza zakresem:** kolejność i miejsca.
- **Odwołania:** ustalenia #1–#3; D-SC-05, D-SC-11; FR-701, FR-704
- **Szacunek:** 10 h (M) | **Ryzyko:** średnie

### IMP-751 – Formularz oceny: wynik z wartości domyślnych, „nieruszone”, kolejka
- **Epik / obszar:** EP-17 | **Rola:** MOB
- **Cel:** Sędzia nie bierze wyniku z not domyślnych za gotowy, widzi skalę, pełne nazwiska i nazwy kryteriów.
- **Zakres:** `ScoreFooter`, `CriterionCard`, `QueuePanel`. Liczba zostaje (P14), z podpisem „z wartości domyślnych”.
- **Odwołania:** ustalenia #9, #13, #17; D-SC-09, Q-03
- **Szacunek:** 5 h (S) | **Ryzyko:** niskie

### IMP-752 – Stan offline tabletu i potwierdzenie wysyłki
- **Epik / obszar:** EP-17 | **Rola:** MOB
- **Cel:** Utrata sieci widoczna od razu; popover nie przeczy stanowi; wysłanie oceny potwierdzone toastem.
- **Zakres:** `network/online.ts`, `syncStore`, `SyncPill`, `SyncPopover`, `submitScore`.
- **Odwołania:** ustalenia #10, #11; TL-45; SCR-JDG-07
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-753 – Jeden wzorzec braków przy starcie turnieju i kategorii
- **Epik / obszar:** EP-17 | **Rola:** MOB
- **Cel:** Przycisk wyłączony, stała lista faktycznych braków z linkami.
- **Zakres:** ekran turnieju, ekran kategorii. **Poza zakresem:** walidacja API (`missing` zostaje jako zabezpieczenie).
- **Odwołania:** ustalenia #4, #5; IMP-705c
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-754 – Akcje nieodwracalne i teksty niezależne od odmiany
- **Epik / obszar:** EP-17 | **Rola:** MOB
- **Cel:** Akcje nieodwracalne mają wariant `danger` i opis skutków; szablony są poprawne dla każdej nazwy.
- **Zakres:** dialogi zakończenia turnieju i kategorii, usunięcia danych, resetu PIN, usunięcia z listy; status sędziego.
- **Odwołania:** ustalenia #6, #7, #8, #33
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-755 – Zmiana trybu urządzenia z ekranu profili
- **Epik / obszar:** EP-17 | **Rola:** MOB
- **Cel:** Pomyłkowy tryb tabletu da się cofnąć bez czyszczenia danych systemowo.
- **Zakres:** `ProfilePicker`, `ChangeModeLink`. Niewysłane oceny – ostrzeżenie, spójnie z IMP-705a.
- **Odwołania:** ustalenie #31; IMP-705a
- **Szacunek:** 3 h (S) | **Ryzyko:** średnie

### IMP-756 – Drobne: tablet sędziego
- **Epik / obszar:** EP-17 | **Rola:** MOB
- **Zakres:** auto-otwarcie pierwszej nieocenionej (#12), liczba prób PIN (#14), `returnKeyType="go"` (#15), siatka profili (#16), Wstecz Androida (#29), przesunięcie po obrocie (#32).
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-757 – Drobne: ekrany organizatora
- **Epik / obszar:** EP-17 | **Rola:** MOB
- **Zakres:** oceny z listy startowej (#18), „Zapisz zmiany” (#19), „(opcjonalnie)” (#20), ikony (#25), kontrast kryteriów (#26), nagłówki sekcji (#27), toast (#30), PDF dla pustego turnieju (#35).
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-758 – Nowa kategoria, parowanie, potwierdzenia, zaległy turniej
- **Epik / obszar:** EP-17 | **Rola:** MOB
- **Zakres:** nazwa ze stylu i poziomu, grupa wiekowa, styl/poziom bez domyślnych (#21, #34); baner zaległego turnieju (#22); kroki i alfabet kodu (#23); potwierdzenia jako arkusze (#24).
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-759 – Nazewnictwo
- **Epik / obszar:** EP-17 | **Rola:** MOB
- **Zakres:** tabela „Niespójności w nazewnictwie” w `packages/i18n`; czeka na IMP-650.
- **Szacunek:** 2 h (XS) | **Ryzyko:** niskie

### IMP-760 – Runda 3 na emulatorze (niedokończona)
- **Epik / obszar:** EP-17 | **Rola:** QA
- **Zakres:** weryfikacja poprawek i testy z sekcji „Czego nie przetestowano”; wyniki w raporcie (`.ux/r3/`).
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie
