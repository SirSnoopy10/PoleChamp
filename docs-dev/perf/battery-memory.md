# Bateria i pamięć tabletu (IMP-503)

TC: [TC-PERF-014](../../docs/03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-014) (RSS ≤ 300 MB, wzrost < 10% w ostatnich 30 min), [TC-PERF-015](../../docs/03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-015) (≤ 12% baterii na godzinę) · NFR-704, NFR-705.

## Przegląd źródeł zużycia (kod)

| Źródło | Stan | Zmiana w IMP-503 |
|---|---|---|
| Keep-awake | tylko `JudgeCategoryScreen` (SCR-JDG-04/05 – kolejka i formularz) oraz arkusz parowania organizatora | bez zmian |
| Timer `SyncEngine` (heartbeat + push/pull co 30 s) | zatrzymywany w tle (`AppState` `background`), wznawiany z `pull`/`push` po powrocie | bez zmian |
| WebSocket (`data/realtime/socket.ts`) | w tle połączenie trwało (ping co 25 s – wybudzenia radia na Androidzie), po 20 s bez WS przełączenie na odpytywanie | **rozłączenie w tle bez odpytywania**, po powrocie `connect` + jeden resync |
| Odpytywanie zastępcze | tylko bez WS (org 15 s / tablet 30 s) | w tle nie startuje |
| Licznik bezczynności sędziego | sprawdzenie co 60 s, zapis aktywności do SQLite najwyżej co `ACTIVITY_PERSIST_MS` | bez zmian |
| Animacje | splash (Skia, `requestAnimationFrame`) odmontowywany po starcie; `Skeleton`, `PinDots` – `withRepeat` tylko na widocznych ekranach | bez zmian |
| Formularz oceny | autozapis szkicu co 300 ms (debounce), suwak na wątku UI (IMP-500) | bez zmian |

Testy: `src/data/realtime/__tests__/realtime.test.ts` (TC-PERF-015 – tło bez WS i bez odpytywania), `src/features/scoring/__tests__/memory.test.tsx` (TC-PERF-014 – 200 kolejnych formularzy: subskrypcje `AppState`, autozapis i `syncEvents` zwalniane; `syncEvents.listenerCount()`).

## Procedura pomiaru (do wykonania – brak urządzeń)

Build `preview`, FX-MAX (`/__e2e/seed/FX-SEED` na staging lub lokalne API), jasność 50%, Wi-Fi, bateria 100% i odłączona ładowarka.

**Galaxy Tab A8 (Android):**
1. `adb shell dumpsys batterystats --reset`
2. Pętla oceniania: `maestro test apps/mobile/e2e/maestro/judge/13-submit.yaml` co 3 min przez 2 h (keep-awake aktywny na ekranie kategorii).
3. Równolegle: `node tools/e2e/src/device-metrics.ts <serial> 120` – próbki `dumpsys meminfo` / `dumpsys battery` co 30 s; wynik `assessRun`: `memoryMbMax`, `memoryGrowthLast30Pct`, `batteryPctPerHour`, `memoryPass`, `batteryPass`.
4. `adb bugreport bugreport.zip` → Battery Historian (wybudzenia, radio, CPU per wątek).

**iPad 9 (iOS):** Xcode Instruments – Energy Log (2 h, ten sam przepływ) i Allocations / Memory Graph co 15 min (wycieki po 200 zatwierdzeniach – „Leaks”).

## Wyniki (szablon)

| Urządzenie | Build | Czas | RSS maks. | Wzrost (ostatnie 30 min) | Bateria %/h | Wybudzenia/h | Wynik |
|---|---|---|---|---|---|---|---|
| Galaxy Tab A8 – przed | {sha} | 2 h | {…} | {…} | {…} | {…} | {…} |
| Galaxy Tab A8 – po | {sha} | 2 h | {…} | {…} | {…} | {…} | {…} |
| iPad 9 – po | {sha} | 2 h | {…} | {…} | {…} | – | {…} |
