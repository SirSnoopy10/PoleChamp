# Chaos na staging – {data} (IMP-462)

Obciążenie w tle: `tools/k6/run.sh staging smoke` (scenariusz `tablets`). Arkusze liczone przed i po (`GET /v1/entries/{id}/score-sheets` dla startów z k6 lub zapytanie do bazy).

| TC | Eksperyment (`tools/chaos/run.sh …`) | Oczekiwane | Arkusze przed / po / duplikaty | Czas odtworzenia | Wynik |
|---|---|---|---|---|---|
| TC-SYNC-019 | `valkey` | limity fail-open, push przyjmowany, realtime wraca, tablety odpytują | | | |
| TC-REL-003 | `ecs-task` | `RETRY`/ponowienia bez duplikatów, ALB do zdrowego zadania | | | |
| TC-REL-004 | `rds-failover` | przerwa ≤ 2 min, brak utraty danych | | | |
| TC-REL-005 | `deploy-ws` | ponowne połączenia z losowym opóźnieniem, brak burzy (> 50% w 1 s), pull po połączeniu | | | |

Lokalnie (Testcontainers) automatycznie: TC-SYNC-019 i TC-REL-003 – `apps/api/test/integration/resilience.test.ts`.

Defekty: {…}
