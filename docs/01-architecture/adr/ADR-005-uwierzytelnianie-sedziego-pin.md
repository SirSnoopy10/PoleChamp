# ADR-005: Uwierzytelnianie sędziów – parowanie urządzenia + 4-cyfrowy PIN (z weryfikacją offline)

- **Status:** Zaakceptowana ze zmianą schematu weryfikatora offline przez Tech Leada 23.10.2026 (sekcja „Status: zmieniony”); reguły biznesowe do potwierdzenia przez PO
- **Data:** 2026-10-23
- **Powiązane:** [05-bezpieczenstwo.md §3](../05-bezpieczenstwo.md#3-model-pin-sędziego), [04-przeplywy-danych.md §2–3](../04-przeplywy-danych.md#2-parowanie-tabletu-z-turniejem), SCR-JDG-01/02/06, SCR-ORG-14/15/16

## Kontekst
- Design przewiduje logowanie sędziego przez **wybór profilu** i **4-cyfrowy PIN** z automatycznym zatwierdzeniem po 4. cyfrze. Splash zakłada, że tablet „łączy się z turniejem” – tablet musi więc wiedzieć, do którego turnieju należy.
- Sędziowie zmieniają się przy tabletach. Logowanie ma trwać sekundy, bez e-maili i haseł.
- Sieć bywa niedostępna – logowanie musi działać także offline.
- Sam PIN (10 000 kombinacji) jest za słaby, żeby wystawić go na internet bez dodatkowego czynnika.

## Decyzja
1. **Parowanie tabletu z turniejem** przez organizatora: kod QR / 8-znakowy kod (10 min, do 10 użyć). Tablet dostaje `deviceId` i sekret urządzenia (256 bit, w Keychain/Keystore) oraz pepper do weryfikatorów offline.
2. **PIN per sędzia per turniej**, generowany losowo przez serwer (bez wzorców trywialnych, unikalny w turnieju), pokazany organizatorowi jednorazowo.
3. **Weryfikacja online** (`POST /judge-sessions`, wymaga tokenu urządzenia, Argon2id na serwerze), a przy braku sieci **weryfikacja offline** lokalnym weryfikatorem PBKDF2 (salt + pepper urządzenia, 600 000 iteracji) – tylko jeśli migawka jest młodsza niż 24 h i turniej na to pozwala.
4. **Limity prób:** lokalne (5 → 30 s, eskalacja ×2 do 15 min), globalne (10 → blokada do resetu przez organizatora), per urządzenie (30 / 10 min).
5. **Sesja sędziego**: JWT 12 h, jedna aktywna sesja sędziego naraz, ponowny PIN po 15 min w tle lub 2 h bezczynności.
6. Każda ocena niesie `authMode` (`ONLINE_PIN` / `OFFLINE_PIN`) do audytu.

## Rozważane alternatywy
| Opcja | Za | Przeciw | Werdykt |
|---|---|---|---|
| Konta sędziów (e-mail + hasło / magic link) | Silne uwierzytelnienie, tożsamość ponad turniejami | Za wolne przy stole, wymaga sieci i skrzynki e-mail, niezgodne z designem | Odrzucona dla MVP (konto sędziego jako opcja v2) |
| Sam PIN bez parowania (API publiczne) | Najprostsze | 10 000 kombinacji dostępnych z dowolnego urządzenia w internecie – nieakceptowalne | Odrzucona |
| PIN 6-cyfrowy | Większa entropia | Niezgodne z designem („Wpisz 4-cyfrowy PIN”), wolniejsze | Odrzucona (możliwa konfiguracja v2) |
| Tylko online (bez weryfikacji offline) | Brak weryfikatora na urządzeniu | Sędzia nie zaloguje się po restarcie tabletu bez sieci | Odrzucona – offline z ograniczeniami |
| Biometria urządzenia | Wygodne | Tablet jest współdzielony przez wielu sędziów | Odrzucona |

## Konsekwencje
- ➕ Zgodność z designem (PIN, wybór profilu) i szybkość.
- ➕ PIN-ów nie da się zgadywać z zewnątrz bez sparowanego urządzenia.
- ➖ Weryfikator PIN na urządzeniu jest podatny na atak przy przejęciu urządzenia z rootem (ryzyko opisane i zaakceptowane, mitygacje w [05-bezpieczenstwo.md §3.3](../05-bezpieczenstwo.md#33-weryfikacja-offline)).
- ➖ Dodatkowe ekrany poza designem: parowanie (SCR-JDG-06, SCR-ORG-16) i zarządzanie sędziami (SCR-ORG-14/15).
- ⚠ Do zweryfikowania: wydajność PBKDF2 600k na najsłabszym tablecie referencyjnym (cel ≤ 1 s, natywnie przez `react-native-quick-crypto`). Gdyby cel nie był osiągalny, zejście do 210 000 iteracji wymaga zgody Architekta.

## Status: zmieniony – weryfikacja Tech Leada (23.10.2026)

**Problem (TL-04):** decyzja 3 zakładała, że serwer liczy weryfikator `PBKDF2(PIN, salt ‖ pepper_urządzenia)` przy wydawaniu migawki każdemu urządzeniu. Serwer przechowuje jednak tylko `pin_hash` (Argon2id) i nie zna PIN-u po jego wygenerowaniu, więc dla tabletu sparowanego po dodaniu sędziego nie dałoby się policzyć weryfikatora. Dodatkowo liczenie 600 000 iteracji × 30 sędziów × 20 tabletów przy każdej migawce kosztowałoby minuty CPU.

**Nowa decyzja 3:**
1. Przy wygenerowaniu PIN-u (dodanie sędziego, reset) serwer liczy **raz** `pin_offline_verifier = PBKDF2-HMAC-SHA256(PIN, pin_offline_salt, 600 000)` i zapisuje go obok `pin_hash`.
2. Przy parowaniu urządzenie dostaje losowy `pinPepper` (32 B) – SecureStore/Keystore.
3. Migawka i `sync/changes` zawierają `wrapped = AES-256-GCM(K_dev, pin_offline_verifier, aad = judgeId ‖ pinVersion)`, `K_dev = HKDF-SHA256(pinPepper, "pc-pin-v1")`.
4. Tablet przy logowaniu offline odszyfrowuje weryfikator i porównuje go stałoczasowo z `PBKDF2(wpisany PIN, salt, 600 000)` liczonym natywnie.
5. Unikalność PIN-u w turnieju sprawdzana przez `pin_fingerprint = HMAC-SHA256(klucz serwera, tournamentId ‖ PIN)` (TL-06) zamiast 30 weryfikacji Argon2id.

**Konsekwencje:** właściwość „atak offline wymaga bazy tabletu i peppera z Keystore” bez zmian; wyciek bazy serwera ujawnia dodatkowo weryfikator, ale 4-cyfrowy PIN jest i tak odtwarzalny z `pin_hash` w kilka minut – ochroną PIN-u po stronie serwera są limity prób i ochrona bazy (bez zmian względem pierwotnej oceny ryzyka R-05). Koszt serwera: jedno PBKDF2 na wygenerowany PIN. Benchmark PBKDF2 na tabletach (NFR-110) pozostaje w spike'u IMP-601; szacunek: natywnie 0,1–0,5 s na Galaxy Tab A8, czyli w budżecie 1 s.

**Okno 24 h:** liczone z licznika monotonicznego urządzenia, gdy nie było restartu systemu (TL-21 – [05-bezpieczenstwo.md §3.3](../05-bezpieczenstwo.md#33-weryfikacja-offline)).
