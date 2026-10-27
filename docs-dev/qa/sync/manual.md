# TC-SYNC – procedury ręczne i mapa pokrycia (IMP-458, IMP-469)

Wyniki dołącza się do raportu przed wydaniem (`docs-dev/qa/release-report.md`). Narzędzia: `tools/e2e/src/net.ts` (sieć: `offline`/`online` przez adb, `lossy 30`/`blockWs`/`unblockWs` przez toxiproxy), `tools/e2e/src/kill-loop.ts` (pętla kill -9), przepływy `apps/mobile/e2e/maestro/sync/*`, dane z `POST /__e2e/seed/FX-SEED`.

Po każdym scenariuszu: `GET /v1/entries/{id}/score-sheets` (liczba arkuszy, brak duplikatów) i `GET /v1/tournaments/{id}/rejected-submissions` (oczekiwane odrzucenia).

## Mapa pokrycia

| TC | Automat | Uwagi |
|---|---|---|
| TC-SYNC-001 | `sync/001-network-loss.yaml`; Jest `push.test.ts` | |
| TC-SYNC-002 | `sync/002-long-offline.yaml`; Jest `push.test.ts` | wariant 2 h – ręcznie (P-02) |
| TC-SYNC-003 | Jest `push.test.ts` (`failAfter`) | na urządzeniu – `net.ts offline` w trakcie paczki |
| TC-SYNC-004 | `sync/004-kill-submit.yaml` × `kill-loop.ts` (100×); Jest `push.test.ts` | |
| TC-SYNC-005 | jak 004 (zabicie w trakcie IN_FLIGHT); Jest `push.test.ts` | |
| TC-SYNC-006 | – | ręcznie (P-06) |
| TC-SYNC-007 | `sync/007-lock-offline.yaml`; Jest `rejection.test.ts`; API `rejected.test.ts` | |
| TC-SYNC-008 | Jest `rejection.test.ts`; API `rejected.test.ts`; `org/27-rejected.yaml` | |
| TC-SYNC-009 | `sync/009-withdraw-offline.yaml`; Jest `rejection.test.ts` | |
| TC-SYNC-010 | `sync/010-deactivate-offline.yaml`; Jest `rejection.test.ts` | |
| TC-SYNC-011 | `sync/011-pin-reset-offline.yaml`; Jest `rejection.test.ts` | |
| TC-SYNC-012 | `sync/012-stale-revision.yaml`; Jest | |
| TC-SYNC-013 | `sync/013-many-judges.yaml` | |
| TC-SYNC-014 | – | ręcznie (P-14) |
| TC-SYNC-015 | – | ręcznie (P-14); reguła okna 24 h i cofnięcia zegara w testach EP-08 (`offlinePolicy`) bez ID przypadku |
| TC-SYNC-016 | Jest `pull.test.ts` | |
| TC-SYNC-017 | Jest `rejection.test.ts` | |
| TC-SYNC-018 | `sync/020-lossy.yaml` z `net.ts blockWs`; Jest `realtime.test.ts` | |
| TC-SYNC-019 | Jest `realtime.test.ts` | ręcznie na staging (P-19) |
| TC-SYNC-020 | `sync/020-lossy.yaml` z `net.ts lossy 30` | |
| TC-SYNC-021 | `sync/021-toggle-batch.yaml`; Jest `push.test.ts` | |
| TC-SYNC-022 | Jest `push.test.ts` (300 mutacji) | pomiar ≤ 30 s na Tab A8 – IMP-463 |
| TC-SYNC-023 | – | ręcznie (P-23), IMP-463 |
| TC-SYNC-024 | `sync/024-heartbeat.yaml`, `org/31-devices.yaml`; Jest | |
| TC-SYNC-025 | `org/26-lock.yaml` (ostrzeżenie przed blokadą) | tablet offline z kolejką – ręcznie (P-25) |
| TC-SYNC-026 | – | ręcznie (P-26); kolejność blokada → push – do testu API przy IMP-462 |
| TC-SYNC-027 | Jest `realtime.test.ts` | |
| TC-SYNC-028 | Jest `scoring.test.tsx` | |
| TC-SYNC-029 | Jest `pull.test.ts` | |
| TC-SYNC-030 | `sync/030-revoke-offline.yaml`; Jest `device.test.tsx` | |
| TC-SYNC-031 | Jest `push.test.ts` | |
| TC-SYNC-032 | Jest `push.test.ts` | |
| TC-SYNC-033 | – | ręcznie (P-33) – wymaga EAS Update |
| TC-SYNC-034 | Jest `update.test.tsx` | |
| TC-SYNC-035 | `sync/035-pin-report.yaml` | |
| TC-SYNC-036 | Jest `snapshot.test.ts` (FX-MAX) | pomiar ≤ 2 s na Tab A8 – IMP-463 |
| TC-SYNC-037 | Jest `device.test.tsx` | |
| TC-SYNC-038 | Jest `pull.test.ts` | |
| TC-SYNC-039 | API `results.test.ts` | |
| TC-SYNC-040 | Jest `LocalDb.test.ts` | na urządzeniu `adb shell run-as` (P-40) |

## Procedury ręczne

**P-02 – 2 h offline (TC-SYNC-002).** Tablet FX-TABLET-JA, tryb samolotowy, 40 ocen w c3–c5 w ciągu 2 h (lub zegar urządzenia +2 h po 40 ocenach). Włącz sieć. Oczekiwane: komplet arkuszy w API w ≤ 30 s, brak duplikatów.

**P-06 – twarde wyłączenie (TC-SYNC-006).** Zatwierdź ocenę i w ciągu 1 s przytrzymaj przycisk zasilania (wymuszone wyłączenie) albo rozładuj baterię do zera. Po włączeniu i logowaniu: ocena w kolejce lub wysłana, szkic zachowany.

**P-14 – zegar ±24 h i cofnięcie (TC-SYNC-014, 015).** Android: `adb shell su 0 date <MMDDhhmmYYYY.ss>` (emulator z rootem), iOS – urządzenie fizyczne, ręczna zmiana daty. +24 h: oceny przyjęte, `CLOCK_SKEW` w audycie; cofnięcie zegara o 1 h przy logowaniu offline → „Połącz tablet z internetem, aby się zalogować.”.

**P-19 – awaria Valkey (TC-SYNC-019).** Staging e2e: zatrzymaj kontener/węzeł Valkey na 2 min w trakcie oceniania. Oczekiwane: oceny przyjmowane (limity fail-open), realtime wraca po wznowieniu, tablet przechodzi na odpytywanie.

**P-23 – 12 h offline (TC-SYNC-023).** Galaxy Tab A8, pełna bateria, tryb samolotowy, ekran oceniania aktywny 12 h (keep-awake), 300 ocen. Mierz: zużycie baterii, rozmiar bazy (< 5 MB – NFR-301), czas wysyłki po włączeniu sieci.

**P-25 – ostrzeżenie przed blokadą przy tablecie offline (TC-SYNC-025).** Tablet z 3 ocenami w kolejce offline; organizator „Zakończ i zablokuj” → arkusz z „Tablet stół 1 – 3 niewysłane oceny”.

**P-26 – blokada przed odpowiedzią push (TC-SYNC-026).** Toxiproxy z opóźnieniem 3 s na `/v1/sync/push`; zatwierdź ocenę i w tym czasie zablokuj kategorię u organizatora. Oczekiwane: ocena przyjęta albo odrzucona `CATEGORY_LOCKED` – nigdy oba stany; baner na tablecie zgodny z wynikiem.

**P-33 – OTA z niepustym outboxem (TC-SYNC-033).** Wymaga projektu EAS: `eas update --channel e2e` w trakcie, gdy tablet ma 2 oceny w kolejce offline. Po restarcie z nową wersją: oceny w kolejce, wysłane po sieci.

**P-40 – brak danych innych sędziów (TC-SYNC-040).** `adb shell run-as app.polechamp sqlite3 files/SQLite/polechamp.db "select judge_id, count(*) from score_sheet group by judge_id"` – tylko zalogowany sędzia.
