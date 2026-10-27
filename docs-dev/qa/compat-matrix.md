# Macierz zgodności i pomiary na urządzeniach (IMP-463)

Przebieg: `maestro --device <id> test apps/mobile/e2e/maestro --include-tags p1` na każdym urządzeniu; pomiary Android: `node tools/e2e/src/device-metrics.ts <serial> 30` w trakcie 30 min oceniania (pamięć) i 60 min pracy (bateria); iOS – Xcode Instruments.

## Urządzenia i systemy (TC-COMPAT-001, 002)

| Urządzenie | System | Rola | E2E p1 | Uwagi |
|---|---|---|---|---|
| iPhone 12 | iOS 16.4 / najnowszy | organizator | – | brak urządzenia |
| Pixel 6a | Android 14 | organizator | – | brak urządzenia |
| iPad 9. gen. | iPadOS najnowszy (26) | sędzia | – | brak urządzenia |
| Galaxy Tab A8 | Android 14 | sędzia | – | brak urządzenia |
| Emulator Pixel 6 | API 29 (Android 10) | organizator (dymny) | – | CI `mobile-e2e` (E2E_ENABLED) |
| Emulator Pixel Tablet | API 36 (Android 16) | sędzia | – | CI `mobile-e2e` (E2E_ENABLED) |

## Przypadki

| TC | Jak | Wynik |
|---|---|---|
| TC-COMPAT-001 | `smoke.yaml` na macierzy systemów (workflow `mobile-e2e`) | |
| TC-COMPAT-002 | E2E `p1` na 4 urządzeniach referencyjnych | |
| TC-COMPAT-003 | SCR-ORG na szerokościach 320/375/390/430 dp (regresja wizualna, ręcznie) | |
| TC-COMPAT-004 | tablet < 1024 dp w poziomie – tryb sędziego niedostępny | |
| TC-COMPAT-005 | Android 16 ignoruje blokadę orientacji – `judge/28-orientation.yaml` | |
| TC-COMPAT-006 | iPadOS 26 – zmiana okna < 1024 dp → nakładka | |
| TC-COMPAT-007 | tryb organizatora na tablecie | |
| TC-COMPAT-008 | przycisk wstecz Androida w arkuszach i dialogach | |
| TC-COMPAT-009 | aktualizacja aplikacji z danymi (outbox niepusty) – P-33 w `sync/manual.md` | |
| TC-COMPAT-010 | tylko ciemny motyw przy jasnym motywie systemu | |
| TC-PERF-014 | pamięć 30 min oceniania (Tab A8) – `device-metrics.ts` | |
| TC-PERF-015 | bateria 1 h pracy (Tab A8, iPad 9) | |

## Do PM

Brak urządzeń referencyjnych (iPhone 12, Pixel 6a, iPad 9, Galaxy Tab A8) – zakup lub wypożyczenie (albo farma urządzeń) przed wykonaniem tabeli. Spike'i IMP-600…607 (pomiary wydajności) wymagają tych samych urządzeń.
