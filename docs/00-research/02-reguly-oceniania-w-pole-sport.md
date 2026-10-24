# Reguły oceniania w pole sport i sportach pokrewnych

> Dokument: `00-research/02-reguly-oceniania-w-pole-sport.md` · Autor: Architekt systemu (Agent 1) · Stan wiedzy: 23.10.2026
> Źródła oznaczone [Sx] są wymienione w [01-analiza-konkurencji.md §8](01-analiza-konkurencji.md#8-źródła). Docelowe reguły PoleChamp: [../02-specification/07-reguly-punktacji.md](../02-specification/07-reguly-punktacji.md).

## 1. Krajobraz organizacyjny

- **IPSF – International Pole Sports Federation** (dziś „International Pole and Aerial Sports Federation”) pisze regulaminy i Code of Points, prowadzi certyfikację sędziów (Level 1–3, Level 3 to sędzia główny) i organizuje mistrzostwa świata [S5][S7]. Sędzia główny odpowiada za cały panel, stosowanie przepisów i sumowanie not [S5].
- **POSA – Pole Sport & Arts World Federation** publikuje odrębne Code of Points dla Pole Sport (wersja 2022 przeczytana, 2025 dostępna) oraz regulamin Pole Art [S2][S2a][S3].
- **W Polsce** działają obie federacje (mistrzostwa Polski IPSF i POSA) [S35] oraz federacje i organizatorzy krajowi (np. Puchar Polski ADA [S31], lokalne zawody typu Poledanceholic [S9]).
- **PSO – Pole Sport Organization (USA)** prowadzi zawody amatorskie z rotacją sędziów i opisową informacją zwrotną [S8].
- Formaty widowiskowe (Pole Theatre: Art, Drama, Comedy, Classique) nie mają publicznie dostępnej karty ocen [S33].

Wniosek: **nie ma jednego standardu**. Duże federacje mają złożone systemy (katalogi elementów, osobne panele), a zawody krajowe i amatorskie mają prostsze karty: kilka kryteriów po 0–10 pkt plus punkty ujemne. Regulaminy POSA wprost dopuszczają zmodyfikowane zasady na zawodach krajowych i amatorskich [S2]. PoleChamp celuje w ten drugi segment, z możliwością rozbudowy.

## 2. Panele sędziowskie

| Organizacja / format | Skład panelu | Uwagi | Źródło |
|---|---|---|---|
| POSA Pole Sport (2022) | 5–13 sędziów: sędziowie artystyczni (A-J), wykonania (E-J), trudności (D-J) + sędzia główny. Na zawodach międzynarodowych dodatkowo Superior Jury | „Jeśli to możliwe”, co najmniej 5 sędziów A i 5 sędziów E, aby odrzucić najwyższą i najniższą notę | [S2] rozdz. 8.1–8.2 |
| POSA Pole Art (2019) | 6 sędziów (2 techniczni, 2 artystyczni, 2 wykonania) + 1 sędzia główny | Sędzia główny nakłada własne kary | [S3] rozdz. 14 |
| IPSF Pole Sports (CoP 2017) | Sekcje: elementy obowiązkowe, bonus techniczny, odjęcia techniczne, prezentacja artystyczna + kary sędziego głównego | Skład panelu nie wynika z dostępnego fragmentu | [S1] |
| IPSF ULTRA Pole (2022/23) | 3 sędziów, jeden z nich to „master judge”; każdy ocenia wszystkie kryteria | Format battle, zwycięzca większością głosów | [S4] rozdz. 7.2 |
| PSO (USA, amatorskie) | Większa pula sędziów, w danej chwili ocenia trzech, rotacja | Opisowa informacja zwrotna | [S8] |
| Poledanceholic (PL, 2025) | Liczba sędziów niepodana | Karta kryteriów 0–10 pkt | [S9] |
| ISU (łyżwiarstwo) | Panel techniczny + zwykle 9 sędziów (min. 3) | Średnia obcięta | [S22] |
| FIG (gimnastyka) | Panel D (2 sędziów, uzgadniają notę) + panel E (5–6 sędziów) | Odrzucenie skrajnych not E | [S32] (źródła wtórne, liczba sędziów E niespójna) |

## 3. Kryteria i skale

- **POSA Pole Sport 2022:** nota artystyczna do 70 pkt; nota wykonania liczona przez odejmowanie od 75 pkt; nota trudności z elementów po 0,5 pkt plus bonusy (kombinacje, ryzyko); od sumy odejmuje się kary trudności i kary sędziego głównego. Przykład z dokumentu: 39 + 45 + 5 − 4 − 3 = 84 pkt [S2] rozdz. 8.1, 8.3.
- **POSA Pole Art (2019):** technika (55 pkt w zasadach zbiorczych, 65 pkt na karcie – niespójność w samym dokumencie), artyzm do 100 pkt, wykonanie przez odejmowanie od 75 pkt. Sędziowie mogą dawać całe i **połówkowe punkty (0,5)**. Wszystkie wyniki liczy komputer [S3] rozdz. 5, 6, 16.
- **IPSF CoP 2017:** bonus techniczny do 25,0 pkt, odjęcia techniczne do 25,0 pkt, prezentacja artystyczna i choreograficzna do 20,0 pkt, elementy obowiązkowe po +0,1 do +1,0. Minimalny wynik końcowy wynosi 0 [S1].
- **Poledanceholic (PL):** Pole Dance Solo – 10 kryteriów po max 10 pkt (m.in. całościowe wrażenie, emocje/ekspresja, praca na podłodze, interpretacja muzyki, wygląd, siła, technika, spójność, akrobatyka, rozciągnięcie), łącznie 100 pkt. Exotic Solo – 7 kryteriów po 10 pkt (m.in. flow/taniec/footwork, praca na podłodze, trik na rurze, interpretacja muzyki), 70 pkt. Duety mają dodatkowo synchronizację [S9].
- **ISU:** komponenty programu 0,25–10,00 z krokiem 0,25, mnożone przez współczynniki (wagi) zależne od konkurencji [S22].

**Wniosek:** typowy model dla zawodów krajowych to kilka kryteriów w skali 0–10 z krokiem 0,5, czasem ważonych. Dokładnie to robi prototyp PoleChamp (skala 0–10, krok 0,5, wagi ×1, ×1,5, ×2).

## 4. Kary (odjęcia)

| Źródło | Przykłady kar | Sposób naliczania |
|---|---|---|
| POSA Pole Art (2019) [S3] | upadek −5, poślizg / utrata równowagi −2, wycieranie rąk / poprawianie stroju −2, słabe przejścia −1, złe linie −0,5; jednorazowe: nierówne użycie rur −3, < 70% wysokości rury −3 | „za każde wystąpienie” lub „jednorazowo” |
| POSA Pole Art – sędzia główny [S3] | awaria kostiumu do −10, treści erotyczne do −5, spóźnienie na scenę > 20 s do −3, dyskwalifikacja za wejście > 60 s | kary sędziego głównego z limitem |
| POSA Pole Sport 2022 [S2] | spóźnienie na scenę > 20 s −1,0 (sędzia główny), > 60 s walkower; błędy ogólne −3,0 lub −5,0 jednorazowo | jednorazowe na końcu występu |
| IPSF CoP 2017 [S1] | upadek −3,0, poślizg −1,0, wycieranie rąk −1,0, słaba prezentacja −0,5; jednorazowe: brak spinu na rurze statycznej/obrotowej −2,0 itd. | za wystąpienie / jednorazowo |
| IPSF ULTRA Pole [S4] | upadek −2, wulgarność −3, przerwa w „rozmowie” −3 | za wystąpienie |
| Poledanceholic (PL) [S9] | poślizg max −5, upadek max −5, problemy z kostiumem max −5, wulgarne elementy max −5, niedozwolony element −10 za każdy, dotknięcie rury przez „rekwizyt ludzki” −10 | z górnym limitem |
| ISU [S22] | upadek −1,0, przekroczenie czasu i inne | za wystąpienie |

**Wniosek:** w praktyce występują dwa typy kar: **za każde wystąpienie z limitem** („max minus 5”) oraz **jednorazowe**. Model prototypu (wartość za 1 raz × liczba wystąpień, z maksymalną liczbą wystąpień) obsługuje oba: kara jednorazowa to po prostu `maks. wystąpień = 1`.

## 5. Agregacja not wielu sędziów

| System | Metoda | Źródło |
|---|---|---|
| POSA Pole Sport | Średnia z odrzuceniem najwyższej i najniższej noty (przy ≥ 5 sędziach w panelu) | [S2] rozdz. 8.1 |
| POSA Pole Art | Suma not technicznej, artystycznej i wykonania minus kary sędziego głównego (metoda łączenia not dwóch sędziów w sekcji niepodana) | [S3] rozdz. 16 |
| ISU | Średnia obcięta: odrzucenie najwyższej i najniższej noty dla każdego elementu i komponentu, zaokrąglenie do 0,01 | [S22] |
| FIG | Odrzucenie skrajnych not panelu E, średnia z pozostałych; panel D uzgadnia notę | [S32] |
| LiveJudge | Do wyboru: średnia, odrzucenie skrajnych, Z-score, „olimpijska” | [S14] |
| IPSF ULTRA | Głosowanie większością (format battle) | [S4] |
| **Prototyp PoleChamp** | **Średnia arytmetyczna sum poszczególnych sędziów** („Wynik = średnia sędziów z (kryterium × waga − kary)”) | design |

## 6. Remisy

| System | Reguła | Źródło |
|---|---|---|
| POSA Pole Sport | 1) wyższa nota wykonania, 2) wyższa nota artystyczna, 3) wyższa nota trudności | [S2] rozdz. 8.4 |
| IPSF CoP 2017 | wygrywa zawodnik z wyższą notą w sekcji odjęć technicznych | [S1] |
| **Prototyp PoleChamp** | „Remis rozstrzyga wyższa ocena za Technikę” – w kodzie: średnia z **pierwszego kryterium** na liście | design |

## 7. Inne praktyki istotne dla systemu

- **Kolejność startowa** ustalana losowaniem przez „neutralną osobę lub komputer” [S2] rozdz. 4.2.1.
- **Wyniki po każdym występie** (noty cząstkowe, kary, wynik, miejsce) pokazywane publicznie na zawodach POSA [S2] rozdz. 4.2.5.
- **Sędzia nie wraca do wcześniejszych występów** w celu zmiany noty (POSA Pole Art), a **po zakończeniu sędziowania nie zmienia się wyników** [S3] rozdz. 15–16. To przemawia za blokadą kategorii po zakończeniu.
- **Protesty (inquiries)** zgłaszane w krótkim oknie czasowym i tylko dla noty trudności, gdy działa Superior Jury [S2] rozdz. 8.5.
- **Superior Jury rejestruje odchylenia not sędziów** i może ostrzec lub wymienić sędziego [S2] rozdz. 8.2.
- **Sędziowie nie konsultują się w trakcie występów** i nie komentują publicznie decyzji [S3] rozdz. 14–15.
- **Zawodnik może poprosić o wgląd w karty sędziów** [S3] rozdz. 18.4.
- **Kategorie wiekowe** (POSA): Junior A 10–14, Junior B 15–17, Senior, Masters 40+, Masters 50+ [S2]. Polskie zawody mają też dzieci 7–9 [S9], czyli **niepełnoletnie zawodniczki są normą**, co ma znaczenie dla RODO.
- **Informacja zwrotna (PSO):** sędzia odpowiada na dwa pytania – co zawodniczka zrobiła dobrze i co może poprawić [S8].

## 8. Mapowanie na model PoleChamp

| Pojęcie z praktyki | Model PoleChamp (MVP) | Rozszerzenie (później) |
|---|---|---|
| Kryteria oceny z maks. punktacją | `criterion`: nazwa, skala 0–`scale_max` (1–20, domyślnie 10), krok 0,5, waga 0,5–5,0 (krok 0,5), opis dla sędziów | Kryteria „przez odejmowanie” (nota startowa − odjęcia), sekcje A/E/D |
| Kary za wystąpienie z limitem | `penalty_type`: punkty za 1 raz (≥ 0,5, krok 0,5), maks. wystąpień 1–10 | – |
| Kary jednorazowe | `penalty_type` z maks. wystąpień = 1 | – |
| Kary sędziego głównego | – (każdy sędzia liczy kary w swoim formularzu, jak w prototypie) | Rola „Sędzia główny”, kary na poziomie występu, odejmowane raz od wyniku końcowego |
| Panel 5–13 sędziów | Wszyscy aktywni sędziowie turnieju oceniają każdą rozpoczętą kategorię | Przypisanie sędziów do kategorii (`category_judge`) |
| Średnia obcięta | Średnia arytmetyczna (zgodnie z designem) | `aggregation_method = TRIMMED_MEAN`, gdy ≥ 5 ocen |
| Remis | 1) średnia kryterium rozstrzygającego (domyślnie 1. kryterium = „Technika”), 2) niższa średnia kar, 3) ex aequo | Konfigurowalna lista kryteriów rozstrzygających |
| Minimum wyniku = 0 | Wynik sędziego obcinany do 0 (decyzja D-SC-03) | – |
| Blokada wyników po sędziowaniu | „Zakończ i zablokuj” kategorię; odblokowanie tylko przez organizatora, z audytem | Zatwierdzenie przez sędziego głównego |
| Protesty / wgląd w karty | Audyt rewizji ocen, podgląd ocen per sędzia u organizatora (Should) | Moduł protestów, udostępnianie kart zawodniczkom |
| Odchylenia sędziów (Superior Jury) | – | Raport odchyleń noty sędziego od średniej panelu |
| Losowanie kolejności | Kolejność = pozycja na liście startowej (kolejność dodania) | Losowanie komputerowe z zapisem ziarna w audycie |
| Kategorie wiekowe | Pole tekstowe „Grupa wiekowa” (np. „Senior 18+”, „Junior 12–15”, „Masters 40+”, „Open”) | Słownik grup z walidacją roku urodzenia |

Szczegółowe wzory, zaokrąglenia i przykłady liczbowe są w [07-reguly-punktacji.md](../02-specification/07-reguly-punktacji.md).
