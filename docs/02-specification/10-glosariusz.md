# Glosariusz

> Dokument: `02-specification/10-glosariusz.md` · Wersja 1.0 · 23.10.2026
> Kolumna „Encja / termin techniczny” wiąże pojęcie z modelem danych ([02-model-danych.md](../01-architecture/02-model-danych.md)) i kodem.

| Pojęcie (PL) | Encja / termin techniczny | Definicja |
|---|---|---|
| **Turniej** | `tournament` | Wydarzenie (zawody) z datą, miejscem i zestawem kategorii. Statusy: W przygotowaniu (`DRAFT`), Trwa (`IN_PROGRESS`), Zakończona (`FINISHED`). |
| **Kategoria** | `category` | Konkurencja w turnieju z własnym stylem, poziomem, grupą wiekową, kryteriami, karami i listą startową, np. „Pole Sport Advanced”. Statusy: W przygotowaniu, Trwa, Zakończona (= zablokowana, `LOCKED`). |
| **Styl** | `category_style` | Dyscyplina: Pole Sport (technika, siła), Pole Art (artyzm, taniec), Exotic (taniec w butach na obcasie, praca na podłodze), Doubles (duety). |
| **Poziom** | `category_level` | Stopień zaawansowania: Beginner, Intermediate, Advanced, Pro, Elite. |
| **Grupa wiekowa** | `category.age_group` | Opis wieku uczestniczek, np. „Senior 18+”, „Junior 12–15”, „Masters 40+”, „Open”. |
| **Kryterium (oceny)** | `criterion` | Aspekt występu oceniany przez sędziego w skali 0–max z krokiem 0,5, np. „Technika”. Ma wagę i opcjonalny opis dla sędziów. |
| **Skala** | `criterion.scale_max` | Maksymalna nota w kryterium („Skala 0–10”). |
| **Waga** | `criterion.weight_tenths` | Mnożnik kryterium w sumie sędziego („×2”). |
| **Kryterium rozstrzygające** | `category.tie_break_criterion_id` | Kryterium decydujące o kolejności przy równym wyniku; domyślnie pierwsze (Technika). |
| **Kara (punktowa)** | `penalty_type` | Odjęcie punktów za zdarzenie (np. „Upadek”), z wartością „za 1 raz” i limitem „maks. wystąpień”. |
| **Kara sędziego głównego** | – (v1.1) | Kara nakładana raz na występ przez sędziego głównego (np. spóźnienie na scenę). Poza MVP. |
| **Zawodniczka** | `athlete` | Osoba startująca w turnieju (dane: imię i nazwisko, klub, opcjonalnie rok urodzenia). Termin z designu – obejmuje także zawodników (Q-06). |
| **Start / pozycja listy startowej** | `entry` | Udział zawodniczki w konkretnej kategorii z numerem startowym i kolejnością. |
| **Lista startowa** | `entry[]` kategorii | Uporządkowana lista startów kategorii – kolejność występów i kolejka sędziego. |
| **Numer startowy** | `entry.start_number` | Unikalny w turnieju numer zawodniczki („#47”). |
| **Występ** | – (zdarzenie) | Prezentacja zawodniczki na scenie w danej kategorii, oceniana przez panel. W modelu = `entry`. |
| **Wycofana** | `entry.status = WITHDRAWN` | Start wyłączony z rankingu i kolejki (np. nieobecność); oceny zachowane. |
| **Sędzia** | `judge` | Osoba oceniająca występy, przypisana do turnieju, logująca się PIN-em na sparowanym tablecie. |
| **Sędzia główny** | – (v1.1) | Sędzia nadzorujący panel, nakładający kary sędziego głównego, zatwierdzający blokadę. |
| **Panel sędziowski** | `category_judge` | Zbiór sędziów oceniających daną kategorię (MVP: wszyscy aktywni sędziowie turnieju). Liczebność = J. |
| **PIN** | `judge.pin_hash` | 4-cyfrowy kod sędziego w obrębie turnieju, generowany przez system. |
| **Urządzenie / tablet sędziowski** | `device` | Tablet sparowany z turniejem, na którym logują się sędziowie. |
| **Parowanie** | `pairing_code` | Przypisanie tabletu do turnieju kodem QR / 8-znakowym kodem wygenerowanym przez organizatora. |
| **Sesja sędziego** | `judge_session` | Okres zalogowania sędziego na urządzeniu (online lub offline). |
| **Ocena / arkusz oceny** | `score_sheet` | Komplet not jednego sędziego dla jednego startu: noty kryteriów, liczniki kar, komentarz. Jeden arkusz na parę (start, sędzia). |
| **Nota** | `score_value` | Wartość przyznana w jednym kryterium (np. 8,5). |
| **Wynik sędziego („Twój wynik”)** | `score_sheet.total_hundredths` | Σ(nota × waga) − Σ(kary), nie mniej niż 0. |
| **Wynik (oficjalny)** | `category_result.official_hundredths` | Średnia wyników sędziów, którzy ocenili start, zaokrąglona do 0,01. |
| **Maksymalny wynik sędziego** | wyliczany | Σ(skala × waga) – np. 65 pkt. |
| **Ranking (na żywo)** | `category_result` | Uporządkowana lista startów kategorii wg wyniku i reguł remisu, aktualizowana po każdej przyjętej ocenie. |
| **Remis / ex aequo** | – | Równy wynik oficjalny. Rozstrzygany kryterium rozstrzygającym, potem karami; nierozstrzygnięty = ex aequo (wspólne miejsce). |
| **Wynik niekompletny / wstępny** | `category_result.is_complete = false` | Wynik z ocen części panelu (n < J). |
| **Postęp oceniania** | wyliczany | Liczba złożonych arkuszy względem oczekiwanych (starty × sędziowie panelu). |
| **Rewizja oceny** | `score_sheet_revision` | Kolejna wersja arkusza po aktualizacji przez sędziego; historia w audycie. |
| **Rozpoczęcie kategorii** | `POST …/start` | Przejście W przygotowaniu → Trwa; zamraża konfigurację punktacji i ustala panel. |
| **Zakończenie i zablokowanie kategorii** | `POST …/lock` | Przejście Trwa → Zakończona; wyniki stają się ostateczne, sędziowie mają tylko podgląd. |
| **Odblokowanie** | `POST …/unlock` | Powrót Zakończona → Trwa (np. korekta), możliwy dopóki turniej trwa. |
| **Wyniki ostateczne** | `category.final_results_hash` | Ranking w chwili blokady z sumą kontrolną SHA-256. |
| **Odrzucone zgłoszenie (oceny)** | `rejected_submission` | Ocena z tabletu, która dotarła, gdy nie mogła być przyjęta (np. kategoria zablokowana, sędzia zdezaktywowany, nieaktualny PIN); czeka na decyzję organizatora. |
| **Kategoria nierozegrana** | stan pochodny: `category.status = DRAFT` w turnieju `FINISHED` | Kategoria, która nie wystartowała przed zakończeniem turnieju; pigułka „Nierozegrana”, pomijana w PDF turnieju z notą „Nie rozegrano: …”. |
| **Weryfikator PIN offline** | `judge.pin_offline_verifier`, `local_judge.wrapped_verifier` | Wynik PBKDF2 z PIN-u liczony raz przy jego wygenerowaniu; na tablecie przechowywany wyłącznie w postaci zaszyfrowanej kluczem z peppera urządzenia (TL-04). |
| **Tryb offline** | – | Praca tabletu bez połączenia z serwerem na danych lokalnych. |
| **Kolejka wysyłki (outbox)** | `outbox` (SQLite) | Trwała lista mutacji czekających na wysłanie do serwera. |
| **Mutacja** | `mutationId` | Pojedyncza komenda z tabletu (np. `SUBMIT_SCORE_SHEET`) z unikalnym identyfikatorem (idempotencja). |
| **Migawka (snapshot)** | `GET /sync/snapshot` | Pełny zestaw danych turnieju potrzebny tabletowi do pracy offline. |
| **Kursor synchronizacji** | `change_log.seq` | Numer ostatniej znanej zmiany; pozwala pobierać tylko różnice. |
| **Synchronizacja** | `SyncEngine` | Wysyłanie kolejki (push) i pobieranie zmian (pull) między tabletem a serwerem. |
| **Dziennik audytu** | `audit_log` | Niezmienialny zapis wszystkich zmian stanu i ocen. |
| **Organizator** | `app_user` (rola `org`) | Właściciel turnieju zarządzający nim z telefonu. |
| **Splash / ekran startowy** | SCR-ORG-00, SCR-JDG-00 | Ekran powitalny z animacją tancerki i komunikatami ładowania. |
| **Bottom sheet (arkusz)** | komponent UI | Panel wysuwany od dołu ekranu z formularzem lub potwierdzeniem. |
| **Toast** | komponent UI | Krótki komunikat u dołu ekranu (2,2 s) potwierdzający akcję. |
| **Pigułka statusu** | `StatusPill` | Zaokrąglona etykieta z kropką pokazująca status (np. „Trwa”). |
| **Nocturne** | design system | Ciemny system wizualny PoleChamp (tokeny, komponenty, zasady). |
| **Code of Points (CoP)** | – | Regulamin punktacji federacji (IPSF, POSA) z katalogiem elementów; PoleChamp go nie odwzorowuje. |
| **IPSF / POSA** | – | Międzynarodowe federacje pole sport (International Pole Sports Federation; Pole Sport & Arts World Federation). |
| **RODO** | – | Rozporządzenie (UE) 2016/679 o ochronie danych osobowych (GDPR). |
| **Umowa powierzenia** | – | Umowa (art. 28 RODO) między organizatorem (administratorem) a operatorem PoleChamp (podmiotem przetwarzającym). |
| **Pseudonimizacja** | `athlete.pseudonymized_at` | Zastąpienie danych osobowych etykietą („Zawodniczka nr 47”) przy zachowaniu wyników. |
