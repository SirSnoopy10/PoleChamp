# Wdrożenia z połączeniami WebSocket (IMP-505)

TC: [TC-REL-005](../../docs/03-test-plans/05-testy-niefunkcjonalne.md#tc-rel-005) · NFR-803, ADR-003.

## Kolejność zamykania zadania API (SIGTERM)

1. `ready` → 503 (`Readiness.shuttingDown`) – ALB przestaje kierować nowe żądania i połączenia.
2. Oczekiwanie `SHUTDOWN_DELAY_MS` – w ECS równe `deregistration_delay = 30` s target group (IMP-012, Terraform – niezrobiony; ustawić `SHUTDOWN_DELAY_MS=30000` w definicji zadania, `stopTimeout` ≥ 45 s).
3. `RealtimeGateway.drain()` – `server.restarting` do połączeń **tego** zadania (`nsp.local`, nie przez adapter Valkey), rozłączanie paczkami po 50 co 1 s (500 połączeń ≈ 10 s).
4. `app.close()`, `process.exit(0)`.

## Klient (`apps/mobile/src/data/realtime/socket.ts`)

- Backoff: pierwsza próba losowo 0,5–5 s (`reconnectionDelay` 2 750 ms ± 81,8%), kolejne podwajane do 10 s.
- Każde ponowne połączenie (i koniec odpytywania) → `onResync`: tablet `engine.pull()` (`sync/changes` od kursora), organizator – unieważnienie zapytań. Zdarzenia z przerwy nie giną: źródłem prawdy jest `change_log`, WS to tylko podpowiedź.
- `server.restarting` → stan „WS niepołączony” od razu (bez czekania na rozłączenie).
- W tle WS rozłączany bez przełączania na odpytywanie (IMP-503).

## Testy

- `apps/api/test/integration/realtime.test.ts` – TC-REL-005: dwie instancje z adapterem, ≥ 121 połączeń na wygaszanej; wszystkie dostają `server.restarting`, rozłączenia w ≥ 3 paczkach, instancja B bez zmian, zmiana z przerwy w `sync/changes`, ponowne połączenie do B.
- `apps/mobile/src/data/realtime/__tests__/realtime.test.ts` – resync po ponownym połączeniu, zakres backoffu, tło bez odpytywania.

## Staging (do wykonania – brak AWS)

`k6 run -e API_URL=… -e PROFILE=smoke tools/k6/ws.js` z 50 połączeniami, w trakcie `aws ecs update-service --force-new-deployment`. Mierzyć: połączenia/s na nowych zadaniach (oczekiwane rozłożenie ≥ 5 s, bez szczytu > 50/s), `ws_connections`, liczba `domain_event` opublikowanych vs odebranych przez klientów k6 (różnica pokryta `sync/changes`).

| Metryka | Wynik |
|---|---|
| Szczyt nowych połączeń/s | {…} |
| Czas do ponownego połączenia wszystkich (p95) | {…} |
| Zdarzenia opublikowane / odebrane przez WS / dociągnięte pullem | {…} |
| Błędy 5xx w trakcie wdrożenia | {…} |
