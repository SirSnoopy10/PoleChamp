# Design system w aplikacji mobilnej (Nocturne → React Native)

> Dokument: `02-specification/09-design-system.md` · Wersja 1.0 · 23.10.2026
> Źródła: `design/_ds/nocturne-…/styles.css` (tokeny), `readme.md` (zasady), `design/PoleChamp v2.dc.html` (użycie w produkcie). Inwentarz komponentów z designu: [03-analiza-designu.md §4–5](../00-research/03-analiza-designu.md#4-komponenty-użyte-w-designie). Kontrast: [08-wymagania-niefunkcjonalne.md §2.1](08-wymagania-niefunkcjonalne.md#21-kontrast-kluczowych-par-wyliczone-wg-wcag-2x).
> Implementacja: pakiet `@polechamp/tokens` (stałe TS) + komponenty w `apps/mobile/src/ui/`. Zero „magicznych” wartości w ekranach (odpowiednik reguły lint Nocturne „Raw hex color / Raw px value”).

## 1. Zasady

1. **Ciemny, spokojny i gęsty interfejs:** tło `bg` `#161826`, powierzchnie `surface` `#232532`, tekst `#e9e9ed`, jeden akcent `#9184d9`.
2. **Akcent jako linia i poświata, nie zalanie.** Przyciski główne są **obrysowane** (1 dp accent), a tła akcentowe to najwyżej delikatny tint (10–14% akcentu nad tłem). Duże powierzchnie nigdy nie są wypełnione akcentem.
3. **Kontrast z ramp tonalnych, nie z nasycenia:** stopnie 700–900 na tinty i krawędzie, 500 jako bazowy, 100–300 na tekst na tintach.
4. **Brak czystej czerni i bieli** (wyjątek: cienie z czerni oraz wydruk PDF i QR – [ADR-009](../01-architecture/adr/ADR-009-eksport-pdf-po-stronie-serwera.md), SCR-ORG-16).
5. **Hierarchia przez rozmiar i odstęp:** nagłówki Inter 500, nigdy grubsze. Tekst 400, liczby wyróżnione 500.
6. **Separatory wygaszane na końcach** (48 dp z każdej strony) dla samodzielnych linii (nagłówek sędziego, stopka formularza). Obrysy pól i separatory w listach grupowanych pozostają pełne.
7. **Ikony Phosphor** (regular; fill dla stanów „zakończone/ocenione”).
8. **Stany interakcji zawsze ostylowane:** pressed (tint z rampy akcentu), focus (obrys 2 dp accent, offset 2), disabled (opacity 0,45). Na urządzeniach dotykowych „hover” z prototypu (`brightness 1.12–1.2`) zastępuje stan **pressed**.
9. **Reguły UI-01…UI-15** z przeglądu designu są obowiązkowe ([03-analiza-designu.md §6](../00-research/03-analiza-designu.md#6-uwagi-z-przeglądu-designu-uploads)).

## 2. Tokeny → theme aplikacji

### 2.1 Kolory

```ts
// @polechamp/tokens – colors.ts (wartości 1:1 z styles.css Nocturne)
export const color = {
  bg: '#161826', surface: '#232532', text: '#e9e9ed', accent: '#9184d9',
  divider: 'rgba(233,233,237,0.16)',            // ≈ #383946 na bg, #434450 na surface
  neutral: { 100: '#f3f5fe', 200: '#e4e7f5', 300: '#cfd3e5', 400: '#b2b6ca', 500: '#9397ab',
             600: '#75798c', 700: '#595d6c', 800: '#3f424d', 900: '#292b31' },
  accentRamp: { 100: '#f5f4ff', 200: '#e7e5fe', 300: '#d2cefd', 400: '#b5abfc', 500: '#968ae0',
                600: '#796cbf', 700: '#5d5294', 800: '#423a6a', 900: '#2b2741' },
  // Odpowiedniki color-mix() z prototypu (RN nie wspiera color-mix) – wartości nieprzezroczyste:
  mix: {
    accent9OnSurface:  '#2d2e41', // karta aktywnego turnieju (start gradientu 160°)
    accent10OnBg:      '#222338', // tło primary w pasku przyklejonym / stopce
    accent14OnBg:      '#27273f', // aktywny segment, aktywny wiersz kolejki
    accent10OnSurface: '#2e2f43', // karta kary z licznikiem > 0
    surface45OnBg:     '#1c1e2b', // panel boczny sędziego, stopka formularza
    accent12OnBg:      '#25253b', // pressed primary/ghost na bg
    accent12OnSurface: '#303046', // pressed primary/ghost na surface
    glowAccent900_70:  '#252339', // poświata radialna (zanik do bg)
  },
  overlay: { sheetBackdrop: 'rgba(41,43,49,0.70)', dialogBackdrop: 'rgba(41,43,49,0.50)' },
} as const;
```
Role semantyczne (używać w komponentach zamiast surowych stopni):

| Rola | Token |
|---|---|
| `textPrimary` | text |
| `textSecondary` | neutral-400 |
| `textTertiary` | neutral-500 |
| `textOnTint` | accent-200 / accent-300 |
| `iconMuted` | neutral-500 / neutral-600 |
| `borderSubtle` | divider (shadow-sm = neutral-800) |
| `borderInput` | neutral-600 (adaptacja a11y, NFR-202) |
| `focusRing` | accent, 2 dp |
| `statusLive` | accent (kropka), accent-900 / accent-300 (pigułka) |
| `statusDone` | neutral-500 (kropka), neutral-900 / neutral-300 |
| `statusDraft` | neutral-600 (kropka), przezroczyste / neutral-300 + obrys divider |
| `error` | accent-300 + ikona `warning-circle` (Nocturne nie ma koloru błędu – świadomie mono) |

### 2.2 Odstępy (gęstość 0,7×)

| Token | dp | Użycie typowe w designie |
|---|---|---|
| `space1` | 2,8 | – |
| `space2` | 5,6 | odstępy ikona–tekst (5–6) |
| `space3` | 8,4 | odstępy w chipach (6–8) |
| `space4` | 11,2 | odstępy kart (10–12) |
| `space6` | 16,8 | padding kart/ekranu (14–16) |
| `space8` | 22,4 | sekcje (22–28) |

Prototyp używa też wartości bezpośrednich (10, 12, 14, 16, 18, 22, 26, 28). W aplikacji obowiązuje skala pomocnicza `layout` = {4, 6, 8, 10, 12, 14, 16, 18, 22, 26, 28, 34, 48} dp, a ekrany korzystają tylko z niej. **Q-08:** projektant potwierdza, czy dopuszczamy tę skalę obok `space*`.

### 2.3 Promienie

| Token | dp | Użycie |
|---|---|---|
| `radiusSm` | 4 | – |
| `radiusMd` | 8 | przyciski, pola, banery |
| `radius11` | 11 | segmented control, odznaki numerów 38 dp |
| `radius12` | 12 | wiersz kolejki, kafelek archiwum |
| `radiusLg` | 14 | karty, listy grupowane |
| `radius16` | 16 | odznaka numeru 56 dp |
| `radiusSheet` | 22 | górne rogi bottom sheet |
| `radiusPill` | 999 | pigułki, chipy, toast, przyciski okrągłe |

### 2.4 Cienie / elewacja

| Token CSS | Odpowiednik RN |
|---|---|
| `shadow-sm` (`0 0 0 1px #3f424d`) | `borderWidth: 1, borderColor: neutral-800` (krawędź, bez cienia) |
| `shadow-md` (krawędź neutral-700 + `0 6 18 rgba(0,0,0,.55)`) | `borderWidth: 1, borderColor: neutral-700` + iOS `shadowOffset {0,6}, shadowRadius 9, shadowOpacity .55`; Android `elevation 8` |
| `shadow-lg` (krawędź neutral-500 + `0 16 40 rgba(0,0,0,.65)`) | `borderColor: neutral-500` + iOS `shadowRadius 20, opacity .65`; Android `elevation 16` |
| cień kciuka suwaka `0 2 10 rgba(0,0,0,.5)` | iOS `shadowRadius 5, opacity .5`; Android `elevation 4` |

### 2.5 Typografia (Inter, `@expo-google-fonts/inter`: 400 Regular, 500 Medium)

| Styl | Rozmiar / interlinia | Waga | Użycie (przykład z designu) |
|---|---|---|---|
| `display` | 32 / 36 | 500 | „Turnieje” |
| `titleL` | 28 / 32 | 500 | „Panel sędziego”, „Dzień dobry, …” |
| `titleM` | 26 / 31 | 500 | nazwa turnieju / kategorii |
| `titleS` | 24 / 28 | 500 | nazwisko w formularzu oceny |
| `heading` | 20 / 24 | 500 | tytuł bottom sheetu |
| `cardTitle` | 18 / 22,5 | 500 | nazwa turnieju na karcie, kategoria u sędziego |
| `subhead` | 16 / 20 | 500 | nazwa kategorii na karcie |
| `body` | 15 / 23 | 400 | wiersze list, pola |
| `bodyS` | 14 / 21 | 400 | teksty arkuszy, komentarz |
| `meta` | 12,5–13 / 18 | 400 | daty, miejsca, podtytuły |
| `caption` | 12 / 17 | 400 | opisy, liczniki |
| `kicker` | 11,5 / 14, wersaliki, odstęp 0,08 em | 400 | „AKTYWNE”, „KRYTERIA OCENY” |
| `micro` | 11 / 13 | 400 | odznaki wag, liczniki w segmentach |
| `numXL` | 30 / 30 | 500, tabelaryczne | wartość kryterium, „Twój wynik” |
| `numL` | 22 / 26 | 500, tabelaryczne | kafle statystyk, licznik kary |
| `numM` | 17–20 / 22 | 500, tabelaryczne | wynik i miejsce w rankingu |
| `pin` | 26 / 30 | 500 | klawisze PIN |

Liczby: `fontVariant: ['tabular-nums']` wszędzie tam, gdzie prototyp ma `font-variant-numeric: tabular-nums`. Odstęp liter nagłówków −0,015 em (logo −0,02 em).

### 2.6 Ruch

| Animacja | Czas / krzywa | Źródło |
|---|---|---|
| Wjazd bottom sheet | 260 ms, `cubic-bezier(.2,.8,.2,1)` | `pcSheet` |
| Tło nakładki (fade) | 180 ms ease | `pcFade` |
| Toast | 220 ms, wjazd z 10 dp | `pcToast` |
| Splash: wejście tekstu | 600 ms, opóźnienia 200 / 350 ms | `pcRise` |
| Splash: pasek | 4,2 s `cubic-bezier(.4,.1,.3,1)` | `pcProgress` |
| Splash: wyjście | 500 ms fade | prototyp |
| Zmiana kolejności rankingu | 200 ms (rozszerzenie) | – |
| Reduce motion | animacje → natychmiast / fade ≤ 150 ms | NFR-207 |

## 3. Ikony (Phosphor – `phosphor-react-native`)

| Kontekst | Ikony (z designu) | Rozmiar |
|---|---|---|
| Marka | `trophy` | 16–20 |
| Nawigacja | `caret-left`, `caret-right`, `x` | 16–20 |
| Akcje | `plus`, `minus`, `pencil-simple`, `trash`, `file-pdf`, `download-simple`, `play`, `flag-checkered`, `lock-simple`, `lock-simple-open`, `arrow-right`, `sign-out`, `backspace` | 16–20 |
| Meta | `calendar-blank`, `map-pin`, `info`, `archive`, `squares-four`, `hand-pointing`, `gavel`, `device-mobile`, `device-tablet` | 12–26 |
| Stany | `check-circle` (fill), `circle`, `circle-dashed`, `warning-circle` | 16–18 |
| Rozszerzenia (poza designem) | `cloud-check`, `cloud-slash`, `arrows-clockwise`, `clock`, `qr-code`, `key`, `user-circle`, `user-minus`, `copy`, `eye`, `eye-slash`, `magnifying-glass`, `battery-*`, `link-break`, `x-circle`, `device-rotate` (nakładka orientacji – TL-23) | 16–28 |

## 4. Komponenty bazowe

Każdy komponent ma: warianty, stany (default / pressed / focus / disabled / loading, gdzie dotyczy), tokeny, wymagania a11y. Nazwy komponentów są wiążące dla implementacji.

### 4.1 `Button`
| Wariant | Wygląd | Użycie |
|---|---|---|
| `primary` | tekst accent, obrys 1 dp accent, tło przezroczyste (w pasku przyklejonym/stopce: `accent10OnBg`); pressed: `accent12On*` (22% w CSS) | „Utwórz turniej”, „Rozpocznij kategorię”, „Zatwierdź i dalej”, „Zapisz” |
| `secondary` | tekst `text` (lub neutral-300 dla usuwania), obrys divider; pressed: text 14% | „Zakończ turniej”, „Anuluj”, „Zakończ i zablokuj”, „Usuń kryterium” |
| `ghost` | tekst accent, bez obrysu, padding poziomy 2,8; pressed: accent 18% | „+ Dodaj”, „‹ Zmień sędziego” |
| `iconRound` | koło 30 / 36 / 40 / 44 dp | „+”, PDF, ołówek, „×”, −/+ |
- Rozmiary: wysokość 44 (karta postępu), 48 (arkusze, pasek przyklejony), 52 (stopka sędziego); font 14–16 / 500 (Inter Medium); ikona 17–18 dp, odstęp 6–8.
- Stany: disabled opacity 0,45; loading – spinner w miejscu ikony, nieaktywny; focus – obrys 2 dp accent (offset 2).
- A11y: `accessibilityRole="button"`, etykieta = tekst; przyciski ikonowe mają etykietę (np. „Eksport PDF turnieju”, „Edytuj kategorię”).
- **Zakaz:** wypełnione przyciski akcentem (Nocturne).

### 4.2 `StatusPill`
- Anatomia: kapsuła (padding 3/10/3/8, radius 999, 11,5 dp), kropka 6 dp, etykieta.
- Warianty: `draft` („W przygotowaniu”), `live` („Trwa”), `done` („Zakończona”); kolory wg §2.1 (role `status*`). Rozszerzenia: `syncOk`, `syncPending`, `offline`, `attention` (SCR-JDG-07), `provisional` („wstępny”, neutral), `unplayed` („Nierozegrana” – wygląd jak `draft`, kategoria niewystartowana w turnieju Zakończona, TL-33).
- Nie zawija tekstu (UI-11), nie jest interaktywna (UI-02).

### 4.3 `Badge`
| Wariant | Wygląd | Przykład |
|---|---|---|
| `weight` | padding 3/8 (formularz sędziego 1/6), radius 6 (5), 12 (11) dp, accent-900 / accent-300 | „×2” |
| `penalty` | jak wyżej, neutral-900 / neutral-200 | „−2 pkt” |
| `number` | kwadrat 38 dp (radius 11) lub 56 dp (radius 16), accent-900 / accent-200 lub neutral-900 / neutral-200 | „47” |
| `scored` | kapsuła 12 dp, `check-circle` fill, accent-900 / accent-300 | „Oceniono” |

### 4.4 `Card` i pochodne
- `Card`: surface, radius lg, krawędź shadow-sm, padding 14–18.
- `TournamentCard` (SCR-ORG-01): gradient 160° `accent9OnSurface` → surface (`expo-linear-gradient`), padding 16, odstęp 12.
- `CategoryCard` (SCR-ORG-03, SCR-JDG-03), `StatTiles` (siatka 3 kolumn z separatorem 1 dp), `ProgressCard` („Postęp oceniania”), `CriterionCard` i `PenaltyCard` (§4.13–4.14).
- Pressed: przyciemnienie/rozjaśnienie o 8% (odpowiednik `brightness(1.1)`).

### 4.5 `GroupedList` / `ListRow`
- Kontener: radius lg, tło divider, wiersze rozdzielone 1 dp (gap), krawędź shadow-sm.
- `ListRow`: min. wysokość 56 (konfiguracja) / 60 (osoby), padding 10/14, odstęp 12; sloty: `leading` (odznaka/kafelek), `title` (15 dp, 1 linia, wielokropek), `subtitle` (12 dp neutral-400), `trailing` (odznaka/licznik/ikona), `chevron` (neutral-600) – chevron tylko dla wierszy edytowalnych (UI-07).
- Akcje destrukcyjne nie występują w wierszu (UI-06).

### 4.6 `SegmentedControl`
- Siatka N kolumn, padding 3, odstęp 3, radius 11, surface + shadow-sm. Segment: padding 8/4, 13 dp, licznik 11 dp opacity 0,7.
- Aktywny: tło `accent14OnBg`, tekst accent-200, obrys 1 dp accent-700 (UI-08). Nieaktywny: przezroczysty, neutral-300.
- A11y: `tablist` / `tab` z `selected`.

### 4.7 `ChoiceChip`
- Padding 8/13, radius 999, 13 dp. Wybrany: accent-900 / accent-200 + obrys accent; niewybrany: bg / neutral-300 + obrys divider. Grupa: jednokrotny wybór (`radiogroup`).

### 4.8 `TextField`, `NumberField`, `TextArea`
- Etykieta 12 dp (tekst 70%), margines 5. Pole: min. 44 dp, padding 6/10, 15 dp, tło bg (na arkuszu), obrys neutral-600 (spoczynek, adaptacja a11y), accent (fokus), radius md, kursor accent.
- Błąd: obrys accent-300 + komunikat pod polem (12 dp, accent-300, `warning-circle`).
- `NumberField`: klawiatura numeryczna, akceptuje „,” i „.”, opcjonalny stepper −/+ (krok 0,5) dla wag i punktów.
- `TextArea`: min. 76 dp (komentarz sędziego) / 90 dp, licznik znaków opcjonalny.

### 4.9 Bottom sheet
- Implementacja: własny komponent `Sheet` (`apps/mobile/src/ui/sheet/`) na Reanimated 4 + Gesture Handler 3 (decyzja TL-03; `@gorhom/bottom-sheet` 5.x dopuszczony wyłącznie po pozytywnym wyniku spike'u IMP-602). Tło surface, radius 22 u góry, krawędź shadow-md, padding 8/18/34 (+ safe area), odstęp 14, maks. 88% wysokości (Podgląd PDF 86%).
- Uchwyt 36×5 dp neutral-700; nagłówek: tytuł `heading` + `iconRound` 30 dp „×” (neutral-800 / neutral-300).
- Tło nakładki `sheetBackdrop`; zamknięcie tapnięciem tła, gestem lub „×”.
- Wariant potwierdzenia (SCR-ORG-04, 18): treść wyśrodkowana, ikona w kole 52 dp (accent-900 / accent-300), przyciski w kolumnie.
- Wariant „drugi krok” (potwierdzenie usunięcia w tym samym arkuszu): podmiana treści z animacją 180 ms.
- Klawiatura: arkusz przesuwa się nad klawiaturę (odpowiednik `keyboardBehavior="interactive"`; `react-native-keyboard-controller` lub `KeyboardAvoidingView` – decyzja w IMP-206).
- Przycisk „wstecz” Androida zamyka najwyższy arkusz (nie cofa ekranu); czytnik ekranu nie odczytuje treści pod arkuszem (`accessibilityViewIsModal` / `importantForAccessibility`).

### 4.10 `Dialog` (tablet)
- Wyśrodkowany, szer. ≤ 440 dp, surface, radius lg, shadow-lg, padding 11,2, odstęp 8,4; tytuł 20 dp; treść 14 dp (85%); akcje do prawej. Tło `dialogBackdrop`. Użycie: SCR-JDG-09.

### 4.11 `Toast`
- Kapsuła u dołu (28 dp nad dolną krawędzią bezpiecznego obszaru), wyśrodkowana, padding 11/18/11/14, surface + shadow-md, 13,5 dp, ikona 18 dp; 2,2 s; nowy toast zastępuje poprzedni.
- Warianty: `success` (`check-circle` fill accent) – design; `error` / `info` (`warning-circle` / `info`, accent-300) – rozszerzenie.
- A11y: ogłaszany (`accessibilityLiveRegion="polite"` / `AccessibilityInfo.announceForAccessibility`).
- Katalog tekstów: §6.

### 4.12 `ProgressBar`
- Wysokość 3 (ranking), 4 (karty), 6 (postęp turnieju) dp; tor neutral-800; wypełnienie accent (wariant `secondary`: accent-700); radius = wysokość/2. Etykieta tekstowa obok (cyfry tabelaryczne). A11y: `progressbar` z wartością.

### 4.13 `CriterionCard` z `ScoreSlider`
- Anatomia: nazwa + `Badge weight`, opis, wartość (`numXL` accent-200) + „ /{skala}” (13 dp neutral-500); rząd: `iconRound` 44 „−”, `ScoreSlider`, `iconRound` 44 „+”.
- `ScoreSlider`: zakres 0–skala, krok 0,5; tor 8 dp (wypełnienie accent do wartości, reszta neutral-800); kciuk 28 dp (accent-100 + obrys 7 dp accent + cień). Implementacja: Reanimated + Gesture Handler (worklety, 60 fps), przyciąganie do 0,5, haptyka przy całych punktach (rozszerzenie).
- Stany: disabled (tryb tylko do odczytu, opacity 0,55 dla całej sekcji).
- A11y: rola `adjustable`, etykieta „{kryterium}, {wartość} z {skala}”, akcje increment/decrement 0,5.

### 4.14 `PenaltyCounter`
- Anatomia: nazwa (15 dp/500), opis „−{pkt} pkt za każde · maks. {n}×”, `iconRound` 40 „−” (hitSlop do 44), licznik (`numL`, szer. 26), `iconRound` 40 „+”.
- Stany: licznik > 0 → tło `accent10OnSurface` + obrys accent-700; „+” przy maksimum opacity 0,35 i nieaktywny; „−” przy 0 nieaktywny (rozszerzenie).
- A11y: `adjustable`, etykieta „{kara}, {n} z {maks.}”.

### 4.15 `PinPad` i `PinDots`
- `PinDots`: 4 × 14 dp, odstęp 16; wypełniona accent / pusta obrys 1,5 dp neutral-600; błąd – animacja potrząśnięcia 300 ms (rozszerzenie).
- `PinPad`: siatka 3×4, klawisze 76 dp (surface + krawędź, 26 dp/500), pusty klawisz niewidoczny, backspace bez tła (`backspace`). Pressed: rozjaśnienie (brightness 1,5). Disabled: opacity 0,45.
- Bezpieczeństwo: brak podglądu cyfr, brak zapisu do schowka, `filterTouchesWhenObscured` (Android).

### 4.16 `Avatar` (inicjały)
- Koło 28 / 38 / 44 / 64 dp, accent-900 / accent-200 (nieaktywny: neutral-900 / neutral-400); inicjały = pierwsze litery słów imienia i nazwiska („KN”).

### 4.17 `SectionHeader` (kicker + akcja)
- Kicker (`kicker`, neutral-400, margines 0/4/8) + opcjonalnie `Button ghost` „Dodaj” (13 dp, `plus`).

### 4.18 `EmptyState`
- Wariant ramki (SCR-ORG-03): obrys 1 dp divider, radius lg, padding 28/16, ikona 26 dp accent, tekst 13 dp neutral-400, całość tapowalna.
- Wariant prosty (listy): tekst 13–14 dp neutral-400, wyśrodkowany. Wariant z kołem (SCR-JDG-04): koło 56 dp surface + ikona accent 24 dp.

### 4.19 `Banner`
- Tło accent-900, tekst accent-200, ikona 15 dp, 12 dp, radius md, padding 8/10. Warianty: `locked` (`lock-simple` – design), `rejected` / `offline` / `emailVerify` (rozszerzenia; offline: neutral-900 / neutral-300, `cloud-slash`).

### 4.20 `SyncPill` (rozszerzenie)
- Wariant `StatusPill` w nagłówku sędziego; stany i teksty: [06-offline-i-synchronizacja.md §8.1](../01-architecture/06-offline-i-synchronizacja.md#81-tablet--pigułka-w-nagłówku-poza-designem-propozycja-w-stylu-nocturne). Tapnięcie otwiera popover SCR-JDG-07.

### 4.21 `Splash` (`PoleSpinner`)
- Animacja pixel-art: siatka 80×70, 24 kl./s, pętla 5,5 s, interpolacja splajnami monotonicznymi, IK 2-kościowe, paleta 4-tonowa, „kucyk” verlet (opis w `design/pole-spinner.js`). Implementacja na `@shopify/react-native-skia`. Fallback: sekwencja klatek (sprite) wygenerowana z tego samego skryptu – decyzja Tech Leada (ADR-001).
- Rozmiar: 340×300 (telefon), 470×410 (tablet).

### 4.22 `StickyActionBar`
- Przyklejony u dołu, padding 18/16/34 (+ safe area), tło gradient od bg (72%) do przezroczystego; 1–2 przyciski 48 dp (`flex: 1`, odstęp 8). Użycie: SCR-ORG-06…08, SCR-ORG-14.

### 4.23 `Skeleton` (rozszerzenie)
- Bloki neutral-800, radius jak docelowy element, animacja opacity 0,5 ↔ 0,8 (1,2 s); przy „Ogranicz ruch” statyczne.

### 4.24 `ScreenHeader` / `BackLink`
- Wiersz 44 dp; `BackLink`: `caret-left` 20 dp + tekst 15 dp accent (tablet 13,5 / 16 dp), padding 6, radius md, margines lewy −6; pressed: accent 10%.
- Nagłówek sędziego (`JudgeHeader`): opis w [06-ekrany-sedziego.md §0](06-ekrany-sedziego.md#0-zasady-wspólne-dla-trybu-sędziego).

## 5. Formatowanie treści

| Element | Reguła | Przykład |
|---|---|---|
| Liczby dziesiętne | przecinek; noty i wyniki 1 miejsce (wyjątek: pozorny remis – 2 miejsca) | „54,3”, „52,70” |
| Wagi i punkty | bez zbędnych zer | „×1,5”, „×2”, „−0,5 pkt” |
| Minus | U+2212 „−” | „kary −4,0” |
| Zakresy | półpauza bez spacji | „Skala 0–10”, „3–4 października 2026” |
| Separator meta | „ · ” | „Pole Sport · Advanced · Senior 18+” |
| Numer startowy | „#” w rankingu, sama liczba w odznakach | „#47 · Studio Vertical Wrocław” |
| Liczba mnoga | CLDR pl | „1 kategoria”, „3 kategorie”, „8 kategorii”; „1 zawodniczka”, „2 zawodniczki”, „9 zawodniczek” |
| Cudzysłowy | polskie „…” | „„Mistrzostwa…” zostanie zamknięty…” |
| Wielokropek | znak „…” | „Wczytywanie turniejów…” |

## 6. Katalog toastów (teksty z prototypu + rozszerzenia)

| Klucz i18n | Tekst | Źródło |
|---|---|---|
| `toast.tournamentCreated` | „Utworzono turniej” | design |
| `toast.tournamentStarted` | „Turniej rozpoczęty” | design |
| `toast.tournamentFinished` | „Turniej zakończony” | design |
| `toast.changesSaved` | „Zapisano zmiany” | design |
| `toast.categoryAdded` | „Dodano kategorię” | design |
| `toast.categoryStarted` | „Kategoria rozpoczęta” | design |
| `toast.categoryLocked` | „Kategoria zakończona” | design |
| `toast.categoryUnlocked` | „Kategoria odblokowana” | design |
| `toast.criterionAdded` / `Saved` / `Deleted` | „Dodano kryterium” / „Zapisano kryterium” / „Usunięto kryterium” | design |
| `toast.penaltyAdded` / `Saved` / `Deleted` | „Dodano karę” / „Zapisano karę” / „Usunięto karę” | design |
| `toast.athleteAdded` | „Dodano zawodniczkę” | design |
| `toast.pdfSaved` | „PDF zapisany” (w prototypie „PDF zapisany (demo)”) | design (zmienione) |
| `toast.categoryNotStarted` | „Ta kategoria jeszcze się nie rozpoczęła” | design |
| `toast.scoreSaved` | „Zapisano ocenę: {imię i nazwisko}” | design |
| `toast.startListUpdated` | „Lista startowa została zaktualizowana” | rozszerzenie |
| `toast.saveFailed` | „Nie udało się zapisać. Spróbuj ponownie.” | rozszerzenie |
| `toast.pdfFailed` | „Nie udało się wygenerować PDF. Spróbuj ponownie.” | rozszerzenie |
| `toast.startRequirement.*` | „Dodaj co najmniej jedno kryterium.” / „Dodaj co najmniej jedną zawodniczkę.” / „Dodaj co najmniej jednego sędziego.” | rozszerzenie |
| `toast.sessionReplaced` | „Zalogowano Cię na innym urządzeniu.” | rozszerzenie |
| `toast.pinCopied` | „Skopiowano PIN” | rozszerzenie |

## 7. Czego nie robić (checklista PR)
- [ ] Brak wypełnionych przycisków i dużych powierzchni w kolorze akcentu.
- [ ] Brak `#000` / `#fff` w UI (poza cieniami, QR i PDF).
- [ ] Brak wag czcionki > 500.
- [ ] Brak systemowych, nieostylowanych kontrolek (suwaki, przełączniki, pola) – UI-04.
- [ ] Brak widocznych pasków przewijania w kontenerach treści – UI-09.
- [ ] Teksty nie nachodzą na siebie przy 120–130% rozmiaru czcionki – UI-05, NFR-204.
- [ ] Safe area respektowane na wszystkich ekranach – UI-10.
- [ ] Status nie udaje przycisku – UI-02. Akcje destrukcyjne tylko w arkuszach z potwierdzeniem – UI-06.
- [ ] Wszystkie wartości z `@polechamp/tokens`.
