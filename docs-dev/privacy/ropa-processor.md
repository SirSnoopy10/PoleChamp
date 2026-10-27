# Rejestr kategorii czynności przetwarzania (art. 30 ust. 2 RODO) – szkic techniczny

> IMP-406 · PROJEKT do weryfikacji przez prawnika (Q-10). Prowadzi: operator PoleChamp jako podmiot przetwarzający.

| Pole art. 30 ust. 2 | Wpis |
|---|---|
| a) Podmiot przetwarzający i inspektor | Operator PoleChamp – **[nazwa, adres, kontakt – do uzupełnienia]**; IOD: **[jeśli wyznaczony]** |
| a) Administratorzy | Organizatorzy zawodów z kontem w PoleChamp (lista kont w `app_user` – eksport przez CLI operatora) |
| b) Kategorie przetwarzań | 1. Przechowywanie listy startowej (zawodniczki: imię i nazwisko, klub, rok urodzenia, niepełnoletność, zgoda opiekuna). 2. Zbieranie ocen sędziów (noty, kary, komentarze) i liczenie wyników. 3. Uwierzytelnianie sędziów (PIN – skróty). 4. Generowanie eksportów PDF/CSV. 5. Audyt zmian. 6. Pseudonimizacja i usuwanie danych po okresie retencji |
| c) Przekazania do państw trzecich | Brak – wszystkie zasoby w EOG (`subprocessors.md`) |
| d) Środki bezpieczeństwa (art. 32) | `tom.md` |

## Pytania otwarte do prawnika (Q-10)

1. Czy umowa powierzenia jako część regulaminu (akceptacja `terms_version` przy rejestracji) jest wystarczająca?
2. Okres pseudonimizacji 24 miesiące po turnieju – czy właściwy dla wyników sportowych (archiwum klasyfikacji)?
3. Podstawa publikacji wyników z nazwiskami niepełnoletnich (art. 6 ust. 1 lit. f vs zgoda opiekuna).
4. Czy dane kont organizatorów (PoleChamp jako administrator) wymagają osobnego rejestru art. 30 ust. 1.
5. Termin powiadomienia administratora o naruszeniu (proponowane: bez zbędnej zwłoki, cel ≤ 24 h).
6. Zakres uprzedniej zgody na dalszych podprzetwarzających (ogólna z prawem sprzeciwu?).
