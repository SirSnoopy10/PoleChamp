# ADR-013: Orientacja i rozmiar okna na tabletach – układ poziomy z nakładką w MVP, układ pionowy obowiązkowo przed VIII 2027

- **Status:** Zaakceptowana (Tech Lead, 23.10.2026); tekst i wygląd nakładki do akceptacji projektanta (Q-08)
- **Data:** 2026-10-23
- **Powiązane:** [ADR-001](ADR-001-aplikacja-mobilna-react-native-expo.md), NFR-702, G-30, [06-ekrany-sedziego.md §0](../../02-specification/06-ekrany-sedziego.md#0-zasady-wspólne-dla-trybu-sędziego), [98-weryfikacja-tech-leada.md](../98-weryfikacja-tech-leada.md) (TL-23, TL-24)

## Kontekst
- Design panelu sędziego istnieje tylko w poziomie (1100×720), a dokumentacja zakładała blokadę orientacji.
- **Android 16** dla aplikacji z target API 36 ignoruje `screenOrientation`, `resizeableActivity` oraz `min/maxAspectRatio` na ekranach o najmniejszym wymiarze ≥ 600 dp (tablety). Opt-out `android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` działa tylko przy target API 36; dla API 37 nie będzie wyjątku. Google Play wymaga target API 36 od VIII 2026 i (wg zapowiedzi) API 37 od VIII 2027. Expo SDK 58 celuje w API 36.
- **iPadOS 26** wycofał `UIRequiresFullScreen` (TN3192) – okno aplikacji może zmieniać rozmiar; klucz będzie ignorowany w przyszłej wersji. Expo SDK 58 jest budowany z iOS 27 SDK.
- Tryb Organizatora (układ telefoniczny w pionie) na iPadzie i tablecie z Androidem również nie może polegać na blokadzie.

## Decyzja
1. **MVP – tryb Sędziego:** układ poziomy z designu. Na Androidzie ustawiamy opt-out `PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` (config plugin) i `screenOrientation=landscape`; na iOS wymagamy orientacji poziomych w `Info.plist` i używamy blokady orientacji sceny tam, gdzie system ją respektuje. Niezależnie od platformy aplikacja **reaguje na rzeczywisty rozmiar okna**: gdy szerokość < 1024 dp albo okno jest pionowe, pokazuje pełnoekranową nakładkę „Obróć tablet do pozycji poziomej.” (SCR-JDG §0). Stan (formularz, szkic, kolejka, sesja) jest zachowany; synchronizacja trwa w tle.
2. **MVP – tryb Organizatora na tablecie:** układ telefoniczny wyśrodkowany, maks. 480 dp szerokości, dowolna orientacja.
3. **v1.1 (najpóźniej przed VIII 2027):** pionowy układ panelu sędziego (G-30: kolejka jako wysuwana szuflada, formularz na pełnej szerokości) – warunek aktualizacji do target API 37. Zadanie dla PM w roadmapie v1.1.
4. Testy: TC-COMPAT dla obracania i zmiany rozmiaru okna (Android 16 tablet/emulator, iPad z iPadOS 26).

## Rozważane alternatywy
| Opcja | Werdykt | Powód |
|---|---|---|
| Polegać wyłącznie na blokadzie orientacji | Odrzucona | Przestaje działać na Androidzie 16+ i iPadOS 26+ |
| Pełny układ pionowy już w MVP | Odłożona do v1.1 | Brak designu; ok. 40–60 h pracy MOB + DESIGN; pilot na tabletach organizatora w poziomie jest możliwy z nakładką |
| Skalowanie układu poziomego do wąskiego okna | Odrzucona | Panel 300 dp + formularz < 724 dp łamie UI-05 (nachodzenie tekstów) |

## Konsekwencje
- ➕ Działanie zgodne z politykami platform na pilocie i w 1.0.
- ➖ Dodatkowy stan UI (nakładka) i testy obrotu/zmiany okna.
- ⚠ Twardy termin dla v1.1 (układ pionowy) wynikający z polityki Google Play – ryzyko RT-07 w [99-przekazanie-dla-pm.md](../../04-implementation-plans/99-przekazanie-dla-pm.md).
