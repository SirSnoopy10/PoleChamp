# Dostępność – scenariusze i raport (IMP-460)

Automatycznie: TC-A11Y-001 (kontrast tokenów – `packages/tokens`), TC-A11Y-006 (cele dotykowe ≥ 44 dp – `apps/mobile/src/dev/catalog/__tests__/touch-targets.test.tsx`, wszystkie przypadki komponentów DevCatalog), TC-A11Y-011 i 014 (Jest, role i etykiety). Pozostałe – ręcznie na urządzeniach referencyjnych (IMP-463), dane `POST /__e2e/seed/FX-SEED`, build `preview`.

Wykonane 2026-10-27 (automaty): TC-A11Y-006 wykrył 2 defekty – nagłówek sekcji „Dodaj” 28 dp bez `hitSlop` i segmenty `SegmentedControl` 36 dp; poprawione (`ButtonSize` 28 z dopełnieniem do 44 dp, `hitSlop` segmentów).

## Scenariusze ręczne

| TC | Urządzenie | Kroki | Oczekiwane |
|---|---|---|---|
| TC-A11Y-002 | iPhone 12, iPad 9 – Xcode Accessibility Inspector | Audyt SCR-ORG-01, 03, 06–08, 13; SCR-JDG-01–05 | 0 błędów krytycznych (brak etykiet, kontrast, rozmiar) |
| TC-A11Y-003 | Pixel 6a, Galaxy Tab A8 – Accessibility Scanner | Jak wyżej | jak wyżej |
| TC-A11Y-004 | iPhone 12, VoiceOver | Utworzenie turnieju → kategoria → zawodniczka → start kategorii → ranking → eksport PDF | wszystkie kroki wykonalne; etykiety i role; kolejność fokusu = wizualna; toasty ogłaszane |
| TC-A11Y-005 | Galaxy Tab A8, TalkBack | Profil → PIN → kategoria → ocena (suwak „adjustable”, liczniki kar) → zatwierdzenie | suwak ogłasza „Technika, 8,5 z 10”, gesty ±0,5 |
| TC-A11Y-007 | iPhone 12 i Pixel 6a, czcionka 130% | SCR-ORG-01…22 | brak obcięć i nachodzenia (UI-05) |
| TC-A11Y-008 | iPad 9 i Tab A8, czcionka 120% | SCR-JDG-00…10 | noty i „Twój wynik” bez zawijania |
| TC-A11Y-009 | „Ogranicz ruch” | splash, arkusze, toasty, ranking | statyczna klatka splash; przejścia ≤ 150 ms fade |
| TC-A11Y-010 | VoiceOver/TalkBack | kolejka i lista startowa z długimi nazwiskami | pełne imię i nazwisko odczytywane (UI-15) |
| TC-A11Y-011 | VoiceOver/TalkBack | bottom sheet, dialog SCR-JDG-09 | fokus w arkuszu, tło niedostępne, „wstecz” zamyka |
| TC-A11Y-012 | – | ładowanie / pusty / błąd / offline dla każdego ekranu | każdy stan zdefiniowany i ostylowany |
| TC-A11Y-013 | skala szarości | ikony stanu w kolejce i liście startowej | stany rozróżnialne kształtem i tekstem |
| TC-A11Y-014 | VoiceOver | wprowadzanie PIN-u | cyfry z etykietami, „Usuń cyfrę”, liczba cyfr ogłaszana bez wartości |
| TC-DESIGN-005 | czcionka 130% | jak TC-A11Y-007 | brak nachodzenia tekstów |
| TC-DESIGN-011 | czcionka 130% / wąski ekran | pigułki, chipy, przyciski | bez zawijania |

## Raport (wypełnia QA)

| TC | Data | Urządzenie / system | Wynik | Defekty (ważność) |
|---|---|---|---|---|
| | | | | |

Ważność: krytyczny (blokuje ścieżkę US Must), poważny, drobny. Wydanie wymaga 0 krytycznych (DoD IMP-460).
