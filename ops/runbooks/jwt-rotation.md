# Runbook – rotacja kluczy podpisu JWT (ES256)

> IMP-405 · 05-bezpieczenstwo §7 · NFR-401 · TC-SEC-024. Właściciel: DevOps. Częstotliwość: co **90 dni**
> (przypomnienie w kalendarzu zespołu) i natychmiast po podejrzeniu wycieku klucza.

## Model

Sekret Secrets Manager `jwt-signing` (JSON, IMP-014):

| Pole | Rola | Kto używa |
|---|---|---|
| `active` `{kid, privateJwk, createdAt}` | podpisuje i weryfikuje | API |
| `next` `{kid, privateJwk, createdAt}` | tylko weryfikuje (opublikowany przed przełączeniem) | API |
| `previous` `{kid, publicJwk, retireAfter}` | tylko weryfikuje do wygaszenia | API |

Tokeny niosą `kid`; API (`apps/api/src/modules/auth/jwt.service.ts`) akceptuje każdy z trzech kluczy.
Refresh token organizatora jest nieprzezroczysty (nie JWT) – rotacja nie wylogowuje. Najdłużej żyjący JWT to
token sędziego (12 h), więc 30 dni dla `previous` to duży zapas.

Narzędzie: `tools/security/src/jwt-rotation.ts` (działa na pliku – nie łączy się z AWS).

## Kroki

1. **Pobierz sekret** (konto z rolą `ops-secrets`, region eu-central-1):
   `aws secretsmanager get-secret-value --secret-id jwt-signing --query SecretString --output text > /tmp/jwt.json`
2. **publish-next:** `node tools/security/src/jwt-rotation.ts publish-next --file /tmp/jwt.json`,
   potem `aws secretsmanager put-secret-value --secret-id jwt-signing --secret-string file:///tmp/jwt.json`.
3. **Wdróż** API i worker (`aws ecs update-service --force-new-deployment`), poczekaj na zakończenie
   wdrożenia kroczącego – wszystkie zadania znają `next`.
4. **promote:** `node tools/security/src/jwt-rotation.ts promote --file /tmp/jwt.json` → `put-secret-value` → wdrożenie.
   Nowe tokeny mają nowy `kid`; stare są ważne (klucz w `previous`, `retireAfter` = +30 dni).
5. **Sprawdź:** w CloudWatch Logs Insights brak wzrostu 401
   (`fields @timestamp | filter status = 401 | stats count() by bin(5m)`), tablet testowy i organizator działają.
6. Usuń `/tmp/jwt.json` (`shred -u`).
7. **retire po 30 dniach:** `node tools/security/src/jwt-rotation.ts retire --file /tmp/jwt.json` (przed terminem
   odmowa; `--force` tylko przy wycieku klucza – wtedy wszyscy logują się ponownie) → `put-secret-value` → wdrożenie.

## Alarm wieku klucza

Zadanie nocne wykonuje `node tools/security/src/jwt-rotation.ts age --file <sekret>` i publikuje metrykę
`jwt_active_key_age_days` (EMF). Alarm CloudWatch: wartość > **100 dni** → kanał zespołu. Kod wyjścia 2 oznacza
przekroczenie także bez CloudWatch.

## Wyciek klucza

`publish-next` → natychmiast `promote` → `retire --force` (bez okresu przejściowego), unieważnienie rodzin
refresh tokenów nie jest potrzebne (nie są JWT), tablety pobiorą nowy token urządzenia sekretem.

## Ćwiczenie na staging (TC-SEC-024)

Status: **niewykonane** – brak konta AWS. Automatyczna część: `apps/api/test/unit/jwt-rotation.test.ts`
(fazy przed/po przełączeniu i wdrożenie kroczące) i `tools/security/test/jwt-rotation.test.ts`.
