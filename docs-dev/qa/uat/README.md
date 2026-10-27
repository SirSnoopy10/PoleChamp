# Pakiet UAT i próby generalnej (IMP-464)

Podstawa: [07-uat-proba-generalna](../../../docs/03-test-plans/07-uat-proba-generalna.md). Do uzgodnienia z PM i organizatorem pilotażowym: **termin, miejsce, uczestnicy** (organizator, 3–5 sędziów w tym ekspert, 6–10 wolontariuszek), środowisko (staging vs produkcja z turniejem testowym).

| Plik | Zawartość |
|---|---|
| `instrukcja-organizatora.md` | 1 strona: konto, turniej, kategorie, sędziowie i PIN-y, parowanie, start, blokada, PDF |
| `instrukcja-sedziego.md` | 1 strona: profil, PIN, ocenianie, co robić bez sieci, wylogowanie |
| `karta-kontrolna.md` | papierowa karta not do porównania z systemem (TC-UAT-016) |
| `ankieta.md` | ankiety po próbie (organizator, sędziowie) |
| `triage.md` | tablica defektów S1–S4 i decyzja go/no-go (TC-UAT-015) |

## Harmonogram (ok. 4 h)

| Czas | Krok | TC |
|---|---|---|
| D−1 | organizator konfiguruje turniej sam wg instrukcji (obserwacja zdalna) | TC-UAT-001, 002 |
| 0:00 | rozstawienie, parowanie tabletów, logowanie, szkolenie 10 min | TC-UAT-003, 004 |
| 0:30 | kategoria 1 – przebieg normalny, równoległe karty kontrolne | TC-UAT-005, 016 |
| 1:15 | kategoria 2 – Wi-Fi wyłączone na 15 min (router), zgłoszenie w ostatniej chwili, wycofanie | TC-UAT-006, 007 |
| 2:00 | kategoria 3 – poprawa oceny, wyłączony tablet, blokada z ostrzeżeniem, odrzucone oceny | TC-UAT-008, 009 |
| 2:45 | podium, PDF, zakończenie turnieju | TC-UAT-010…012 |
| 3:15 | ankiety, ergonomia, bateria | TC-UAT-013, 014 |
| 3:30 | triage, go/no-go | TC-UAT-015 |

## Dane

Turniej przygotowuje sam organizator (D−1). Do zestawu awaryjnego i szkolenia: `POST /__e2e/seed/FX-SEED` na staging (fikcyjne zawodniczki prototypu, PIN-y testowe 8306, 4719, 2958, 6143, 7390).

## Sprzęt (lista kontrolna)

- [ ] 5 tabletów (≥ 1 iPad, ≥ 1 Android) z buildem `preview` (TestFlight / Play closed testing), naładowane, blokada ekranu ≥ 10 min
- [ ] telefon organizatora z aplikacją
- [ ] router Wi-Fi sterowany przez zespół (wyłączanie sieci wg harmonogramu), zapasowy hotspot LTE
- [ ] powerbanki i ładowarki, przedłużacze
- [ ] wydrukowane karty kontrolne (po 1 na sędziego i kategorię) i instrukcje
- [ ] dostęp zespołu do dashboardu i logów staging (dyżur BE), dziennik synchronizacji tabletów (5 tapnięć – IMP-359)

## Kryteria wyjścia (go dla pilotu)

0 utraconych i 0 zduplikowanych ocen (karty vs baza – `node tools/e2e/src/uat-verify.ts`), wyniki zgodne z przeliczeniem ręcznym, wynik ≤ 2 min po ostatnim występie, PDF czytelny, mediana oceny ≤ 45 s i ≥ 80% sędziów „łatwy/bardzo łatwy”, brak S1/S2.
