# ADR-003: Styl API – REST/JSON (OpenAPI 3.1) + Socket.IO jako kanał powiadomień

- **Status:** Zaakceptowana – potwierdzona przez Tech Leada 23.10.2026 (uwagi wdrożeniowe na końcu)
- **Data:** 2026-10-23
- **Powiązane:** [03-api.md](../03-api.md), [06-offline-i-synchronizacja.md](../06-offline-i-synchronizacja.md)

## Kontekst
- Ekrany organizatora to proste zasoby (lista, szczegóły, formularze w bottom sheetach) z akcjami zmiany statusu.
- Tablet działa offline i wysyła komendy z kolejki – potrzebna idempotencja i jasne kody odrzuceń.
- Organizator chce widzieć postęp i ranking „na żywo” (≤ 2 s), a tablety muszą szybko dowiedzieć się o blokadzie kategorii.
- W przyszłości: publiczny widok wyników (web) i ewentualni partnerzy (import list startowych).

## Decyzja
1. **REST/JSON** pod `/v1`, kontrakt **OpenAPI 3.1** generowany ze schematów zod; błędy **RFC 9457** z polem `code`; `ETag`/`If-Match` dla edycji; `Idempotency-Key` dla `POST`.
2. **Synchronizacja tabletu** przez dedykowane endpointy: `GET /sync/snapshot`, `GET /sync/changes?since=` (kursor z `change_log`), `POST /sync/push` (paczka mutacji z wynikiem per mutacja).
3. **Realtime: Socket.IO 4**, tylko transport WebSocket, adapter Redis, pokoje per turniej. Zdarzenia to **sygnały unieważnienia** z minimalnym ładunkiem – dane pobierane są zawsze przez REST. Fallback: odpytywanie (15 s organizator, 30 s tablet).

## Rozważane alternatywy
| Opcja | Za | Przeciw | Werdykt |
|---|---|---|---|
| **GraphQL** (+ subskrypcje) | Elastyczne zapytania, jeden endpoint, subskrypcje | Nadmiarowy przy prostych ekranach; cache offline i idempotentne mutacje trudniejsze; złożoność autoryzacji pól; subskrypcje i tak wymagają WS | Odrzucona |
| **tRPC** | Typy end-to-end bez generacji | Silne sprzężenie z serwerem TS, brak publicznego kontraktu dla przyszłego webu i partnerów, słabsze narzędzia HTTP (cache, WAF per ścieżka) | Odrzucona |
| **gRPC** | Wydajność, kontrakty | Słabe wsparcie w RN, niepotrzebne przy małych ładunkach | Odrzucona |
| **Server-Sent Events** zamiast WS | Prostsze po stronie serwera | Jednokierunkowe, w RN wymaga polyfilli, gorsza obsługa wznawiania przez proxy | Odrzucona |
| **Zarządzany WebSocket (API Gateway WS / AppSync)** | Brak utrzymania serwera WS | Dodatkowy dostawca i model programowania, trudniejsze testy lokalne | Odrzucona |
| **Pełne dane w zdarzeniach WS** | Mniej zapytań | Ryzyko rozjazdu stanu, problem uprawnień (np. oceny tylko dla autora), trudne wersjonowanie | Odrzucona – zdarzenia tylko jako sygnały |

## Konsekwencje
- ➕ Prosty, przewidywalny kontrakt. Generowany klient TS. Łatwe testy kontraktowe.
- ➕ Komendy offline mapują się 1:1 na mutacje `sync/push` z idempotencją.
- ➖ Więcej zapytań przy odświeżaniu (zdarzenie → REST) – akceptowalne przy skali (≤ 30 sędziów, 1 organizator na turniej).
- ⚠ Ryzyko: sieci hal blokujące WSS – fallback na odpytywanie jest obowiązkowy (NFR-303).

## Weryfikacja Tech Leada (23.10.2026)

- Socket.IO 4.8 z transportem wyłącznie `websocket` nie wymaga sticky sessions (dokumentacja Socket.IO „Using multiple nodes”). Adapter Redis (`@socket.io/redis-adapter` 8.3) działa z ElastiCache Valkey (protokół zgodny z Redis).
- ALB: domyślny idle timeout 60 s, zakres 1–4000 s – ustawiamy 300 s; `pingInterval` Socket.IO 25 s < 300 s, więc połączenia bezczynne nie są zrywane. Przy wdrożeniu (deregistration delay 30 s) połączenia są zamykane, a klient łączy się ponownie z losowym opóźnieniem 0,5–5 s (ochrona przed „burzą” połączeń – IMP-505).
- Klient RN: `auth` jako funkcja zwracająca świeży token przy każdym (ponownym) połączeniu; po powrocie aplikacji na pierwszy plan zawsze `pull`/odświeżenie REST, bo iOS zamyka gniazda aplikacji w tle. Weryfikacja w spike'u IMP-604.
- Endpoint `PUT /v1/score-sheets/{id}` usunięty z MVP (TL-43) – jedna ścieżka zapisu ocen: outbox → `sync/push`.
