# Decyzje i zależności zewnętrzne

> Dokument: `05-project-management/06-decyzje-i-zaleznosci-zewnetrzne.md` · Project Manager (Agent 3) · Wersja 1.0 · 24.10.2026
> Podstawa: pytania Q-01…Q-14 ([99-przekazanie-dla-tech-leada §5](../01-architecture/99-przekazanie-dla-tech-leada.md#5-pytania-otwarte)), Q-15…Q-19 i statusy ([98-weryfikacja §8](../01-architecture/98-weryfikacja-tech-leada.md#8-kwestie-otwarte)), wpływ na zadania ([99-przekazanie-dla-pm §5, §7](../04-implementation-plans/99-przekazanie-dla-pm.md#5-zadania-zależne-od-decyzji-biznesowych)), daty zadań z [planu sprintów](03-plan-sprintow.md).
> Zasada: termin „najpóźniej do” to ostatni dzień roboczy przed startem pierwszego zadania, którego dotyczy decyzja. Do czasu decyzji obowiązuje **założenie domyślne** (plan jest na nim oparty). Decyzja po terminie = wniosek o zmianę (ZAL-20).

## 1. Najpilniejsze decyzje (do 27.11.2026)

| Termin | Decyzja / działanie | Kto | Dlaczego teraz |
|---|---|---|---|
| **28.10.2026** | Q-19 – budżet na urządzenia referencyjne (zakup w tygodniu 0) | PO / sponsor | spike'i IMP-600, 601, 603 startują 3.11 na Tab A8 i iPad 9 |
| **30.10.2026** | Umowy: prawnik (Q-10), projektant (0,6 etatu w SP-01), wnioski o konta Apple/Google/AWS, domena | PM | D-U-N-S i weryfikacja kont trwają tygodnie (RT-08); warsztat Q-08 10.11 |
| 6.11.2026 | Q-02 (obcięcie do 0), Q-05 (szablon Doubles) | PO | IMP-052 (6–9.11) |
| 10.11.2026 | Q-01 (kolejność remisów) | PO + sędzia ekspert | IMP-054 (10–13.11) |
| **13.11.2026** | **Q-08 – akceptacja ekranów poza designem** (warsztat 10.11) | projektant + PO | DoR 22 zadań MOB; pierwsze (IMP-213) startuje w SP-02 |
| 13.11.2026 | Q-19 – plan EAS i Sentry | PM | IMP-022 (16–17.11) |
| 27.11.2026 | Q-03 (wskaźnik „nieruszone”); list intencyjny organizatora pilotażowego (ZZ-10) | PO | IMP-309 (4–7.12); planowanie UAT i pilota |

## 2. Pytania otwarte Q-01…Q-19

| ID | Pytanie (skrót) | Właściciel decyzji | Założenie domyślne w planie | Zadania (sprint, plan) | **Decyzja najpóźniej do** | Wpływ zmiany decyzji | Skutek braku decyzji w terminie | Status |
|---|---|---|---|---|---|---|---|---|
| Q-01 | Kolejność remisów „Technika → mniej kar → ex aequo”; konfiguracja w MVP? | PO + sędzia ekspert | tak, bez konfiguracji | IMP-054 (SP-01, 10–13.11.2026) | **10.11.2026**; potwierdzenie na UAT (TC-UAT-011, 20.03.2027) | 4–6 h BE (komparator i testy) | 1.0 z regułą domyślną; zmiana po M5 → v1.1 | otwarte |
| Q-02 | Obcinanie wyniku sędziego do 0 | PO | tak (D-SC-03) | IMP-052 (SP-01, 6–9.11.2026) | **6.11.2026** | 2 h | j.w. | otwarte |
| Q-03 | Wartości domyślne formularza; wskaźnik „nieruszone” lub wymóg dotknięcia kryterium | PO + projektant | zostają, bez wskaźnika | IMP-309 (SP-03, 4–7.12.2026), IMP-313 (SP-06) | **27.11.2026** (koniec SP-02) | +8 h MOB, +2 h DESIGN (MOB – wąskie gardło) | wskaźnik trafia do v1.1 (BL-05) | otwarte |
| Q-04 | „Wznowienie” zakończonego turnieju | PO | nie w MVP | – (dotyczy IMP-123, SP-06, 19–20.01.2027) | **8.01.2027** (koniec SP-05) | +16 h BE + MOB; przesuwa M5 o ok. 1 tydz. | v1.1 (BL-06); ostrzeżenia TL-48 w SCR-ORG-04 zostają | otwarte |
| Q-05 | Szablon Doubles – „Synchronizacja” | PO | nie (jak Pole Sport) | IMP-052 (SP-01) | **6.11.2026** | 1 h | szablon domyślny | otwarte |
| Q-06 | „Zawodniczki” a kategorie męskie – teksty | PO + projektant | teksty z designu, klucze i18n gotowe | IMP-070 (SP-01); pierwsze ekrany IMP-255 (SP-05, od 28.12.2026) | **11.12.2026** (koniec SP-03) | ≤ 4 h | zmiana tekstów najpóźniej w IMP-651 (SP-09) | otwarte |
| Q-07 | Etykieta „Zakończona” czy „Zakończony” | projektant | jak w designie | IMP-070 (SP-01) | **11.12.2026** | ≤ 4 h (razem z Q-06) | j.w. | otwarte |
| **Q-08** | Akceptacja ekranów poza designem i odstępstw wizualnych (jasny PDF, jasne tło QR, skala odstępów, obrys pól; TL-23, 33, 47, 48) | projektant + PO | propozycje z dokumentacji | IMP-650 (SP-01, 2–10.11.2026), IMP-651 (SP-09); DoR 22 zadań MOB (od IMP-213, SP-02) | **13.11.2026** (warsztat 10.11) | bufor poprawek 12 h w IMP-651 | realizacja za flagą funkcji (decyzja PO), ryzyko przeróbek (R-10, RP-05) | **pilne** |
| Q-09 | Blokada zrzutów ekranu w trybie sędziego | PO (bezpieczeństwo) | nie | IMP-402 (SP-09, 3–4.03.2027) | **5.02.2027** (koniec SP-07) | +3 h MOB | bez blokady w 1.0; BL-09 | otwarte |
| **Q-10** | Umowa powierzenia, podstawy prawne, retencja 24 mies., zgody opiekunów, wyjątek RODO TL-17 | prawnik + PO | jak w [05-bezpieczenstwo §5](../01-architecture/05-bezpieczenstwo.md) | IMP-176 (SP-07, od 1.02.2027), IMP-179 (SP-07), IMP-406 (SP-07), IMP-553 (SP-10), IMP-555 (SP-11) | **22.01.2027** – opinia (retencja, podstawy, TL-17, zgody); **19.02.2027** – projekty dokumentów; **5.03.2027** – wersje ostateczne | zmiana okresu retencji – konfiguracja; inne zmiany – RP-06 | **blokuje wydanie 1.0** (IMP-553, IMP-555); pilot tylko z regulaminem pilotażowym | **pilne** |
| Q-11 | Model biznesowy (darmowy pilot, abonament, opłata per turniej) | PO + PM | brak płatności w MVP | IMP-551 (SP-10, wpisy w sklepach), regulamin (Q-10) | **22.01.2027** (razem z opinią prawną) | płatności w aplikacji = osobny projekt | 1.0 bezpłatna; regulamin bez opłat | otwarte |
| Q-12 | HIBP czy lista lokalna | TL | – | IMP-114 | – | – | – | **zamknięte (TL-41)** |
| Q-13 | AWS Frankfurt czy GCP Warszawa | TL + PM | – | IMP-007 | – | – | – | **zamknięte (TL-42)** |
| Q-14 | Sędzia główny i średnia obcięta – czy pilot ich wymaga | PO + organizator pilotażowy | v1.1 | – (BL-03) | **11.12.2026** (koniec SP-03, po analizie regulaminu zawodów pilota – ZZ-10) | +60–80 h BE + MOB; przy decyzji „tak” pilot przesuwa się o ok. 3 tygodnie albo wymaga wariantu C | v1.1; pilot na zasadach MVP | otwarte |
| Q-15 | Numer startowy osoby czy per start | PO + organizator pilotażowy | per start | IMP-128 (SP-06, 11–12.01.2027), IMP-266 (SP-07) | **8.01.2027** (koniec SP-05) | +12 h | per start w 1.0; BL-07 | otwarte |
| Q-16 | Usunięcie konta: natychmiast czy 30 dni z anulowaniem | PO + prawnik | natychmiastowa dezaktywacja, usunięcie po 30 dniach | IMP-118 (SP-06, 11–12.01.2027) | **8.01.2027** | +4 h | wariant domyślny; BL-08 | otwarte |
| Q-17 | Czy organizator przyjmuje oceny odrzucone z powodu dezaktywacji sędziego / nieaktualnego PIN-u (TL-13) | PO | tak, z audytem | IMP-149 (SP-07, 25–26.01.2027) | **22.01.2027** (koniec SP-06) | −2 h przy odmowie | wariant domyślny | otwarte |
| Q-18 | Termin v1.1 z pionowym układem tabletu | PO + PM | przed VI 2027 | BL-01 (projekt G-30 w SP-10…SP-11, realizacja za flagą SP-12…SP-15) | **5.02.2027** (koniec SP-07) | termin twardy: ok. 31.08.2027 (Google Play API 37) | plan PM: M9 28.05.2027, limit wewnętrzny 31.07.2027 (RT-07) | otwarte – PM rekomenduje 28.05.2027 |
| Q-19 | Budżet: urządzenia referencyjne / farma, pentest, plan EAS | PM + sponsor | 4 urządzenia referencyjne + 2 zapasowe tablety, pentest przed pilotem, EAS Production | IMP-600 (3.11.2026), IMP-022 (16.11), IMP-454 (14.12), IMP-408 (okno 15–24.03.2027), IMP-463 | urządzenia **28.10.2026**; EAS/Sentry **13.11.2026**; farma/Maestro Cloud **11.12.2026**; pentest **18.12.2026** | koszty – [08-budzet](08-budzet.md) | brak urządzeń = spike'i bez pomiarów (RT-09); brak pentestu = niespełnione kryterium wydania ([00-strategia §8](../03-test-plans/00-strategia-testowania.md#8-kryteria-wejścia-i-wyjścia)) | otwarte |

### 2.1 Rozstrzygnięcia

Wypełnia PM po każdej decyzji (wynik, data, kto, wpływ na plan, aktualizacja dokumentów).

| Q | Data | Decyzja | Decydujący | Zmiana planu / dokumentów |
|---|---|---|---|---|
| Q-12 | 23.10.2026 | HIBP (zakresy, padding) + lista 100 000 haseł jako zapas | TL | brak (TL-41) |
| Q-13 | 23.10.2026 | AWS eu-central-1 | TL | brak (TL-42, ADR-007) |

## 3. Zależności zewnętrzne

| ID | Od kogo / co | Właściciel po naszej stronie | Działanie i termin zamówienia | Potrzebne najpóźniej (zadanie) | Czas realizacji (szac.) | Plan B |
|---|---|---|---|---|---|---|
| ZZ-01 | Apple Developer Program – konto organizacji (numer D-U-N-S) | PM | wniosek o D-U-N-S i rejestracja: **26.10.2026** | 13.11.2026 – poświadczenia EAS (IMP-022, 16.11); 5.03.2027 – TestFlight (IMP-550, 8.03) | D-U-N-S: od kilku dni do kilku tygodni; rejestracja w Apple: kilka dni | buildy `preview` (dystrybucja wewnętrzna EAS) do czasu konta |
| ZZ-02 | Google Play Console – konto organizacji (weryfikacja tożsamości) | PM | **26.10.2026** | 5.03.2027 – rekord aplikacji (IMP-550); testy zamknięte dla UAT (IMP-552, 11.03) | kilka dni – kilka tygodni (weryfikacja) | APK z EAS (dystrybucja wewnętrzna) na UAT; konto osobiste wymaga 14 dni testów zamkniętych – **unikać** |
| ZZ-03 | AWS – konta (AWS Organizations: zarządzające, `dev`, `staging`, `production`), płatności, limity | DevOps + PM | **30.10.2026** | 4.11.2026 – IMP-007 | 1–2 dni | konto tymczasowe tylko dla `dev` |
| ZZ-04 | Domena `polechamp.app` i strefa DNS (Route 53) | PM | **30.10.2026** | 20.11.2026 – IMP-011 (certyfikaty), 2.12 – IMP-013 (SES), 28.01.2027 – IMP-179 | 1 dzień | subdomena tymczasowa dla `dev` |
| ZZ-05 | AWS SES – dostęp produkcyjny (wyjście z sandboxa) | DevOps | wniosek w IMP-013 (**2–3.12.2026**) | 5.03.2027 (e-maile na UAT i produkcji) | do 48 h, możliwe pytania dodatkowe | sandbox z listą zweryfikowanych adresów uczestników UAT |
| ZZ-06 | Firma pentestowa (API + aplikacje iOS/Android) | PM + TL | zapytanie ofertowe 23.11.2026, **zamówienie do 18.12.2026** | okno testów 15–24.03.2027 (IMP-408); retest do 31.03.2027 | rezerwacja terminu 6–12 tygodni | druga firma z listy; ZAP + Semgrep + ASVS/MASVS jako minimum (decyzja PO o ryzyku) |
| ZZ-07 | Urządzenia referencyjne (iPhone 12, Pixel 6a, iPad 9. gen., Galaxy Tab A8) + 2 tablety zapasowe, router sterowany, powerbanki | PM + QA | urządzenia referencyjne **26–30.10.2026**; zapasowe i router do 19.02.2027 | 3.11.2026 – IMP-600 | 1–5 dni (zakup) | wypożyczenie, farma urządzeń (RT-09) |
| ZZ-08 | Prawnik – regulamin, polityka prywatności, umowa powierzenia (z TOM), retencja, zgody opiekunów, wyjątek RODO TL-17, Q-16 | PO | umowa **30.10.2026**; materiały wstępne z dokumentacji w tygodniu 0; pakiet IMP-406 w SP-07 | opinia 22.01.2027; projekty 19.02.2027; wersje ostateczne 5.03.2027 (przed IMP-553 i UAT) | 6–10 tygodni | regulamin pilotażowy dla jednego organizatora (RT-10) |
| ZZ-09 | Projektant (0,6 etatu w SP-01, potem 0,2) | PO | umowa **30.10.2026** | warsztat Q-08 10.11.2026 (IMP-650); IMP-652 (16–26.11); IMP-653 (5–15.01); IMP-551 (8–17.03); projekt G-30 dla v1.1 (SP-10…SP-11) | – | projektant zastępczy z dostępem do design systemu Nocturne |
| ZZ-10 | Organizator pilotażowy – zgoda, regulamin zawodów (kryteria, kary, remisy), termin pilota, udział w UAT, tablety i sędziowie | PO | list intencyjny **do 27.11.2026**; regulamin zawodów do 11.12.2026 (Q-14); termin pilota potwierdzony do 8.01.2027 | UAT 20.03.2027; konfiguracja turnieju na produkcji do 16.04.2027; pilot 24.04.2027 | – | drugi organizator; termin zapasowy 15.05.2027 (RP-07) |
| ZZ-11 | Sędziowie (3–5, w tym sędzia ekspert) i wolontariuszki do próby generalnej | PO + organizator | potwierdzenie **do 19.02.2027** | 20.03.2027 (TC-UAT-001…016) | – | nagrania występów zamiast wolontariuszek ([07-uat §2](../03-test-plans/07-uat-proba-generalna.md#2-uczestnicy-i-zasoby)) |
| ZZ-12 | Usługi SaaS: EAS (plan), Sentry (Team, region UE), GitHub (Team), menedżer haseł zespołu | PM | **13.11.2026** | IMP-003 (19.11), IMP-022 (16.11), IMP-021 (SP-05, 7.01.2027) | 1 dzień | plany darmowe na start (limity buildów) |
| ZZ-13 | Farma urządzeń / Maestro Cloud lub runner macOS dla E2E iOS | QA + DevOps | decyzja **do 11.12.2026** | IMP-454 (14.12.2026) | 1–2 dni | E2E iOS ręcznie na iPad 9 do czasu farmy |
| ZZ-14 | Expo SDK 59 (wydarzenie zewnętrzne) | TL | obserwacja; decyzja **19.02.2027** (ZAL-16) | IMP-507 (SP-10, 8–10.03.2027) | – | łatki SDK 58 |
| ZZ-15 | Polityki sklepów: Google Play target API 37, wymagania Apple dot. SDK i prywatności | TL + PM | przegląd komunikatów co miesiąc | v1.1 (M9 28.05.2027); ZAL-17 | – | RT-07 |
| ZZ-16 | Have I Been Pwned – API Pwned Passwords (TL-41) | BE | – | IMP-114 (SP-05) | – | lista 100 000 haseł w obrazie API |

## 4. Rejestr zmian

| Data | Wersja | Zmiana | Autor |
|---|---|---|---|
| 24.10.2026 | 1.0 | Pierwsza wersja | PM |
