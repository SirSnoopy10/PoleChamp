# UAT – próba generalna przed pilotem

> Dokument: `03-test-plans/07-uat-proba-generalna.md` · Tech Lead · 23.10.2026 · Strategia: [00-strategia-testowania.md](00-strategia-testowania.md)
> Cel MVP: [02-zakres-mvp.md §1](../02-specification/02-zakres-mvp.md#1-cel-mvp) · Zadania: [IMP-464, IMP-465](../04-implementation-plans/11-qa-i-automatyzacja-testow.md)

## 1. Cel

Sprawdzić w warunkach zbliżonych do zawodów, z **prawdziwymi sędziami** i organizatorem pilotażowym, że:
1. organizator samodzielnie przygotuje turniej i przeprowadzi go od startu do PDF,
2. sędziowie oceniają występ w ≤ 45 s bez pomocy i bez utraty ocen, także przy awarii Wi-Fi,
3. reguły punktacji, remisów i oznaczeń są zrozumiałe i akceptowane przez sędziego eksperta (Q-01, Q-02, Q-03),
4. procedury dnia zawodów (parowanie, blokada z ostrzeżeniem, odrzucone oceny, dyżur) działają.

## 2. Uczestnicy i zasoby

| Rola | Liczba | Zadanie |
|---|---|---|
| Organizator pilotażowy (PO zaprasza) | 1–2 | konfiguracja i prowadzenie turnieju na własnym telefonie |
| Sędziowie | 3–5 (w tym 1 sędzia ekspert) | ocenianie na tabletach |
| Wolontariuszki „zawodniczki” | 6–10 | krótkie występy 60–90 s (lub nagrania wideo odtwarzane na ekranie) |
| Zespół | TL, QA, 1 MOB, 1 BE, PM | obserwacja, ankiety, triage, poprawki |
| Sprzęt | ≥ 3 tablety (iPad + Android), telefon organizatora, router Wi-Fi sterowany przez zespół, powerbanki, kartki kontrolne | – |
| Środowisko | staging w konfiguracji produkcyjnej (lub produkcja z turniejem testowym) | build `preview` z TestFlight / Play closed testing |

## 3. Scenariusz dnia (ok. 4 h)

| Czas | Krok | Przypadki |
|---|---|---|
| D−1 | Organizator konfiguruje turniej samodzielnie wg instrukcji (bez pomocy zespołu – obserwacja zdalna) | TC-UAT-001, TC-UAT-002 |
| 0:00 | Rozstawienie, parowanie tabletów, logowanie sędziów, szkolenie 10 min | TC-UAT-003, TC-UAT-004 |
| 0:30 | Kategoria 1 (8–10 startów) – przebieg normalny, sędziowie zapisują noty równolegle na kartkach kontrolnych | TC-UAT-005, TC-UAT-016 |
| 1:15 | Kategoria 2 – awaria Wi-Fi na 15 min, zgłoszenie „na ostatnią chwilę”, wycofanie | TC-UAT-006, TC-UAT-007 |
| 2:00 | Kategoria 3 – poprawa oceny, celowo wyłączony tablet, blokada z ostrzeżeniem, odrzucone oceny | TC-UAT-008, TC-UAT-009 |
| 2:45 | Ogłoszenie podium, PDF, zakończenie turnieju | TC-UAT-010, TC-UAT-011, TC-UAT-012 |
| 3:15 | Ankiety (organizator, sędziowie), obserwacje ergonomii, pomiar baterii | TC-UAT-013, TC-UAT-014 |
| 3:30 | Triage defektów i decyzja go/no-go dla pilotu | TC-UAT-015 |

## 4. Kryteria wejścia i wyjścia UAT

**Wejście:** wszystkie przypadki P1 z plików 01–06 zielone na buildzie UAT; brak otwartych S1/S2; urządzenia przygotowane i naładowane; turniej i konta przygotowane; ankiety gotowe.

**Wyjście (warunki go dla pilotu):**
- 0 utraconych i 0 zduplikowanych ocen (porównanie z kartkami kontrolnymi i bazą),
- wyniki zgodne z przeliczeniem ręcznym (TC-UAT-016),
- wynik kategorii dostępny ≤ 2 min po ostatnim występie,
- PDF wygenerowany i czytelny,
- mediana czasu wprowadzenia oceny ≤ 45 s, a ≥ 80% sędziów ocenia formularz jako „łatwy” lub „bardzo łatwy”,
- brak defektów S1/S2 (S3 z planem naprawy przed pilotem).

## 5. Ankiety i zbieranie uwag

Formularz krótki (5 min): czytelność w półmroku, szybkość, pewność, że ocena się zapisała, zrozumienie wskaźnika synchronizacji i odrzuceń, zrozumienie rankingu i remisów, propozycje. Obserwator notuje błędy użycia (np. tapnięcie przygaszonej kategorii, szukanie przycisku). Wyniki trafiają do PO jako wejście do decyzji Q-01…Q-03 i backlogu v1.1.

## 6. Przypadki (16)

| ID | Tytuł | Poziom | Prio | Warunki wstępne | Kroki | Oczekiwany wynik | Odwołania |
|---|---|---|---|---|---|---|---|
| <a id="tc-uat-001"></a>TC-UAT-001 | Przygotowanie konta i turnieju dzień przed | manual | P1 | Organizator pilotażowy, staging/produkcja pilotażowa, 6–10 kategorii z regulaminu | Organizator samodzielnie (instrukcja) zakłada konto, turniej, kategorie, kryteria i kary wg regulaminu, listy startowe. | Konfiguracja ≤ 2 h dla 60–120 startów; zgłoszone uwagi zapisane w formularzu UAT. | US-001, US-011, US-020, US-023, US-031 |
| <a id="tc-uat-002"></a>TC-UAT-002 | Sędziowie i PIN-y | manual | P1 | Lista sędziów pilotażu | Dodanie sędziów, przekazanie PIN-ów (kartki), reset jednego PIN-u. | Wszyscy sędziowie mają PIN-y; reset działa. | US-040, US-042 |
| <a id="tc-uat-003"></a>TC-UAT-003 | Parowanie tabletów na miejscu | manual | P1 | Tablety organizatora (≥ 3), Wi-Fi hali | Sparuj wszystkie tablety jednym kodem. | Parowanie ≤ 5 min dla wszystkich; lista urządzeń kompletna. | US-043, US-044 |
| <a id="tc-uat-004"></a>TC-UAT-004 | Logowanie sędziów i szkolenie 10 min | manual | P1 | Sędziowie pilotażowi | Krótkie szkolenie; każdy loguje się i ocenia 2 próbne występy w kategorii testowej. | Każdy sędzia ocenia występ ≤ 45 s bez pomocy; ankieta zrozumiałości. | US-051, US-057, US-059 |
| <a id="tc-uat-005"></a>TC-UAT-005 | Próbne ocenianie 3 kategorii | manual | P1 | Wolontariuszki odgrywające występy (60–90 s) | Pełne ocenianie 3 kategorii po 8–10 startów. | Zero utraconych ocen; organizator widzi postęp i ranking na żywo. | US-070, US-072, US-080 |
| <a id="tc-uat-006"></a>TC-UAT-006 | Symulowana awaria sieci | manual | P1 | Router sterowany przez zespół | Wyłącz Wi-Fi na 15 min w trakcie kategorii. | Sędziowie oceniają dalej; po przywróceniu wszystko się synchronizuje ≤ 1 min. | US-080, US-081, NFR-301 |
| <a id="tc-uat-007"></a>TC-UAT-007 | Zawodniczka zgłoszona w ostatniej chwili i wycofanie | manual | P2 | Kategoria Trwa | Dodaj zawodniczkę i wycofaj nieobecną. | Tablety aktualizują się; ranking poprawny. | US-031, US-032, US-082 |
| <a id="tc-uat-008"></a>TC-UAT-008 | Poprawa oceny przez sędziego | manual | P2 | Kategoria Trwa | Sędzia poprawia własną ocenę. | Zmiana w rankingu; historia widoczna u organizatora. | US-060, US-074 |
| <a id="tc-uat-009"></a>TC-UAT-009 | Zamknięcie kategorii z ostrzeżeniem | manual | P1 | Jeden tablet celowo offline | „Zakończ i zablokuj” → decyzja organizatora; ewentualne przyjęcie odrzuceń. | Organizator rozumie ostrzeżenie (ankieta); wynik ostateczny ≤ 2 min po ostatnim występie. | US-026, US-083 |
| <a id="tc-uat-010"></a>TC-UAT-010 | Ogłoszenie podium i PDF | manual | P1 | Kategoria zablokowana | Ogłoś podium z rankingu; wygeneruj PDF i wyślij e-mailem testowym. | PDF czytelny na wydruku i telefonie; dane zgodne z ogłoszeniem. | US-073, FR-706 |
| <a id="tc-uat-011"></a>TC-UAT-011 | Remis i wynik niekompletny | manual | P2 | Dane przygotowane tak, by wystąpił remis | Analiza rankingu przez sędziego eksperta. | Reguła remisu zrozumiała i akceptowana (Q-01); oznaczenia „wstępny” zrozumiałe. | US-071, Q-01 |
| <a id="tc-uat-012"></a>TC-UAT-012 | Zakończenie turnieju | manual | P1 | Wszystkie kategorie rozegrane lub nierozegrane | „Zakończ turniej”. | Turniej w Zakończone; tablety pokazują stan zakończenia. | US-015 |
| <a id="tc-uat-013"></a>TC-UAT-013 | Ergonomia w półmroku i hałasie | manual | P2 | Warunki sceniczne (przyciemnione światło) | Obserwacja sędziów i organizatora. | Brak problemów z czytelnością; uwagi zapisane. | NFR-201, NFR-209 |
| <a id="tc-uat-014"></a>TC-UAT-014 | Bateria tabletów w ciągu dnia | manual | P2 | Tablety naładowane, bez ładowarek przez 4 h | Pomiar baterii co godzinę. | Zużycie ≤ 12%/h; brak wyłączeń. | NFR-704 |
| <a id="tc-uat-015"></a>TC-UAT-015 | Ankieta i decyzja go/no-go | manual | P1 | Zebrane defekty i ankiety | Spotkanie triage z PO, organizatorem i sędzią ekspertem. | Kryteria wyjścia UAT (07-uat §4) spełnione albo plan poprawek przed pilotem. | US-070, US-080 |
| <a id="tc-uat-016"></a>TC-UAT-016 | Weryfikacja wyniku ręcznie | manual | P1 | Kartki kontrolne 1 kategorii (sędziowie zapisują noty także na papierze) | Porównaj wyniki PoleChamp z przeliczeniem ręcznym/arkuszem. | Zgodność 100% (różnice tylko z zaokrągleń opisanych w 07-reguly). | FR-612, US-064 |

