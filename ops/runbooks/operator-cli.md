# Narzędzia operatora (CLI)

> IMP-178 · TL-38, TL-40 · NFR-507 · 05-bezpieczenstwo §3.3

Rzadkie operacje bez panelu administracyjnego. Każda operacja zapisuje audyt z `actor_type = SYSTEM`
i `actor_id` = stały UUID wyliczony z `--operator` (ten sam operator → ten sam identyfikator); nazwa
operatora jest też w `after.operator`.

## Kto i jak

- Uruchamia osoba z rolą operatora AWS (zatwierdzenie środowiska `staging`/`production` w GitHub Environments).
- `--operator` = login SSO operatora – **zawsze wymagany**.
- Produkcja: druga osoba potwierdza zgłoszenie (ticket) przed uruchomieniem `person:export`, `retention:run`
  i `review-tournament:create`.
- Uruchomienie: `tools/scripts/run-cli.sh <env> <polecenie> [opcje] --operator <login>` (jednorazowe zadanie
  ECS); wynik (JSON) w CloudWatch Logs `/ecs/polechamp-<env>-cli`.
- Lokalnie: `pnpm --filter @polechamp/api build`, potem `node --env-file=apps/api/.env apps/api/dist/cli.js …`.

## Polecenia

| Polecenie | Opis | Wynik |
|---|---|---|
| `migrate` | Role, migracje SQL, uprawnienia (`MIGRATION_DATABASE_URL`, `PC_APP_PASSWORD`, `PC_RETENTION_PASSWORD`) | lista migracji |
| `review-tournament:create --owner-email <e-mail>` | Turniej do przeglądu App Store / Google Play na koncie recenzenta: fikcyjne zawodniczki, 2 sędziów, kod parowania **30 dni** (TL-40) | `pairingCode`, PIN-y sędziów – wpisać w notatki dla recenzenta |
| `tournament:offline-login <tournamentId> --disable\|--enable` | Wyłączenie / włączenie logowania sędziów PIN-em offline (np. po wycieku PIN-ów) | nowa wartość; tablety dostają zmianę przez `sync/changes` |
| `account:unlock <e-mail>` | Zdjęcie blokady logowania (licznik, `locked_until`, poziom) | `userId` |
| `person:export --email <e-mail>` | Dane konta organizatora i lista turniejów (RODO art. 15/20) | link S3 ważny **24 h** |
| `person:export --athlete-id <id>` | Dane zawodniczki ze wszystkich turniejów tego organizatora (dopasowanie po imieniu i nazwisku) ze startami i ocenami | link S3 ważny **24 h** |
| `retention:run [--dry-run]` | Zadanie retencji poza harmonogramem (domyślnie codziennie 3:00 w workerze); `--dry-run` tylko liczy | raport liczby rekordów |

## Po operacji

- Turniej do przeglądu: po decyzji sklepu unieważnij kod (usuń turniej z konta recenzenta).
- Eksport osoby: link przekaż wnioskodawcy bezpiecznym kanałem; obiekt wygasa z regułą cyklu życia bucketu (7 dni).
- Sprawdź wpis audytu: `GET /v1/tournaments/{id}/audit-log` (operacje turnieju) albo zapytanie `pc_readonly`
  na `audit_log` po `actor_id`.
