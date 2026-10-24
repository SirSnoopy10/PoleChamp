# ADR-009: Eksport PDF generowany po stronie serwera, z wersją i sumą kontrolną wyników

- **Status:** Zaakceptowana ze zmianą kolorystyki przez Tech Leada 23.10.2026 (sekcja „Status: zmieniony”)
- **Data:** 2026-10-23
- **Powiązane:** SCR-ORG-12, FR-705, FR-706, [04-przeplywy-danych.md §9](../04-przeplywy-danych.md#9-eksport-pdf)

## Kontekst
- Design: „Podgląd PDF” w bottom sheecie (cały turniej albo kategoria) i przycisk „Pobierz PDF”. W prototypie toast „PDF zapisany (demo)”.
- PDF z wynikami to dokument quasi-oficjalny (wywieszany, wysyłany klubom). Musi być identyczny niezależnie od telefonu i dać się zweryfikować.

## Decyzja
- **Podgląd** w aplikacji renderowany natywnie z danych `GET …/results` (zgodnie z designem SCR-ORG-12).
- **Plik PDF** generuje worker (BullMQ) biblioteką **pdfmake** z osadzoną czcionką **Inter** (polskie znaki). Układ: logo PoleChamp (trophy), nazwa turnieju, data · miejsce, dla każdej kategorii nazwa · status i tabela „#, Zawodniczka (+ klub), Wynik”. Wyniki niekompletne oznaczone „wstępny”. Stopka: data i godzina wygenerowania, `results_version`, skrót SHA-256 wyników (pierwsze 12 znaków + pełny w metadanych), adnotacja o danych osobowych.
- Plik trafia do S3 (SSE-KMS, wygasa po 7 dniach), a aplikacja pobiera go linkiem podpisanym (15 min) i otwiera systemowy arkusz udostępniania.
- PDF jest drukowalny: jasne tło (wyjątek od ciemnego motywu – wydruk), kolor akcentu `#796cbf` (accent-600) dla wyników i linii, tekst neutral-900.

## Rozważane alternatywy
| Opcja | Werdykt | Powód |
|---|---|---|
| Generowanie na telefonie (`expo-print` z HTML) | Odrzucona | Różnice renderowania iOS/Android, brak gwarancji zgodności z wersją wyników, problem offline |
| Headless Chromium (Playwright) na serwerze | Odrzucona | Ciężki obraz (≈ 400 MB), wolny start; pdfmake wystarcza do tabel |
| `@react-pdf/renderer` | Alternatywa równoważna | Możliwa, jeśli zespół woli JSX – decyzja Tech Leada |
| Ciemny PDF jak w podglądzie | Odrzucona | Nieczytelny na wydruku, marnuje toner |

## Konsekwencje
- ➕ Jednolity, weryfikowalny dokument. Brak obciążenia telefonu.
- ➖ Eksport wymaga sieci (organizator i tak jest online-first).
- ⚠ Podgląd (ciemny, w aplikacji) i plik (jasny, do druku) różnią się kolorystyką – świadoma decyzja, do akceptacji przez projektanta (Q-08).

## Status: zmieniony – weryfikacja Tech Leada (23.10.2026)

- **Kontrast (TL-27):** accent-600 `#796cbf` na białym tle ma kontrast 4,46:1, czyli poniżej 4,5:1 wymaganego dla zwykłego tekstu (WCAG 1.4.3). Wyniki i inne teksty w kolorze akcentu: **accent-700 `#5d5294` (6,77:1)**; accent-600 tylko dla linii i elementów graficznych (≥ 3:1). Tekst pomocniczy (klub, stopka): neutral-700 `#595d6c` (6,55:1), a nie neutral-600 (4,31:1). Tło białe `#ffffff` (wyjątek wydruku).
- **Czcionka:** pdfmake 0.3.x (pdfkit/fontkit) – osadzamy **statyczne** pliki Inter 4.1 (Regular 400 i Medium 500, TTF), nie wariant zmiennej czcionki. Polskie znaki (ą, ć, ę, ł, ń, ó, ś, ź, ż i wersaliki) oraz „−”, „–”, „„”” – test w spike'u IMP-605 i w TC-PDF.
- `@react-pdf/renderer` nie jest potrzebny – pdfmake potwierdzony (0.3.12, X 2026).
- Wydajność NFR-107 (turniej 60 kategorii / 1 500 startów ≤ 10 s) – pomiar w IMP-605/IMP-173.
