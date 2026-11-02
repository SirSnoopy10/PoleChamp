# Testy obciążeniowe k6 (IMP-461)

k6 2.3 (binarium spoza npm – instalacja: `winget install k6` / `brew install k6` / obraz `grafana/k6`). Skrypty nie mają zależności npm.

| Plik | Zawartość |
|---|---|
| `load.js` | scenariusze `organizer`, `tablets`, `realtime`, progi NFR-102, `setup()` z przygotowaniem danych |
| `lib.js` | profile `smoke` / `1x` / `2x`, przygotowanie turniejów przez API E2E (`/__e2e/seed/FX-SEED`), mutacje |
| `organizer.js` | lista, szczegóły, wyniki, eksport PDF (2% iteracji) |
| `tablets.js` | `sync/push` (ocena lub poprawka z `baseRevision`), `sync/changes`, heartbeat co 30 s |
| `ws.js` | Socket.IO v4 przez `k6/experimental/websockets`: `/rt` z tokenem, `subscribe`, ping/pong |
| `run.sh` | `local` (k6 z maszyny) albo `staging` (zadanie ECS Fargate – wartości zastępcze) |

Profile: `1x` – 100 trwających turniejów, 3 000 WS, 50 ocen/s, 60 min (TC-PERF-011); `2x` – 200 / 6 000 / 100 ocen/s, 30 min (TC-PERF-012); TC-PERF-013 – w trakcie `1x` zwiększ liczbę zadań ECS API 2 → 4; TC-SYNC-013 – scenariusz `tablets` (wielu sędziów i tabletów naraz).

Wymagania: API z `E2E_HELPERS=1` (staging-e2e), Valkey i worker eksportów. Raport: `docs-dev/perf/k6-<data>.md` wg `docs-dev/perf/k6-template.md`.

Stan: profil `smoke` uruchamiany lokalnie (`docs-dev/perf/k6-2026-11-02.md`); staging (AWS) – bez przebiegu.
