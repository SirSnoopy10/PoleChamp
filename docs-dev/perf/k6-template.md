# Raport k6 – {data} – profil {1x | 2x} (IMP-461)

Środowisko: staging (konfiguracja produkcyjna), wersja API {sha}, zadania ECS API {n}, baza {klasa}.
Skrypt: `tools/k6/load.js`, profil `PROFILE={…}` (`tools/k6/lib.js`). TC: TC-PERF-002, TC-PERF-011 (1x), TC-PERF-012 (2x), TC-PERF-013 (skalowanie 2 → 4 zadania w trakcie), TC-SYNC-013.

| Metryka | Próg | p50 | p95 | p99 | Wynik |
|---|---|---|---|---|---|
| `http_req_duration{kind:read}` | p95 ≤ 300 ms | | | | |
| `http_req_duration{kind:write}` | p95 ≤ 500 ms | | | | |
| `http_req_failed` | < 0,1% (1x) / < 1% (2x) | | | | |
| `ws_subscribed` / docelowe | 3 000 (1x) / 6 000 (2x) | | | | |
| CPU zadań API (CloudWatch) | < 70% | | | | |
| Połączenia bazy | | | | | |

Porównanie z poprzednim wydaniem: {…}. Uwagi i defekty: {…}.
