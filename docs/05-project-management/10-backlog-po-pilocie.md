# Backlog po pilocie (v1.1 i v2)

> Dokument: `05-project-management/10-backlog-po-pilocie.md` · Project Manager (Agent 3) · Wersja 1.0 · 24.10.2026
> Podstawa: kolumny „v1.1” i „v2” z [02-zakres-mvp §2](../02-specification/02-zakres-mvp.md#2-zakres-wersji), pytania Q-xx z wpływem na zakres ([99-przekazanie-dla-pm §5](../04-implementation-plans/99-przekazanie-dla-pm.md#5-zadania-zależne-od-decyzji-biznesowych)), ryzyka R-06, R-11, RT-07, [ADR-013](../01-architecture/adr/ADR-013-orientacja-i-rozmiar-okna-tabletu.md).
> Wszystkie 250 zadań IMP należą do MVP i są w [planie sprintów](03-plan-sprintow.md); poniższe pozycje `BL-NN` **nie mają jeszcze kart IMP** – Tech Lead rozpisuje je na zadania po warsztacie priorytetów (29.04.2027), z wyjątkiem BL-01, który rozpisuje się w SP-10 (decyzja Q-18).

## 1. Zasady

- Pozycja backlogu: ID `BL-NN`, opis, źródło (FR/US/SCR/Q/R), szacunek (jeśli znany z dokumentacji – w przeciwnym razie „do oszacowania”), etap, priorytet MoSCoW dla v1.1.
- Uwagi z UAT i pilota dopisuje PM w ciągu 2 dni roboczych od wydarzenia ([09-plan-wydania §7](09-plan-wydania-i-pilotazu.md#7-zbieranie-informacji-zwrotnej--backlog-v11)).
- Kolejność zatwierdza PO; pozycje wymagane przez polityki platform (BL-01) mają pierwszeństwo.

## 2. Backlog v1.1

| ID | Pozycja | Źródło | Szacunek | Etap | Priorytet | Uwagi |
|---|---|---|---|---|---|---|
| BL-01 | Pionowy układ panelu sędziego (kolejka jako wysuwana szuflada, formularz na pełnej szerokości) i obsługa zmiany rozmiaru okna; build z target API 37 | ADR-013, G-30, NFR-702, Q-18, RT-07 | 40–60 h MOB + DESIGN (ADR-013) | 1 (M9: 28.05.2027) | **Must** | projekt G-30: SP-10…SP-11; realizacja za flagą SP-12…SP-13; wydanie SP-14…SP-15 |
| BL-02 | Poprawki defektów S1–S3 z próby generalnej i pilota | raport IMP-556 | rezerwa 40 h (do korekty po pilocie) | 1 | Must | S1/S2 również jako 1.0.x |
| BL-03 | Rola „Sędzia główny”, kary sędziego głównego, średnia obcięta | Q-14, ADR-006, 02-zakres-mvp §3 | 60–80 h BE + MOB (98-weryfikacja §8.1) | 2 | Should (jeśli federacje/organizatorzy wymagają) | decyzja Q-14 po pilocie |
| BL-04 | Panele sędziowskie per kategoria | 02-zakres-mvp §2 (Sędziowie i urządzenia) | do oszacowania | 2 | Should | powiązane z BL-03 |
| BL-05 | Wskaźnik „nieruszone” / wymóg dotknięcia kryterium w formularzu | Q-03 | 8 h MOB + 2 h DESIGN | 2 | Could | decyzja na podstawie UAT (TC-UAT-004) |
| BL-06 | Wznowienie zakończonego turnieju (np. po proteście) | Q-04 | 16 h BE + MOB | 2 | Could | – |
| BL-07 | Numer startowy osoby (jedna zawodniczka – jeden numer w turnieju) | Q-15, TL-54 | 12 h | 2 | Could | wybór istniejącej zawodniczki w SCR-ORG-11 |
| BL-08 | Anulowanie usunięcia konta w okresie 30 dni | Q-16 | 4 h | 2 | Could | po opinii prawnika |
| BL-09 | Blokada zrzutów ekranu w trybie sędziego | Q-09 | 3 h | 2 | Could | – |
| BL-10 | Szyfrowanie bazy SQLite na tablecie (SQLCipher / `op-sqlite`) | R-06, MASVS-STORAGE-1 L2 | do oszacowania (spike ok. 8 h) | 2 | Should | po pentestach i opinii prawnika |
| BL-11 | Sign in with Apple / Google, TOTP | 02-zakres-mvp §2 (Konto) | do oszacowania | 2 | Should | Sign in with Apple wymagany przy logowaniu społecznościowym (R-12) |
| BL-12 | Duplikowanie turnieju | 02-zakres-mvp §2 (Turnieje) | do oszacowania | 2 | Should | – |
| BL-13 | Kolejność kategorii (przeciąganie), harmonogram | 02-zakres-mvp §2 (Kategorie) | do oszacowania | 2 | Could | – |
| BL-14 | Własne szablony kryteriów | 02-zakres-mvp §2 (Kryteria i kary) | do oszacowania | 2 | Could | – |
| BL-15 | Import CSV zawodniczek, zmiana i losowanie kolejności startów | FR-407, 02-zakres-mvp §2 (Zawodniczki) | do oszacowania | 2 | Should | FR-407 poza MVP z założenia |
| BL-16 | Kolejka zapisów offline organizatora | 02-zakres-mvp §2 (Offline) | do oszacowania | 2 | Could | – |
| BL-17 | Eksport danych osoby (RODO) w aplikacji | 02-zakres-mvp §2 (Audyt i prywatność) | do oszacowania | 2 | Should | w MVP dostępny przez CLI operatora (IMP-178, TL-38) |
| BL-18 | Wersja angielska (EN) | 02-zakres-mvp §2 (Lokalizacja), NFR-601 | do oszacowania (klucze i18n gotowe) | 2 | Could | – |
| BL-19 | Migracja na Drizzle 1.0 (po wydaniu stabilnym) | TL-50, ADR-002 | do oszacowania | 2 | Should | dług techniczny |
| BL-20 | Aktualizacja Expo SDK między sezonami | R-11, NFR-905 | ok. 12 h (jak IMP-507) | 2 | Should | poza oknami zawodów |
| BL-21 | Eksport CSV wyników – jeśli IMP-174 (Could) zostanie odłożony | FR-708, RP-03 | 4 h | 2 | Could | warunkowo |

## 3. Backlog v2

| ID | Pozycja | Źródło |
|---|---|---|
| BL-30 | Publiczne wyniki na żywo, infoscreen (SCR-PUB-01, FR-709) – wymaga zgód na publikację | 02-zakres-mvp §2–§3 |
| BL-31 | Rundy (eliminacje / finał) | 02-zakres-mvp §2 (Kategorie) |
| BL-32 | Zespoły organizatorów, szablony organizatora | 02-zakres-mvp §2 (Konto, Turnieje) |
| BL-33 | Konta sędziów ponad turniejami | 02-zakres-mvp §2 (Sędziowie) |
| BL-34 | Kryteria „przez odejmowanie” (sekcje A/E/D) | 02-zakres-mvp §2 (Kryteria) |
| BL-35 | Tryb „sekretariat wpisuje z kartki” | 02-zakres-mvp §2 (Panel sędziego) |
| BL-36 | Lokalny serwer w sali | 02-zakres-mvp §2 (Offline) |
| BL-37 | Dyplomy, raport odchyleń sędziów | 02-zakres-mvp §2 (Eksport) |
| BL-38 | Rejestracja online (integracja z systemami zapisów) | 02-zakres-mvp §2 (Zawodniczki) |
| BL-39 | Zgody na publikację wizerunku | 02-zakres-mvp §2 (Audyt i prywatność) |

## 4. Plan v1.1 – etap 1 (SP-14…SP-15)

| Sprint | Daty | Cel | Pozycje |
|---|---|---|---|
| SP-14 | 3.05–14.05.2027 (3.05 – święto) | włączenie układu pionowego (flaga), poprawki z pilota, regres E2E na urządzeniach referencyjnych | BL-01, BL-02 |
| SP-15 | 17.05–28.05.2027 (27.05 – Boże Ciało) | zgłoszenie v1.1 do sklepów (21.05), przegląd, publikacja (M9 – 28.05.2027) | BL-01, BL-02 |

Pojemność SP-14…SP-15 (wariant bazowy, przy alokacji z [08-budzet §7](08-budzet.md#7-koszty-po-pilocie-poza-budżetem-mvp)): MOB 2 × 9 dni × 6 h ≈ 108 h na sprint – wystarcza na BL-01 (40–60 h z buforem) i rezerwę BL-02.

## 5. Rejestr zmian

| Data | Wersja | Zmiana | Autor |
|---|---|---|---|
| 24.10.2026 | 1.0 | Pierwsza wersja | PM |
