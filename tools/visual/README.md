# Regresja wizualna aplikacji (IMP-459)

Zrzuty z Maestro (build `preview`, telefon 390×844 i tablet 1180×820) porównywane `odiff` z wzorcami w `baselines/` (Git LFS). Próg 0,1% pikseli, maska paska statusu, antyaliasing ignorowany.

| Plik | Zakres | TC |
|---|---|---|
| `maestro/catalog.yaml` | sekcje DevCatalog (`polechamp://catalog/<sekcja>`) | TC-DESIGN-023 |
| `maestro/catalog-l10n.yaml` | sekcje DevCatalog z pseudolokalizacją i czcionką 130% (`<sekcja>__pseudo130__<urządzenie>.png`) | TC-L10N-002, TC-A11Y-007/008 (IMP-504) |
| `maestro/screens.yaml` | ekrany SCR-ORG (telefon) i SCR-JDG (tablet) na FX-SEED | TC-DESIGN-016…020 |

Nazwy zrzutów: `<sekcja>__<przypadek>__<phone|tablet>.png` (np. `buttons__default__phone.png`, `scr-org-08__seed__phone.png`).

## Przebieg

```bash
maestro test tools/visual/maestro/catalog.yaml --env DEVICE=phone --test-output-dir reports/maestro/visual
pnpm --filter @polechamp/visual compare -- ../../reports/maestro/visual
```

Wynik: `tools/visual/reports/index.html` (tabela zmienionych, nowych i brakujących zrzutów z obrazami różnic) i `comment.md` (komentarz do PR). Kod wyjścia ≠ 0 przy jakiejkolwiek zmianie.

## Akceptacja nowych wzorców (projektant, IMP-653)

1. CI na PR publikuje artefakt `visual-report` i komentarz z listą zmian; scalenie blokuje brak etykiety `visual-approved`.
2. Projektant przegląda raport HTML. Zmiana zamierzona → nadaje etykietę `visual-approved`; niezamierzona → zgłasza defekt na PR.
3. Po akceptacji autor PR kopiuje zrzuty z artefaktu do `tools/visual/baselines/` (`git lfs track` obejmuje `*.png`), commit `chore: wzorce wizualne <ekrany>`.
4. Wzorce generowane wyłącznie w CI (ten sam emulator i obraz systemu) – zrzuty z lokalnych urządzeń nie są wzorcami.

## Stan

Wzorce (`baselines/`) nie istnieją – wymagają buildu `preview` na emulatorze CI (EAS, IMP-023) i decyzji spike IMP-608 (Maestro vs. natywne narzędzia). Flaga wyłączająca animacje (`E2E_DISABLE_ANIMATIONS`) nie jest jeszcze w aplikacji – przepływy czekają `waitForAnimationToEnd`.
