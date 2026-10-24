# Zakres MVP i kolejnych wersji

> Dokument: `02-specification/02-zakres-mvp.md` · Wersja 1.0 · 23.10.2026
> Podstawa: design v2 ([03-analiza-designu.md](../00-research/03-analiza-designu.md)) + research ([01-analiza-konkurencji.md §5–7](../00-research/01-analiza-konkurencji.md#5-mocne-strony-warte-przeniesienia-i-błędy-do-uniknięcia)). Wymagania: [03-wymagania-funkcjonalne.md](03-wymagania-funkcjonalne.md), historie: [04-user-stories.md](04-user-stories.md).

## 1. Cel MVP

Przeprowadzić **rzeczywisty turniej krajowy** (do 60 kategorii, 1 500 startów, 30 sędziów, 20 tabletów) od konfiguracji do PDF z wynikami, **bez papieru i bez arkusza kalkulacyjnego**, także przy przerwach w dostępie do internetu w hali.

**Kryterium sukcesu MVP:** pilotażowy turniej (np. 6–10 kategorii, 60–120 startów, 3–5 sędziów) przeprowadzony w całości w PoleChamp. Zero utraconych ocen, wyniki kategorii dostępne ≤ 2 min po ostatniej ocenie, PDF wysłany klubom w dniu zawodów.

## 2. Zakres wersji

Priorytety MoSCoW dotyczą MVP: **M** – Must, **S** – Should (w MVP, jeśli czas pozwoli, bez nich pilot jest możliwy), **C** – Could, **W** – Won't (świadomie poza MVP).

| Obszar | MVP (M) | MVP (S) | v1.1 | v2 |
|---|---|---|---|---|
| Konto organizatora | Rejestracja, weryfikacja e-mail, logowanie, reset hasła, wylogowanie, usunięcie konta (podniesione do M – TL-22, wymóg App Store 5.1.1(v)) | – | Sign in with Apple/Google, TOTP | Zespoły organizatorów |
| Turnieje | Lista Aktywne/Zakończone, tworzenie, szczegóły, statystyki, postęp, start, zakończenie | Edycja, usuwanie (DRAFT) | Duplikowanie turnieju | Szablony organizatora |
| Kategorie | Tworzenie z szablonu stylu, edycja, start, blokada/odblokowanie, statusy, postęp | Usuwanie (DRAFT), ostrzeżenie przed blokadą | Kolejność kategorii (drag), harmonogram | Rundy (eliminacje/finał) |
| Kryteria i kary | Dodawanie/edycja/usuwanie w DRAFT, skala, waga, opis, punkty, limit | Potwierdzenie usunięcia | Własne szablony | Kryteria „przez odejmowanie” (sekcje A/E/D) |
| Zawodniczki | Dodawanie (nr, imię i nazwisko, klub), lista startowa z liczbą ocen | Edycja, wycofanie, rok urodzenia + zgoda opiekuna, wyszukiwanie | Import CSV, zmiana kolejności, losowanie kolejności | Rejestracja online (integracja) |
| Sędziowie i urządzenia | Dodawanie sędziów z PIN-em, reset PIN-u, parowanie tabletów QR, lista urządzeń | Status urządzeń (bateria, kolejka) | Panele per kategoria, rola Sędzia główny | Konta sędziów ponad turniejami |
| Panel sędziego | Splash, wybór profilu, PIN, lista kategorii, kolejka, formularz oceny (suwaki, −/+, kary, komentarz), auto-przejście, aktualizacja oceny, tryb tylko-do-odczytu, nakładka „Obróć tablet” przy orientacji pionowej / zbyt wąskim oknie (TL-23) | Autozapis szkicu, wskaźnik „nieruszone” (Q-03) | Orientacja pionowa – **obowiązkowo przed sierpniem 2027** (Google Play wymaga wtedy target API 37, które nie pozwala blokować orientacji na tabletach – [ADR-013](../01-architecture/adr/ADR-013-orientacja-i-rozmiar-okna-tabletu.md)) | Tryb „sekretariat wpisuje z kartki” |
| Offline | Pełne ocenianie offline, outbox, synchronizacja, wskaźniki, odrzucenia przy blokadzie | Eksport niewysłanych ocen (JSON) | Organizator: kolejka zapisów offline | Lokalny serwer w sali |
| Wyniki | Ranking na żywo (średnia, remisy), oznaczenie niekompletnych | Szczegóły ocen per sędzia z komentarzami i historią | Średnia obcięta, kary sędziego głównego | Publiczne wyniki, infoscreen |
| Eksport | PDF turnieju i kategorii (podgląd + plik) z sumą kontrolną | CSV jako Could (FR-708), jeśli czas pozwoli | CSV (jeśli nie trafi do MVP) | Dyplomy, raport odchyleń sędziów |
| Audyt i prywatność | Audyt zmian i ocen, minimalizacja danych, retencja | Widok audytu w UI (lista) | Eksport danych osoby | Zgody na publikację wizerunku |
| Lokalizacja | PL | – | EN | inne |

## 3. Świadomie poza MVP (Won't) – z uzasadnieniem

| Funkcja | Dlaczego nie teraz | Źródło |
|---|---|---|
| Rejestracja zawodniczek i płatności | Rynek obsłużony (Competit, formularze). Duży zakres prawny i finansowy | [S25], [S27] |
| Katalog elementów (Code of Points IPSF/POSA) | Chronione prawem autorskim, złożone, zmienne co sezon | [S1], [S2] |
| Publiczne wyniki na żywo | Wymaga zgód na publikację (niepełnoletnie), nowego klienta web | RODO, [S34] |
| Sędzia główny i kary sędziego głównego | Nowa rola i przepływy. MVP odwzorowuje prototyp (kary per sędzia) | [S2], [S3] |
| Średnia obcięta | Design opisuje średnią; przy 3–5 sędziach obcięcie usuwa dużą część danych | [ADR-006](../01-architecture/adr/ADR-006-model-punktacji-i-agregacji.md) |
| Protesty / inquiries | Rzadkie na zawodach krajowych. Audyt i podgląd ocen wystarczą w MVP | [S2] |
| Wideo, muzyka, harmonogram godzinowy | Poza rdzeniem oceniania | – |
| Wersja EN | Pilot w Polsce. Teksty od początku w kluczach i18n | NFR-601 |

## 4. Założenia i zależności

1. Organizator zapewnia tablety (iPad / Android ≥ 10″) z zainstalowaną aplikacją i naładowane na cały dzień (zalecenie: powerbank/ładowarka przy stole).
2. Organizator ma telefon z dostępem do internetu (LTE) w dniu zawodów.
3. Sędziowie dostają PIN-y od organizatora przed zawodami (np. SMS/kartka – poza systemem).
4. Regulamin zawodów (kryteria, kary, remisy) jest przenoszony przez organizatora do konfiguracji kategorii. PoleChamp nie waliduje zgodności z regulaminami federacji.
5. Konta w App Store / Google Play, domena, konto AWS w UE – zapewnia zespół (PM).
