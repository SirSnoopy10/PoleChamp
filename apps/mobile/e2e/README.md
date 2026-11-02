# Testy E2E aplikacji (Maestro)

Maestro CLI 2.11. Przepływy w `e2e/maestro/`:

| Katalog | Zawartość | Urządzenie |
|---|---|---|
| `smoke.yaml` | przepływ dymny: start, wybór trybu, logowanie (TC-COMPAT-001) | telefon i tablet |
| `org/` | organizator TC-E2E-ORG-* (IMP-455, IMP-467) | telefon (Pixel 6 / iPhone) |
| `judge/` | sędzia TC-E2E-JDG-* (IMP-456, IMP-468) | tablet (Galaxy Tab A8 / iPad 9) |
| `full/` | pełny turniej na dwóch urządzeniach (IMP-457) – uruchamia `tools/e2e` | telefon + tablet |
| `sync/` | offline i synchronizacja TC-SYNC-* (IMP-458, IMP-469) | tablet |
| `_shared/` | przepływy pomocnicze i `api.js` (przygotowanie stanu) | – |

Tagi: `p1` (ścieżki krytyczne), `nightly` (przebieg nocny), `smoke`, `manual` (procedura ręczna – wykluczona z CI), `full`.

## Konwencja `testID`

- Format `<ekran>-<element>` małymi literami z myślnikami: `login-submit`, `tournaments-create`, `score-submit`, `pair-code`.
- Elementy list: `<encja>-<id>` (`category-${id}`, `profile-${judgeId}`, `entry-${id}`); części elementu: `<encja>-<id>-<część>` (`criterion-${id}-plus`).
- Komponenty bazowe (`src/ui`) przyjmują `testID` i nadają go częściom z sufiksem (`${testID}-backdrop`, `${testID}-value`).
- Kontener ekranu: `<ekran>-screen` (`login-screen`, `profiles-screen`) – na nim czekają `extendedWaitUntil`.
- Teksty sprawdzamy dokładnie (`assertVisible: 'Kategoria rozpoczęta'`) tylko dla tekstów wiążących (toasty, błędy).

Każdy `id:` w przepływie musi istnieć w kodzie – sprawdza to `pnpm --filter @polechamp/e2e-tools test` (`tools/e2e/src/maestro.ts`, także zakaz PIN-ów demo 1234…5678).

## Przygotowanie stanu (API `E2E_HELPERS=1`)

API dev/staging z flagą `E2E_HELPERS=1` (w produkcji start z flagą jest odrzucany – TC-SEC-018) udostępnia:

| Trasa | Działanie |
|---|---|
| `POST /__e2e/reset` | czyści limity zapytań w Valkey |
| `POST /__e2e/seed/{FX-…}` | nowe konto z fiksturą (`FX-SEED`, `FX-T1C3`, `FX-FINISHED`, `FX-EMPTY`, `FX-UNVERIFIED`, `FX-DRAFT-CAT`, `FX-TABLET`); zwraca `email`, `password`, `ids` (t1, c3, jA, u17 → UUID) i `pins` |
| `POST /__e2e/clock` | cofa kolumnę czasu wiersza (`{ table, column, id, interval: '16 minutes' }`) – wygasanie kodów, blokad, sesji |
| `GET /__e2e/emails/last?to=` | ostatni e-mail z kolejki (kod weryfikacji / resetu) |

Dane FX-SEED to port seedu prototypu (`@polechamp/test-fixtures`) – ranking c3 i postęp t1 (173 z 215) jak w designie; PIN-y testowe 8306, 4719, 2958, 6143, 7390 (jA…jE).

## Uruchamianie

```bash
# API z helperami (lokalnie: docker compose up -d, potem kroki z apps/api/README.md)
pnpm --filter @polechamp/api build && E2E_HELPERS=1 pnpm --filter @polechamp/api start
# `runScript` działa na hoście, nie na urządzeniu – API_URL=http://localhost:3000 także dla emulatora
maestro test apps/mobile/e2e/maestro --env API_URL=http://localhost:3000 --include-tags p1
```

Dev client po `clearState` otwiera launcher Expo – przepływy wymagają buildu z dołączonym JS (lokalnie `gradlew assembleRelease`, `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`). AVD `PoleChamp_Tablet` ma naturalny poziom: `user_rotation` 0 to poziom, a `setOrientation` Maestro liczy rotacje jak dla naturalnego pionu.

CI: `.github/workflows/mobile-e2e.yml` – nocny przebieg na emulatorze Androida (tablet + telefon) i iOS (runner macOS lub Maestro Cloud) na buildzie `preview`; artefakty: wideo, zrzuty (`reports/maestro`), `adb logcat` / `simctl` przy porażce. Workflow jest wyłączony, dopóki nie ustawi się zmiennej repozytorium `E2E_ENABLED=true` i sekretów (EAS, API staging).
