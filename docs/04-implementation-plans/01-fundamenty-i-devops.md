# EP-01 – Fundamenty i DevOps

> Dokument: `04-implementation-plans/01-fundamenty-i-devops.md` · Tech Lead (Agent 2) · 23.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md)

Repozytorium, jakość kodu, pipeline CI/CD, infrastruktura AWS w Terraform (eu-central-1, [ADR-007](../01-architecture/adr/ADR-007-hosting-aws-eu.md)), środowiska i obserwowalność. Zadania IMP-001…006 są pierwsze w projekcie i blokują pozostałe; infrastruktura (IMP-007…015) może iść równolegle z pakietami współdzielonymi. Polityka zamrożenia wydań w dni zawodów – IMP-017 (TL-37).

Kolejność: IMP-001 → IMP-002/003 → IMP-004…006; IMP-007 → IMP-008 → IMP-009/010 → IMP-011 → IMP-015/016 → IMP-017/019/020.

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 29 | 178 h | BE 16 · MOB 15 · FULL 6 · DEVOPS 141 |


## Zadania

### IMP-001 – Monorepo: pnpm workspaces + Turborepo + bazowa konfiguracja TS
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Po sklonowaniu repozytorium `pnpm install && pnpm build` buduje wszystkie aplikacje i pakiety, a pakiety importują się wzajemnie przez `workspace:*`.
- **Zakres:** `pnpm-workspace.yaml`, `turbo.json` (zadania build, lint, typecheck, test, test:int), `tsconfig.base.json` (TS 6.0, strict, `moduleResolution: bundler`), szkielety `apps/api`, `apps/mobile`, `packages/{scoring,contracts,tokens,i18n,test-fixtures}`, `infra/terraform`, `ops/`, `tools/`; `.nvmrc` (Node 26), `packageManager` (pnpm 12); **Poza zakresem:** Kod aplikacji, CI
- **Zależności:** brak
- **Odwołania:** ADR-011, ADR-002
- **Kroki:**
  1. Utwórz katalogi `apps/api`, `apps/mobile`, `packages/{scoring,contracts,tokens,i18n,test-fixtures}`, `infra/terraform`, `ops/`, `tools/` wg [00 §5](00-konwencje-i-definition-of-done.md#5-struktura-monorepo); w każdym pakiecie `package.json` z nazwą `@polechamp/<nazwa>` i polem `exports`.
  2. Dodaj `pnpm-workspace.yaml` (`apps/*`, `packages/*`, `tools/*`), `.nvmrc` = `26` i `packageManager: "pnpm@12.x"` w root `package.json`; `engines.node >= 26`.
  3. Utwórz `tsconfig.base.json` (TS 6.0, `strict`, `noUncheckedIndexedAccess`, `moduleResolution: "bundler"`, `verbatimModuleSyntax`) i `tsconfig.json` per pakiet z `references` do zależności.
  4. Skonfiguruj `turbo.json`: zadania `build` (`dependsOn: ["^build"]`, `outputs: ["dist/**"]`), `lint`, `typecheck`, `test`, `test:int` (bez cache), `dev` (`persistent`).
  5. Dodaj skrypty root `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck` delegujące do `turbo run`.
  6. Dodaj w każdym pakiecie plik `src/index.ts` z eksportem kontrolnym i test kompilacji importu `@polechamp/scoring` z `apps/api`.
  7. Napisz `apps/api/README.md` i `apps/mobile/README.md` (wymagania, uruchomienie lokalne, zmienne środowiskowe).
  8. Otwórz PR `IMP-001: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] `pnpm install && pnpm build` przechodzi na czystym klonie (Windows, macOS, Linux CI)
  - [ ] Pakiety importują się wzajemnie przez `workspace:*`
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-002 – Lint, formatowanie i hooki git
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Commit z literałem tekstu w JSX, surowym kolorem w ekranie lub importem platformowym w `@polechamp/scoring` jest zatrzymywany lokalnie i w CI.
- **Zakres:** ESLint 9 (flat config): `typescript-eslint`, `eslint-plugin-react-native-a11y`, `eslint-plugin-i18next` (`no-literal-string` dla `apps/mobile`), `no-restricted-imports` (pakiet `scoring` bez importów platformowych), reguła zakazu surowych kolorów/px w `features/**` (port `_adherence.oxlintrc.json`); Prettier; lefthook (pre-commit lint-staged, commit-msg commitlint); **Poza zakresem:** Reguły domenowe – w zadaniach pakietów
- **Zależności:** [IMP-001](#imp-001--monorepo-pnpm-workspaces--turborepo--bazowa-konfiguracja-ts)
- **Odwołania:** NFR-601, NFR-208, ADR-011, [TC-I18N-005](../03-test-plans/01-testy-jednostkowe.md#tc-i18n-005), [TC-TOKENS-003](../03-test-plans/01-testy-jednostkowe.md#tc-tokens-003)
- **Kroki:**
  1. Utwórz `eslint.config.mjs` (flat config ESLint 9) z blokami per obszar: `apps/api/**` (typescript-eslint strict), `apps/mobile/**` (+ `eslint-plugin-react-native-a11y`, `eslint-plugin-i18next` z regułą `no-literal-string` dla `src/features/**`), `packages/scoring/**` (`no-restricted-imports`: `node:*`, `react-native`, `expo-*`).
  2. Napisz regułę `polechamp/no-raw-style-values` w `tools/eslint-rules/no-raw-style-values.ts`: zgłasza literały hex/rgb i liczby w stylach (poza 0 i 1) w `src/features/**`, port `design/_adherence.oxlintrc.json`.
  3. Dodaj testy reguły (`RuleTester`) z przypadkami: `color: '#fff'`, `padding: 13`, `<Text>Zapisz</Text>` – błąd; tokeny z `@polechamp/tokens` – brak błędu.
  4. Dodaj Prettier (`.prettierrc`: `printWidth 110`, `singleQuote`) i `.editorconfig` (LF, UTF-8, 2 spacje).
  5. Skonfiguruj lefthook: `pre-commit` → lint-staged (`eslint --fix`, `prettier --write` dla zmienionych plików), `commit-msg` → commitlint z `@commitlint/config-conventional`.
  6. Dodaj skrypt `pnpm lint` wywołujący `eslint . --max-warnings 0` przez turbo.
  7. Dopisz lub uruchom przypadki TC-I18N-005, TC-TOKENS-003 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-002: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] `pnpm lint` przechodzi; przykładowe naruszenia (literał w JSX, `#fff` w ekranie) są wykrywane w teście reguł
  - [ ] TC-I18N-005 i TC-TOKENS-003 uruchamiane w CI
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-003 – CI na PR (GitHub Actions)
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Każdy PR do `main` jest automatycznie sprawdzany (lint, typy, testy z progami pokrycia, sekrety, podatności) w czasie poniżej 15 minut, a niezielony PR nie może zostać scalony.
- **Zakres:** Workflow `pr.yml`: cache pnpm/turbo, `lint`, `typecheck`, testy jednostkowe (Vitest, Jest) z pokryciem i progami, gitleaks, `pnpm audit --prod` (high/critical blokuje), komentarz z pokryciem; wymagane statusy na `main`; **Poza zakresem:** Testy integracyjne (IMP-004), E2E (IMP-454)
- **Zależności:** [IMP-001](#imp-001--monorepo-pnpm-workspaces--turborepo--bazowa-konfiguracja-ts), [IMP-002](#imp-002--lint-formatowanie-i-hooki-git)
- **Odwołania:** NFR-903, NFR-406, NFR-407, [TC-CI-001](../03-test-plans/00-strategia-testowania.md#tc-ci-001), [TC-SEC-004](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-004), [TC-SEC-005](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-005)
- **Kroki:**
  1. Utwórz `.github/workflows/pr.yml`: `actions/setup-node` (Node 26), `pnpm/action-setup` (pnpm 12), cache `~/.pnpm-store` i `.turbo` kluczowane `pnpm-lock.yaml`.
  2. Dodaj joby `lint`, `typecheck`, `unit` uruchamiające `turbo run <zadanie> --filter=...[origin/main]` (tylko pakiety dotknięte zmianą i zależne).
  3. Ustaw progi pokrycia: `packages/scoring/vitest.config.ts` (100% gałęzi), `apps/api/vitest.config.ts` (80% linii), `apps/mobile/jest.config.js` (`coverageThreshold` 70% dla `src/domain/**`, `src/data/**`).
  4. Dodaj krok `gitleaks/gitleaks-action` z `.gitleaks.toml` i plikiem baseline oraz krok `pnpm audit --prod --audit-level high` (high/critical blokuje).
  5. Dodaj komentarz z podsumowaniem pokrycia (`davelosert/vitest-coverage-report-action` + raport Jest).
  6. Włącz ochronę gałęzi `main`: wymagane statusy `lint`, `typecheck`, `unit`, `secrets`, `audit`, 1 review, zakaz force-push.
  7. Dopisz lub uruchom przypadki TC-CI-001, TC-SEC-004, TC-SEC-005 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-003: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] PR z błędem lint/typecheck/testu lub sekretem jest blokowany
  - [ ] Czas pipeline ≤ 15 min p90
  - [ ] TC-CI-001 skonfigurowany
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-004 – CI: testy integracyjne z Testcontainers
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** PR dotykający API, kontraktów lub scoringu uruchamia testy integracyjne na prawdziwym PostgreSQL 18, Valkey i MinIO, a wynik widać jako raport JUnit.
- **Zakres:** Job `integration` (Ubuntu runner z Dockerem), obrazy `postgres:18`, `valkey/valkey:8`, MinIO; równoległość per plik testowy; artefakty logów; **Poza zakresem:** Harness testów (IMP-451)
- **Zależności:** [IMP-003](#imp-003--ci-na-pr-github-actions)
- **Odwołania:** NFR-903, ADR-002
- **Kroki:**
  1. Dodaj job `integration` w `pr.yml` z filtrem ścieżek (`dorny/paths-filter`: `apps/api/**`, `packages/contracts/**`, `packages/scoring/**`) na runnerze `ubuntu-latest` z Dockerem.
  2. Uruchom `pnpm --filter @polechamp/api test:int` (Vitest z Testcontainers: `postgres:18`, `valkey/valkey:8`, `minio/minio`), `--pool=forks` z równoległością per plik testowy.
  3. Dodaj cache obrazów Docker (`docker save`/`load` z kluczem wersji obrazów) skracający start kontenerów.
  4. Publikuj raport JUnit (`reporters: ['junit']` → `reports/int.xml`) przez `dorny/test-reporter` i artefakt logów kontenerów przy porażce.
  5. Dodaj status `integration` do wymaganych na `main` po pierwszym zielonym przebiegu.
  6. Otwórz PR `IMP-004: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Job przechodzi z przykładowym testem z IMP-451
  - [ ] Czas ≤ 10 min
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-005 – Obraz Docker API/worker
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Jeden obraz Docker uruchamia API, worker albo polecenie CLI, działa jako użytkownik nie-root i ma w sobie fonty PDF oraz listę haseł.
- **Zakres:** Dockerfile wieloetapowy (Node 26 slim, `pnpm deploy --prod`), użytkownik nie-root, `HEALTHCHECK`, `UV_THREADPOOL_SIZE=8`, statyczne fonty Inter i lista haseł top-100k w obrazie; **Poza zakresem:** Infrastruktura ECS
- **Zależności:** [IMP-001](#imp-001--monorepo-pnpm-workspaces--turborepo--bazowa-konfiguracja-ts), [IMP-100](03-backend-konto-i-konfiguracja-turnieju.md#imp-100--szkielet-api-nestjs-12-fastify)
- **Odwołania:** ADR-002, ADR-007, ADR-009, [TC-SEC-005](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-005)
- **Kroki:**
  1. Napisz `apps/api/Dockerfile` wieloetapowy: etap `build` (`pnpm fetch`, `pnpm install --offline`, `turbo run build --filter=@polechamp/api...`), etap `deploy` (`pnpm deploy --prod /out`), etap `runtime` na `node:26-slim`.
  2. W etapie `runtime` dodaj użytkownika `app` (UID 10001), `USER app`, `ENV UV_THREADPOOL_SIZE=8 NODE_ENV=production`, `HEALTHCHECK` na `GET /health/live`.
  3. Skopiuj statyczne fonty Inter 4.1 (`assets/fonts/Inter-*.ttf`) i listę `assets/passwords/top-100k.txt` do obrazu.
  4. Zdefiniuj punkty wejścia: `node dist/main.js` (domyślny), `node dist/worker.js`, `node dist/cli.js <polecenie>`; dodaj `.dockerignore` (`node_modules`, `.turbo`, `test`, `.env*`).
  5. Dodaj krok CI budowania obrazu i skanu Trivy (`aquasecurity/trivy-action`, `severity: HIGH,CRITICAL`, `exit-code: 1`).
  6. Dopisz lub uruchom przypadki TC-SEC-005 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-005: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Obraz ≤ 300 MB
  - [ ] Trivy bez podatności high/critical
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-006 – Środowisko lokalne (Docker Compose) i seed
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** BE
- **Cel:** Programista uruchamia cały backend lokalnie (`docker compose up` + `pnpm dev:api`) i dostaje bazę z danymi prototypu.
- **Zakres:** `docker-compose.yml`: PostgreSQL 18, Valkey, MinIO, Mailpit; skrypty `pnpm dev:api`, `pnpm db:migrate`, `pnpm db:seed` (seed prototypu z `@polechamp/test-fixtures`); **Poza zakresem:** Seed danych (IMP-450)
- **Zależności:** [IMP-001](#imp-001--monorepo-pnpm-workspaces--turborepo--bazowa-konfiguracja-ts), [IMP-103](03-backend-konto-i-konfiguracja-turnieju.md#imp-103--baza-drizzle-migracje-transakcje-z-kontekstem)
- **Odwołania:** 01-przeglad §6
- **Kroki:**
  1. Napisz `docker-compose.yml`: `postgres:18` (wolumen, `healthcheck pg_isready`), `valkey/valkey:8`, `minio/minio` (+ job tworzący bucket `exports`), `axllent/mailpit` (SMTP 1025, UI 8025).
  2. Dodaj `apps/api/.env.example` z wartościami testowymi (`DATABASE_URL`, `VALKEY_URL`, `S3_ENDPOINT`, `SMTP_URL`, ścieżki do kluczy JWT dev).
  3. Dodaj skrypty `pnpm dev:api` (Nest watch), `pnpm db:migrate` (`drizzle-kit migrate`), `pnpm db:seed` (CLI `seed:dev` korzystające z `@polechamp/test-fixtures`).
  4. Dodaj skrypt `tools/scripts/dev-keys.ts` generujący lokalne pary kluczy ES256 i klucz HMAC do `.secrets/` (w `.gitignore`).
  5. Opisz w `apps/api/README.md` kolejność uruchomienia, porty i dostęp do Mailpit/MinIO.
  6. Otwórz PR `IMP-006: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Nowy programista uruchamia API w ≤ 15 min wg README
  - [ ] Seed tworzy t1–t4 z danymi z 03-analiza-designu §8
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-007 – Terraform: bootstrap kont i stanu
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Trzy konta AWS (dev, staging, production) mają wspólny, zaszyfrowany stan Terraform, a GitHub Actions wdraża do nich bez stałych kluczy dostępu.
- **Zakres:** AWS Organizations (konta dev, staging, production), rola OIDC dla GitHub Actions, bucket S3 stanu z wersjonowaniem i szyfrowaniem + DynamoDB lock, tagi kosztowe, AWS Budgets z alarmami; **Poza zakresem:** Zasoby aplikacyjne (IMP-008…015)
- **Zależności:** [IMP-001](#imp-001--monorepo-pnpm-workspaces--turborepo--bazowa-konfiguracja-ts)
- **Odwołania:** ADR-007, NFR-501
- **Kroki:**
  1. Utwórz `infra/terraform/bootstrap` (jednorazowe): AWS Organizations z kontami `dev`, `staging`, `production`, SCP blokujące regiony poza `eu-central-1`/`eu-west-1`.
  2. Dodaj bucket S3 stanu (wersjonowanie, SSE-KMS, blokada publicznego dostępu) i tabelę DynamoDB `terraform-locks`; skonfiguruj backend `s3` w `infra/terraform/envs/*/backend.tf`.
  3. Napisz moduł `modules/github-oidc`: dostawca OIDC `token.actions.githubusercontent.com`, role `gha-deploy-<env>` z warunkiem `sub = repo:<org>/polechamp:environment:<env>` i najmniejszymi uprawnieniami.
  4. Ustaw domyślne tagi dostawcy (`project=polechamp`, `env`, `owner`) i aktywuj je jako tagi alokacji kosztów.
  5. Dodaj AWS Budgets: dev 120 USD, staging 200 USD, production 500 USD/mies. z powiadomieniami 80% i 100% do SNS `ops-alerts`.
  6. Udokumentuj procedurę bootstrapu w `infra/terraform/bootstrap/README.md`.
  7. Otwórz PR `IMP-007: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] `terraform plan` bez zmian po apply
  - [ ] CI wykonuje plan dla PR w `infra/` bez kluczy statycznych
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-008 – Terraform: sieć VPC
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Baza i cache są dostępne tylko z prywatnych podsieci, a ruch do usług AWS nie wychodzi przez internet.
- **Zakres:** Moduł `network` (terraform-aws-modules/vpc): 2 AZ, podsieci publiczne/prywatne/bazodanowe, NAT (1 w dev/staging, 2 w prod), VPC endpoints (S3 gateway, ECR, CloudWatch Logs, Secrets Manager), Flow Logs; **Poza zakresem:** –
- **Zależności:** [IMP-007](#imp-007--terraform-bootstrap-kont-i-stanu)
- **Odwołania:** ADR-007, 05-bez §7
- **Kroki:**
  1. Napisz moduł `modules/network` na `terraform-aws-modules/vpc`: 2 AZ, podsieci publiczne (ALB, NAT), prywatne (ECS), bazodanowe (RDS, Valkey).
  2. Ustaw NAT Gateway: 1 w dev/staging, 2 w production (`single_nat_gateway` per środowisko w `envs/*/terraform.tfvars`).
  3. Dodaj VPC endpoints: S3 (gateway), ECR API/DKR, CloudWatch Logs, Secrets Manager (interface) z SG dopuszczającym ruch z podsieci prywatnych.
  4. Zdefiniuj security groups: `alb` (443 z internetu), `api` (port aplikacji tylko z `alb`), `rds` (5432 tylko z `api`/`worker`), `valkey` (6379 tylko z `api`/`worker`).
  5. Włącz VPC Flow Logs do CloudWatch (retencja 30 dni) i wyprowadź outputy (`vpc_id`, `private_subnet_ids`, `db_subnet_group`).
  6. Otwórz PR `IMP-008: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Plan/apply na dev; RDS i Valkey nieosiągalne z internetu (test z zewnątrz)
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-009 – Terraform: RDS PostgreSQL 18 i role bazy
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Działa zarządzany PostgreSQL 18 z PITR, kopiami w drugim regionie i rolami SQL, w których aplikacja nie może zmienić ani usunąć wpisów audytu.
- **Zakres:** RDS PostgreSQL 18 (prod Multi-AZ db.t4g.medium, staging/dev single-AZ t4g.small/micro), KMS, PITR 35 dni, kopia snapshotów do eu-west-1, parameter group (`rds.force_ssl=1`, `log_min_duration_statement=500`), Performance Insights; role SQL: `pc_migrator` (DDL), `pc_app` (DML bez UPDATE/DELETE na audycie), `pc_retention`, `pc_readonly`; **Poza zakresem:** Migracje (IMP-103…107)
- **Zależności:** [IMP-008](#imp-008--terraform-sieć-vpc)
- **Odwołania:** ADR-002, ADR-007, INT-08, NFR-305, TL-16, [TC-INT-008](../03-test-plans/02-testy-integracyjne-api.md#tc-int-008)
- **Kroki:**
  1. Napisz moduł `modules/database`: RDS PostgreSQL 18 (prod Multi-AZ `db.t4g.medium`, staging `t4g.small`, dev `t4g.micro`), szyfrowanie KMS, `backup_retention_period = 35`, Performance Insights.
  2. Dodaj parameter group: `rds.force_ssl=1`, `log_min_duration_statement=500`, `shared_preload_libraries=pg_stat_statements`.
  3. Skonfiguruj kopiowanie automatycznych snapshotów do `eu-west-1` (`aws_db_instance_automated_backups_replication`).
  4. Napisz `infra/sql/roles.sql`: role `pc_migrator` (DDL), `pc_app` (DML; `INSERT, SELECT` na `audit_log`, bez `UPDATE/DELETE`), `pc_retention` (DELETE/UPDATE tylko w tabelach retencji), `pc_readonly`.
  5. Uruchamiaj `roles.sql` jako pierwszy krok migratora (idempotentnie, `DO $ … IF NOT EXISTS`) i nadawaj `DEFAULT PRIVILEGES` dla nowych tabel.
  6. Zapisz hasła ról w Secrets Manager z rotacją 90 dni (Lambda rotacji RDS) i wyprowadź ARN-y dla task definitions.
  7. Dopisz lub uruchom przypadki TC-INT-008 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-009: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Połączenie TLS wymagane
  - [ ] Role zgodne z TC-INT-008
  - [ ] Snapshot kopiowany do eu-west-1
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** średnie

### IMP-010 – Terraform: ElastiCache Valkey
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Socket.IO, BullMQ i limity zapytań mają szyfrowany Valkey, który nie usuwa kluczy kolejek przy braku pamięci.
- **Zakres:** Valkey 8 (prod: węzeł + replika, staging/dev: 1 węzeł), TLS w tranzycie, AUTH token, parameter group (`maxmemory-policy noeviction` dla kolejek); **Poza zakresem:** –
- **Zależności:** [IMP-008](#imp-008--terraform-sieć-vpc)
- **Odwołania:** ADR-007, NFR-307
- **Kroki:**
  1. Napisz moduł `modules/cache`: ElastiCache Valkey 8 (prod: węzeł główny + replika z automatycznym failoverem, dev/staging: 1 węzeł `cache.t4g.micro`).
  2. Włącz `transit_encryption_enabled` i `auth_token` z Secrets Manager (sekret `polechamp/<env>/valkey-auth`).
  3. Dodaj parameter group z `maxmemory-policy noeviction` (wymóg BullMQ) i alarm CloudWatch `DatabaseMemoryUsagePercentage > 80%`.
  4. Wyprowadź outputy `valkey_endpoint` i ARN sekretu dla task definitions `api` i `worker`.
  5. Otwórz PR `IMP-010: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] API łączy się po TLS z dev
  - [ ] Alarm pamięci > 75%
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-011 – Terraform: ECS Fargate, ALB, DNS, certyfikaty
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Usługi `api` i `worker` działają na ECS Fargate za ALB z HTTPS i WebSocket pod `api.polechamp.app`, skalują się z obciążeniem i nie zrywają połączeń przy wdrożeniu.
- **Zakres:** Klaster ECS, usługi `api` (2–6 zadań ARM64, 0,5 vCPU/1 GB, autoscaling CPU 60%) i `worker` (1–2 zadania), ALB HTTPS (ACM, TLS 1.2+ polityka `ELBSecurityPolicy-TLS13-1-2-2021-06`), idle timeout 300 s, deregistration delay 30 s, health check `/health/ready`, Route 53 (`api.polechamp.app`), logi do CloudWatch (30 dni); **Poza zakresem:** Pipeline wdrożeń (IMP-016)
- **Zależności:** [IMP-008](#imp-008--terraform-sieć-vpc), [IMP-009](#imp-009--terraform-rds-postgresql-18-i-role-bazy), [IMP-010](#imp-010--terraform-elasticache-valkey), [IMP-005](#imp-005--obraz-docker-apiworker)
- **Odwołania:** ADR-007, ADR-003, NFR-402, NFR-803, [TC-SEC-003](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-003)
- **Kroki:**
  1. Napisz moduł `modules/compute`: klaster ECS, task definitions `api` i `worker` (ARM64, 0,5 vCPU / 1 GB, sekrety z Secrets Manager przez `secrets`, logi `awslogs` z retencją 30 dni).
  2. Skonfiguruj usługę `api` (2–6 zadań, autoscaling target tracking CPU 60%) i `worker` (1–2 zadania, skalowanie po głębokości kolejki BullMQ z metryki EMF).
  3. Dodaj ALB: listener 443 (ACM, polityka `ELBSecurityPolicy-TLS13-1-2-2021-06`), przekierowanie 80→443, `idle_timeout = 300`, target group z `deregistration_delay = 30` i health checkiem `/health/ready`.
  4. Dodaj reguły listenera: `/v1/*` i `/rt/*` (WebSocket, sticky nie jest wymagane dzięki adapterowi Redis) oraz `/health/*`.
  5. Utwórz rekord Route 53 `api.polechamp.app` (alias do ALB) i certyfikat ACM z walidacją DNS.
  6. Dodaj alarmy: `UnHealthyHostCount > 0` (5 min), `HTTPCode_Target_5XX_Count`, `RunningTaskCount < desired` → SNS `ops-alerts`.
  7. Dopisz lub uruchom przypadki TC-SEC-003 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-011: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] `wss://api-dev.polechamp.app/rt` działa przez ALB (test z IMP-604)
  - [ ] SSL Labs ≥ A na staging (TC-SEC-003)
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 12 h (L) | **Ryzyko:** średnie

### IMP-012 – Terraform: S3 (eksporty, strona statyczna) i CloudFront
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** PDF-y trafiają do prywatnego bucketu i wygasają po 7 dniach, a dokumenty prawne i plik `.well-known` są serwowane z `polechamp.app`.
- **Zakres:** Bucket `exports` (SSE-KMS, lifecycle 7 dni, blokada publicznego dostępu), bucket `site` + CloudFront z OAC dla `polechamp.app` (dokumenty prawne, strona usunięcia konta, `.well-known`), nagłówki bezpieczeństwa; **Poza zakresem:** Treść stron (IMP-179)
- **Zależności:** [IMP-007](#imp-007--terraform-bootstrap-kont-i-stanu)
- **Odwołania:** ADR-009, TL-39, NFR-501, [TC-RODO-005](../03-test-plans/02-testy-integracyjne-api.md#tc-rodo-005)
- **Kroki:**
  1. Napisz moduł `modules/storage`: bucket `polechamp-<env>-exports` (SSE-KMS, `block_public_access`, lifecycle: wygaśnięcie obiektów `exports/` po 7 dniach, wersjonowanie wyłączone).
  2. Dodaj politykę IAM dla roli zadania `worker` (`s3:PutObject`) i `api` (`s3:GetObject` do podpisywania URL) ograniczoną do prefiksu `exports/`.
  3. Napisz moduł `modules/static-site`: bucket `site`, CloudFront z OAC, certyfikat ACM w `us-east-1`, domena `polechamp.app`.
  4. Dodaj CloudFront Response Headers Policy: HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP dla stron statycznych.
  5. Ustaw `Content-Type: application/json` dla `/.well-known/apple-app-site-association` i `/.well-known/assetlinks.json` (zachowanie CloudFront bez kompresji przekierowań).
  6. Dopisz lub uruchom przypadki TC-RODO-005 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-012: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Obiekt PDF wygasa po 7 dniach (reguła lifecycle zweryfikowana)
  - [ ] `https://polechamp.app/.well-known/apple-app-site-association` serwowany z `application/json`
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-013 – Terraform: SES (domena, DKIM, DMARC) i wyjście z sandboxa
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** E-maile z kodem weryfikacyjnym i linkiem resetu wychodzą z domeny produktu przez SES w eu-central-1, z poprawnym DKIM i DMARC oraz obsługą odbić.
- **Zakres:** Tożsamość domeny, DKIM, SPF, DMARC (`p=quarantine`), MAIL FROM, configuration set z SNS dla bounce/complaint, wniosek o dostęp produkcyjny (formularz AWS – czas oczekiwania do 48 h); **Poza zakresem:** Szablony e-maili (IMP-119)
- **Zależności:** [IMP-007](#imp-007--terraform-bootstrap-kont-i-stanu)
- **Odwołania:** FR-102, FR-104, NFR-501, [TC-REL-008](../03-test-plans/05-testy-niefunkcjonalne.md#tc-rel-008)
- **Kroki:**
  1. Napisz moduł `modules/email`: tożsamość domeny `polechamp.app` w SES, Easy DKIM (3 rekordy CNAME w Route 53), SPF `include:amazonses.com`, DMARC `p=quarantine; rua=mailto:dmarc@polechamp.app`.
  2. Skonfiguruj domenę MAIL FROM `mail.polechamp.app` (MX + SPF) dla zgodności SPF.
  3. Dodaj configuration set `transactional` z event destination SNS dla `Bounce` i `Complaint` (subskrypcja kolejki SQS czytanej przez worker – oznaczanie adresów).
  4. Złóż wniosek o dostęp produkcyjny SES (opis: tylko e-maile transakcyjne, procedura odbić) i zanotuj czas oczekiwania (do 48 h) w planie wydania.
  5. Wyprowadź `ses_configuration_set` i adres nadawcy `no-reply@polechamp.app` jako zmienne dla API/worker.
  6. Dopisz lub uruchom przypadki TC-REL-008 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-013: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] E-mail testowy z dev dociera do Gmail/Outlook bez spamu (mail-tester ≥ 9/10)
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-014 – Terraform: Secrets Manager, KMS, IAM ról zadań
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Klucze JWT, klucz HMAC PIN-ów i hasła są przechowywane w Secrets Manager i KMS, a każde zadanie ECS ma dostęp tylko do potrzebnych sekretów.
- **Zakres:** Sekrety: klucze JWT ES256 (aktywny + poprzedni, `kid`), klucz HMAC `pin_fingerprint`, hasła bazy, token Valkey, DSN Sentry; klucze KMS (RDS, S3, sekrety); role zadań ECS `api`, `worker` (S3, SES, Secrets – tylko potrzebne ARN); **Poza zakresem:** Procedura rotacji (IMP-405)
- **Zależności:** [IMP-007](#imp-007--terraform-bootstrap-kont-i-stanu)
- **Odwołania:** NFR-406, 05-bez §7, TL-06, [TC-SEC-004](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-004)
- **Kroki:**
  1. Napisz moduł `modules/secrets`: sekrety `jwt-signing` (JSON `{ active: {kid, privateJwk}, previous: {kid, publicJwk} }`), `pin-fingerprint-hmac`, `db-app`, `db-migrator`, `valkey-auth`, `sentry-dsn`.
  2. Utwórz klucze KMS per przeznaczenie (`rds`, `s3-exports`, `secrets`) z polityką ograniczoną do ról zadań i roli wdrożeniowej.
  3. Zdefiniuj role zadań ECS: `api` (odczyt sekretów JWT/HMAC/DB/Valkey, `s3:GetObject` exports, `ses:SendEmail` nie – tylko worker), `worker` (S3 Put, SES, odczyt DB/Valkey).
  4. Napisz `tools/scripts/gen-es256.ts` generujący parę kluczy ES256 z `kid` (UUIDv7) w formacie JWK do załadowania przez `aws secretsmanager put-secret-value`.
  5. Dodaj test `terraform validate` + `tflint` z regułą zakazu `"*"` w `Resource` polityk ról zadań.
  6. Dopisz lub uruchom przypadki TC-SEC-004 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-014: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Brak sekretów w zmiennych środowiskowych task definition (tylko referencje)
  - [ ] Polityki przeszły IAM Access Analyzer bez ostrzeżeń
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-015 – Terraform: WAF, GuardDuty, CloudTrail
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Ruch do API przechodzi przez WAF z limitami dla logowania i parowania, a podejrzana aktywność na kontach AWS generuje alarm.
- **Zakres:** AWS WAF na ALB (AWSManagedRulesCommonRuleSet, KnownBadInputs, limit 2 000 żądań / 5 min / IP, osobna reguła dla `/v1/auth/*` i `/v1/devices/pair`), GuardDuty, CloudTrail (organizacyjny), alarmy do SNS; **Poza zakresem:** –
- **Zależności:** [IMP-011](#imp-011--terraform-ecs-fargate-alb-dns-certyfikaty)
- **Odwołania:** 05-bez §7, NFR-405, [TC-SEC-013](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-013)
- **Kroki:**
  1. Napisz moduł `modules/security-baseline`: Web ACL na ALB z `AWSManagedRulesCommonRuleSet` i `AWSManagedRulesKnownBadInputsRuleSet`.
  2. Dodaj reguły rate-based: 2 000 żądań / 5 min / IP globalnie oraz osobne, niższe limity dla `/v1/auth/*` i `/v1/devices/pair` (akcja `Block` z odpowiedzią 429).
  3. Włącz GuardDuty we wszystkich kontach i organizacyjny CloudTrail (bucket z blokadą obiektów, walidacja plików logów).
  4. Dodaj reguły EventBridge: znaleziska GuardDuty o ważności ≥ 7 i zmiany Web ACL → SNS `ops-alerts`.
  5. Przetestuj na staging: zablokuj testowe IP w IP set i potwierdź odpowiedź 403 oraz wpis w logach WAF.
  6. Dopisz lub uruchom przypadki TC-SEC-013 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-015: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Zalew 3 000 żądań/5 min z IP blokowany na staging (TC-SEC-013)
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-016 – CD: build → ECR → migracje → wdrożenie
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Scalenie do `main` wdraża backend na dev, tag `v*` na staging, a produkcja wymaga zatwierdzenia; migracje uruchamiają się przed wdrożeniem, a rollback jest jednym poleceniem.
- **Zakres:** Workflow `deploy.yml`: build obrazu (tag = SHA), push do ECR, migracje jako jednorazowe zadanie ECS (`cli migrate` rolą `pc_migrator`), wdrożenie `dev` z `main`, `staging` z tagu `v*`, `production` po zatwierdzeniu środowiska; rollback do poprzedniej rewizji; smoke test po wdrożeniu; **Poza zakresem:** Okna zamrożenia (IMP-017)
- **Zależności:** [IMP-011](#imp-011--terraform-ecs-fargate-alb-dns-certyfikaty), [IMP-003](#imp-003--ci-na-pr-github-actions), [IMP-103](03-backend-konto-i-konfiguracja-turnieju.md#imp-103--baza-drizzle-migracje-transakcje-z-kontekstem)
- **Odwołania:** ADR-007, NFR-904
- **Kroki:**
  1. Utwórz `.github/workflows/deploy.yml`: build obrazu z tagiem SHA, push do ECR (rola OIDC `gha-deploy-<env>`), środowiska GitHub `dev`, `staging`, `production` (production z wymaganym zatwierdzeniem).
  2. Dodaj krok migracji: `aws ecs run-task` z poleceniem `node dist/cli.js migrate` w roli `pc_migrator`, oczekiwanie na kod wyjścia 0 przed aktualizacją usługi.
  3. Dodaj wdrożenie `aws ecs update-service --force-new-deployment` z `deployment_circuit_breaker { enable = true, rollback = true }` i oczekiwaniem na `services-stable`.
  4. Napisz `tools/scripts/deploy-smoke.sh`: `GET /health/ready`, logowanie kontem syntetycznym, `GET /v1/app-config`, `GET /v1/tournaments` – porażka uruchamia rollback do poprzedniej rewizji task definition.
  5. Napisz `ops/runbooks/rollback.md` (rollback aplikacji, migracje wyłącznie wstecznie zgodne, kiedy nie cofać schematu).
  6. Otwórz PR `IMP-016: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Wdrożenie dev ≤ 10 min od merge
  - [ ] Rollback przećwiczony na staging
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** średnie

### IMP-017 – Okna zamrożenia wydań (freeze-guard)
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** W oknach zawodów zapisanych w `ops/freeze-windows.yaml` wdrożenie produkcyjne i OTA są blokowane, a hotfix wymaga etykiety i zatwierdzenia.
- **Zakres:** Plik `ops/freeze-windows.yaml` (od, do, turniej, dyżurny), schemat i walidacja w CI, krok `freeze-guard` w `deploy.yml` (production) i w workflow EAS Update (kanał production); obejście: etykieta `hotfix-approved` + zatwierdzenie środowiska; **Poza zakresem:** –
- **Zależności:** [IMP-016](#imp-016--cd-build--ecr--migracje--wdrożenie), [IMP-023](#imp-023--ci-mobile-buildy-eas-i-publikacja-aktualizacji)
- **Odwołania:** NFR-905, TL-37, [TC-REL-010](../03-test-plans/05-testy-niefunkcjonalne.md#tc-rel-010)
- **Kroki:**
  1. Zdefiniuj format `ops/freeze-windows.yaml` (`from`, `to` w ISO 8601 z strefą, `tournament`, `onCall`) i schemat zod w `tools/scripts/freeze-schema.ts`.
  2. Napisz `tools/scripts/freeze-guard.ts`: kończy się kodem 1, gdy bieżący czas mieści się w oknie, chyba że PR ma etykietę `hotfix-approved`.
  3. Dodaj krok `freeze-guard` w `deploy.yml` (środowisko production) i w workflow EAS Update (kanał `production`).
  4. Dodaj walidację pliku w `pr.yml` (schemat, brak nakładających się okien, daty w przyszłości).
  5. Napisz `ops/runbooks/freeze.md`: kto dopisuje okna, procedura hotfixu w trakcie zawodów, kontakt dyżurnego.
  6. Dopisz lub uruchom przypadki TC-REL-010 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-017: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-REL-010 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-018 – Logowanie strukturalne i korelacja żądań
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** BE
- **Cel:** Każdy log API jest w formacie JSON z `requestId` i nie zawiera nazwisk, e-maili, komentarzy, PIN-ów, haseł ani tokenów.
- **Zakres:** pino 10 (nestjs-pino), `requestId` z nagłówka `X-Request-Id` lub generowany, ścieżki redakcji (`fullName`, `club`, `email`, `comment`, `pin`, `password`, tokeny), poziomy per środowisko, retencja grup logów 30 dni; **Poza zakresem:** Sentry (IMP-021)
- **Zależności:** [IMP-100](03-backend-konto-i-konfiguracja-turnieju.md#imp-100--szkielet-api-nestjs-12-fastify)
- **Odwołania:** NFR-901, NFR-504, [TC-API-107](../03-test-plans/02-testy-integracyjne-api.md#tc-api-107), [TC-SEC-017](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-017)
- **Kroki:**
  1. Dodaj `nestjs-pino` (pino 10) w `apps/api/src/common/logging/logging.module.ts` z poziomem z `LOG_LEVEL` (dev `debug`, prod `info`).
  2. Ustaw `genReqId`: wartość z nagłówka `X-Request-Id` (walidacja UUID) albo nowy UUIDv7; zwracaj ją w nagłówku odpowiedzi.
  3. Skonfiguruj `redact.paths`: `*.fullName`, `*.club`, `*.email`, `*.comment`, `*.pin`, `*.password`, `*.newPassword`, `req.headers.authorization`, `*.refreshToken`, `*.deviceSecret`, `*.pinPepper` (`censor: '[REDACTED]'`).
  4. Dodaj serializery `req`/`res` bez treści żądania i `customProps` z `tournamentId`, `deviceId`, `actorType` (bez danych osobowych).
  5. Napisz test jednostkowy `logging.redact.spec.ts` logujący obiekt ze wszystkimi polami PII i sprawdzający brak wartości w wyjściu.
  6. Dopisz lub uruchom przypadki TC-API-107, TC-SEC-017 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-018: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-107 i część TC-SEC-017 (logi API) przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-019 – Metryki, ślady, dashboard i alarmy
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Dyżurny widzi w jednym dashboardzie latencję, błędy 5xx, odrzucenia mutacji, połączenia WS, kolejkę PDF i zaległe oceny tabletów, a przekroczenia progów wysyłają alarm.
- **Zakres:** OpenTelemetry (auto-instrumentacja HTTP, pg, ioredis) → X-Ray przez ADOT collector (sidecar); metryki EMF: p95 latencji, 5xx, odrzucenia mutacji per kod, suma `pending_mutations` z heartbeat, liczba połączeń WS, opóźnienie publikatora zdarzeń, czas generowania PDF; dashboard CloudWatch; alarmy (5xx > 1% / 5 min, publikator > 30 s, kolejka PDF > 20) → SNS → e-mail/SMS dyżurnego; **Poza zakresem:** –
- **Zależności:** [IMP-011](#imp-011--terraform-ecs-fargate-alb-dns-certyfikaty), [IMP-018](#imp-018--logowanie-strukturalne-i-korelacja-żądań)
- **Odwołania:** NFR-902, [TC-REL-009](../03-test-plans/05-testy-niefunkcjonalne.md#tc-rel-009)
- **Kroki:**
  1. Dodaj `apps/api/src/common/metrics/otel.ts`: OpenTelemetry SDK z auto-instrumentacją HTTP, `pg`, `ioredis`; eksport OTLP do sidecara ADOT w task definition (`aws-otel-collector`) → X-Ray.
  2. Napisz `MetricsService` emitujący metryki EMF: `http_latency_ms` (p95), `http_5xx`, `sync_rejected{code}`, `pending_mutations_sum` (z heartbeat), `ws_connections`, `event_publisher_lag_s`, `pdf_render_ms`, `pdf_queue_depth`.
  3. Utwórz w Terraform `aws_cloudwatch_dashboard` „PoleChamp – dzień zawodów” z widżetami dla powyższych metryk i logów błędów.
  4. Dodaj alarmy: 5xx > 1% przez 5 min, `event_publisher_lag_s > 30`, `pdf_queue_depth > 20`, `pending_mutations_sum` rośnie przez 10 min → SNS → e-mail/SMS dyżurnego.
  5. Sprawdź na staging, że wymuszony błąd 5xx i wstrzymany publikator wywołują alarmy.
  6. Dopisz lub uruchom przypadki TC-REL-009 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-019: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-REL-009 przechodzi na staging
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** średnie

### IMP-020 – CloudWatch Synthetics – kanarek API
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Dostępność API jest mierzona kanarkiem co 5 minut (co minutę w oknach zawodów), który przechodzi logowanie, listę turniejów i synchronizację urządzenia.
- **Zakres:** Kanarek co 5 min: `/health/ready`, logowanie kontem syntetycznym, `GET /tournaments`, `sync/changes` urządzeniem syntetycznym; harmonogram co 1 min w oknach z `freeze-windows.yaml` (aktualizowany przez workflow); **Poza zakresem:** –
- **Zależności:** [IMP-016](#imp-016--cd-build--ecr--migracje--wdrożenie), [IMP-017](#imp-017--okna-zamrożenia-wydań-freeze-guard)
- **Odwołania:** NFR-304, TL-36, [TC-REL-001](../03-test-plans/05-testy-niefunkcjonalne.md#tc-rel-001)
- **Kroki:**
  1. Napisz skrypt kanarka `ops/synthetics/api-canary.js` (runtime Node CloudWatch Synthetics): `GET /health/ready`, `POST /v1/auth/login` (konto syntetyczne), `GET /v1/tournaments`, `POST /v1/devices/token` + `GET /v1/sync/changes` (urządzenie syntetyczne).
  2. Pobieraj poświadczenia konta i urządzenia syntetycznego z Secrets Manager (`synthetic-org`, `synthetic-device`).
  3. Dodaj zasób `aws_synthetics_canary` (harmonogram `rate(5 minutes)`) i alarm `SuccessPercent < 100` przez 2 kolejne przebiegi.
  4. Napisz workflow `.github/workflows/canary-schedule.yml` przełączający harmonogram na `rate(1 minute)` w oknach z `ops/freeze-windows.yaml` (cron co godzinę).
  5. Opublikuj metrykę dostępności miesięcznej na dashboardzie (NFR-304).
  6. Dopisz lub uruchom przypadki TC-REL-001 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-020: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Raport dostępności miesięczny w dashboardzie (TC-REL-001)
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-021 – Sentry (region UE) – API i mobile
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** FULL
- **Cel:** Błędy API i aplikacji trafiają do Sentry w regionie UE z mapami źródeł i wersją wydania, bez danych osobowych.
- **Zakres:** Projekty `polechamp-api`, `polechamp-mobile` (organizacja w regionie UE), `beforeSend`/`beforeBreadcrumb` usuwające pola PII, wydania i source mapy (EAS Build hook + CI), próbkowanie wydajności 10%; **Poza zakresem:** Integracja w aplikacji (IMP-218)
- **Zależności:** [IMP-100](03-backend-konto-i-konfiguracja-turnieju.md#imp-100--szkielet-api-nestjs-12-fastify), [IMP-200](06-mobile-fundamenty-i-design-system.md#imp-200--inicjalizacja-aplikacji-expo-sdk-58)
- **Odwołania:** NFR-504, NFR-308, NFR-501, [TC-SEC-017](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-017), [TC-REL-006](../03-test-plans/05-testy-niefunkcjonalne.md#tc-rel-006)
- **Kroki:**
  1. Utwórz projekty `polechamp-api` i `polechamp-mobile` w organizacji Sentry w regionie UE; DSN w Secrets Manager i sekretach EAS.
  2. W `apps/api/src/common/sentry.ts` zainicjuj `@sentry/node` 11 (`release` = SHA, `environment`, `tracesSampleRate: 0.1`, `sendDefaultPii: false`).
  3. Napisz wspólną funkcję `scrubPii(event)` w `packages/contracts/src/pii.ts` (lista pól jak w redakcji pino) używaną w `beforeSend` i `beforeBreadcrumb` obu klientów.
  4. Dodaj upload map źródeł: API w `deploy.yml` (`sentry-cli sourcemaps upload`), mobile przez hook EAS Build (`@sentry/react-native/expo` plugin).
  5. Zweryfikuj: zdarzenie testowe ze znacznikiem PII w treści i breadcrumbie dociera bez tych wartości.
  6. Dopisz lub uruchom przypadki TC-SEC-017, TC-REL-006 w API (Vitest) i aplikacji (Jest/Maestro); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-021: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Zdarzenia z dev widoczne z poprawnym stosem (source maps)
  - [ ] 0 PII w próbkach
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-022 – EAS: profile, kanały, runtimeVersion, poświadczenia
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** MOB
- **Cel:** Zespół buduje dev client, wersje testowe i produkcyjne z jednego `eas.json`, a aktualizacje OTA trafiają tylko do zgodnych binarek dzięki `runtimeVersion` z odcisku.
- **Zakres:** `eas.json` (profile `development` z dev clientem, `preview` – wewnętrzna dystrybucja, `production`), kanały EAS Update `dev`/`staging`/`production`, `runtimeVersion: { policy: "fingerprint" }`, poświadczenia iOS/Android zarządzane przez EAS, identyfikatory aplikacji (`app.polechamp`); **Poza zakresem:** Konta sklepów (IMP-550)
- **Zależności:** [IMP-200](06-mobile-fundamenty-i-design-system.md#imp-200--inicjalizacja-aplikacji-expo-sdk-58)
- **Odwołania:** ADR-001, ADR-007, R-11
- **Kroki:**
  1. Utwórz projekt EAS i `apps/mobile/eas.json` z profilami `development` (`developmentClient: true`, dystrybucja wewnętrzna), `preview` (wewnętrzna, kanał `staging`), `production` (kanał `production`, `autoIncrement`).
  2. Ustaw w `app.config.ts` `runtimeVersion: { policy: "fingerprint" }`, `updates.url` projektu EAS i identyfikatory `ios.bundleIdentifier` / `android.package` = `app.polechamp`.
  3. Utwórz kanały EAS Update `dev`, `staging`, `production` powiązane z gałęziami o tych samych nazwach.
  4. Skonfiguruj poświadczenia iOS (certyfikat dystrybucyjny, profile) i Android (keystore upload) zarządzane przez EAS.
  5. Zbuduj `development` na iOS i Android i potwierdź uruchomienie dev clienta z Metro.
  6. Otwórz PR `IMP-022: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Build `preview` instaluje się na 4 urządzeniach referencyjnych
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-023 – CI mobile: buildy EAS i publikacja aktualizacji
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** MOB
- **Cel:** Co noc powstaje testowy build iOS i Android dla Maestro, scalenie do `main` publikuje OTA na staging, a OTA produkcyjne wymaga ręcznego uruchomienia i przejścia `freeze-guard`.
- **Zakres:** Workflow: nocny build `preview` (iOS/Android), build na tag `mobile-v*`, `eas update` na kanał `staging` z `main`, na `production` ręcznie z `freeze-guard`; artefakty dla Maestro; **Poza zakresem:** Uruchamianie E2E (IMP-454)
- **Zależności:** [IMP-022](#imp-022--eas-profile-kanały-runtimeversion-poświadczenia), [IMP-003](#imp-003--ci-na-pr-github-actions)
- **Odwołania:** NFR-905, ADR-007
- **Kroki:**
  1. Utwórz `.github/workflows/mobile.yml` z `expo/expo-github-action` (sekret `EXPO_TOKEN` w środowisku CI).
  2. Dodaj job nocny (`schedule`) `eas build --profile preview --platform all --non-interactive` i zapis artefaktów (`.apk`, `.app` dla symulatora) dla jobów Maestro.
  3. Dodaj job na tag `mobile-v*`: `eas build --profile production` i `eas submit` do kanałów testowych sklepów.
  4. Dodaj job `eas update --channel staging --message "$GITHUB_SHA"` po scaleniu do `main` (filtr ścieżek `apps/mobile/**`, `packages/**`).
  5. Dodaj ręczny workflow `ota-production` (`workflow_dispatch`) z krokiem `freeze-guard` i zatwierdzeniem środowiska `production`.
  6. Otwórz PR `IMP-023: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Nocny build dostępny rano dla QA
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-024 – Konfiguracja środowisk aplikacji i kontrola sekretów w bundlu
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** MOB
- **Cel:** Aplikacja w każdym kanale łączy się z właściwym API, podpowiedź PIN-ów pojawia się tylko w buildzie demo, a CI wykrywa sekrety w bundlu.
- **Zakres:** `app.config.ts` z `extra.apiUrl` per kanał (dev/staging/production), flaga `demoBuild` (podpowiedź PIN tylko w demo), skrypt CI sprawdzający bundel (`expo export` + skan wzorców sekretów); **Poza zakresem:** –
- **Zależności:** [IMP-200](06-mobile-fundamenty-i-design-system.md#imp-200--inicjalizacja-aplikacji-expo-sdk-58)
- **Odwołania:** NFR-406, NFR-410, G-17, [TC-SEC-004](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-004), [TC-SEC-018](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-018)
- **Kroki:**
  1. W `apps/mobile/app.config.ts` ustaw `extra.apiUrl` i `extra.wsUrl` per kanał (`dev`, `staging`, `production`) oraz flagę `extra.demoBuild` (tylko profil `demo`).
  2. Udostępnij konfigurację przez `src/config/env.ts` (`Constants.expoConfig.extra`) z walidacją zod przy starcie.
  3. Ogranicz zmienne `EXPO_PUBLIC_*` do wartości publicznych (URL-e, DSN Sentry) i dodaj regułę lint zabraniającą innych odwołań do `process.env`.
  4. Napisz `tools/scripts/scan-bundle.ts`: `expo export --platform all`, przeszukanie bundli wzorcami (klucze prywatne PEM, `AKIA…`, `sk_live`, JWT, wartości z `.env` nie-publicznych), kod 1 przy trafieniu.
  5. Dodaj krok `scan-bundle` do `mobile.yml` przed każdym buildem i publikacją OTA.
  6. Dopisz lub uruchom przypadki TC-SEC-004, TC-SEC-018 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-024: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SEC-004 (bundel) i TC-SEC-018 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

### IMP-025 – Kopie zapasowe: runbook i test odtworzenia
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Zespół potrafi odtworzyć bazę produkcyjną z PITR do stanu sprzed maksymalnie 5 minut w czasie poniżej godziny, co potwierdza zmierzona próba na staging.
- **Zakres:** Runbook PITR (odtworzenie do nowej instancji, przełączenie sekretu połączenia, migracja DNS nie jest potrzebna), skrypt automatyzujący, kwartalny przypomnienie w kalendarzu dyżurów; **Poza zakresem:** –
- **Zależności:** [IMP-009](#imp-009--terraform-rds-postgresql-18-i-role-bazy), [IMP-016](#imp-016--cd-build--ecr--migracje--wdrożenie)
- **Odwołania:** NFR-305, [TC-REL-002](../03-test-plans/05-testy-niefunkcjonalne.md#tc-rel-002)
- **Kroki:**
  1. Napisz `ops/runbooks/restore.md`: wybór punktu w czasie, `restore-db-instance-to-point-in-time` do nowej instancji, weryfikacja, przełączenie sekretu `db-app` na nowy endpoint, restart usług.
  2. Napisz `tools/scripts/pitr-restore.sh` automatyzujący odtworzenie, oczekiwanie na `available` i aktualizację sekretu.
  3. Dodaj zapytania weryfikacyjne po odtworzeniu (liczba arkuszy, ostatni `change_log.seq`, porównanie `final_results_hash` zablokowanych kategorii).
  4. Przeprowadź próbę na staging z pomiarem czasu (RPO z `LatestRestorableTime`, RTO od decyzji do pierwszego `200` z API) i zapisz wynik w runbooku.
  5. Dodaj kwartalne przypomnienie o próbie do kalendarza dyżurów.
  6. Dopisz lub uruchom przypadki TC-REL-002 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-025: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-REL-002 wykonany, raport z czasami
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-026 – Zarządzanie zależnościami i SBOM
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Zależności aktualizują się automatycznie w kontrolowanych grupach, a każde wydanie ma SBOM API i aplikacji.
- **Zakres:** Renovate (grupy: Expo SDK – ręcznie, `@nestjs/*`, `@aws-sdk/*`, testy; automerge patchy dev-deps), SBOM CycloneDX dla API i mobile przy wydaniu; **Poza zakresem:** –
- **Zależności:** [IMP-003](#imp-003--ci-na-pr-github-actions)
- **Odwołania:** NFR-407, [TC-SEC-005](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-005)
- **Kroki:**
  1. Dodaj `renovate.json`: grupy `@nestjs/*`, `@aws-sdk/*`, `testing` (Vitest, Jest, Maestro), `expo` (Expo SDK i pakiety `expo-*` – tylko ręcznie, `enabled: false` dla automerge).
  2. Włącz automerge patchy `devDependencies` po zielonym CI i harmonogram `before 6am on monday`.
  3. Dodaj krok SBOM w workflow wydania: `@cyclonedx/cyclonedx-npm` dla `apps/api` i `apps/mobile` → `sbom-api.json`, `sbom-mobile.json` jako artefakty wydania.
  4. Skonfiguruj Dependency Dashboard i etykiety `deps` do triage.
  5. Dopisz lub uruchom przypadki TC-SEC-005 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-026: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Dashboard Renovate aktywny; SBOM w artefaktach wydania
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

### IMP-027 – SAST (Semgrep) i DAST (ZAP) w CI
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Każdy PR przechodzi skan Semgrep, a przed wydaniem ZAP skanuje staging na podstawie OpenAPI; wyniki są dostępne jako artefakty.
- **Zakres:** Semgrep (reguły TS, Node, React Native, sekrety) na PR; ZAP baseline + API scan (OpenAPI) na staging przed każdym wydaniem; raporty jako artefakty; **Poza zakresem:** Pentest (IMP-408)
- **Zależności:** [IMP-003](#imp-003--ci-na-pr-github-actions), [IMP-016](#imp-016--cd-build--ecr--migracje--wdrożenie), [IMP-066](02-pakiety-wspoldzielone.md#imp-066--contracts-generowanie-openapi-31-i-kontrola-zmian-łamiących)
- **Odwołania:** NFR-408, [TC-SEC-006](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-006)
- **Kroki:**
  1. Utwórz `.github/workflows/security.yml` z jobem `semgrep` (`p/typescript`, `p/nodejs`, `p/react-native`, `p/secrets`) na PR, blokującym przy ważności `ERROR`.
  2. Dodaj job `zap` uruchamiany przed wydaniem (`workflow_dispatch` i tag `v*`): `zap-baseline.py` na `https://api.staging.polechamp.app` i `zap-api-scan.py` z `dist/openapi.json`.
  3. Dostarcz ZAP token organizatora konta syntetycznego staging (nagłówek `Authorization` przez `-z replacer`).
  4. Utwórz `.semgrepignore` i `ops/security/zap-rules.tsv` z wyjątkami i uzasadnieniem każdego wyjątku.
  5. Publikuj raporty SARIF (Semgrep) w zakładce Security i HTML (ZAP) jako artefakty.
  6. Dopisz lub uruchom przypadki TC-SEC-006 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-027: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SEC-006 przechodzi na staging
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** niskie

### IMP-028 – Dane staging: seed syntetyczny i turniej maksymalny
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** BE
- **Cel:** Staging ma dane prototypu, 20 syntetycznych turniejów i turniej maksymalny (60 kategorii, 1 500 startów), na których działają UAT, testy obciążenia i kanarek.
- **Zakres:** Polecenie CLI `seed:staging` (dane prototypu + 20 turniejów syntetycznych), `seed:max` (FX-MAX: 60 kategorii, 1 500 startów, 30 sędziów, 20 urządzeń), konto syntetyczne kanarka; dane fikcyjne (brak prawdziwych osób); **Poza zakresem:** –
- **Zależności:** [IMP-450](11-qa-i-automatyzacja-testow.md#imp-450--dane-testowe-port-seedu-prototypu-i-fabryki), [IMP-016](#imp-016--cd-build--ecr--migracje--wdrożenie)
- **Odwołania:** NFR-801, NFR-802, [TC-PERF-011](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-011), [TC-SYNC-036](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-036)
- **Kroki:**
  1. Napisz generator w `packages/test-fixtures/src/staging.ts`: dane prototypu + 20 turniejów z fikcyjnymi nazwiskami (deterministyczny seed `faker` pl).
  2. Napisz `packages/test-fixtures/src/max.ts` (FX-MAX): 60 kategorii, 1 500 startów, 30 sędziów z PIN-ami i weryfikatorami, 20 urządzeń.
  3. Dodaj polecenia CLI `seed:staging` i `seed:max` w `apps/api/src/cli/seed.command.ts` (odmowa uruchomienia przy `NODE_ENV=production`).
  4. Utwórz konto syntetyczne kanarka i urządzenie syntetyczne; zapisz ich poświadczenia w Secrets Manager.
  5. Uruchamiaj seed jako jednorazowe zadanie ECS z workflow `seed-staging.yml` (`workflow_dispatch`).
  6. Dopisz lub uruchom przypadki TC-PERF-011, TC-SYNC-036 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-028: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Staging ma dane do TC-PERF i TC-UAT
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-029 – Kontrola kosztów: harmonogram staging i alarmy
- **Epik / obszar:** EP-01 Fundamenty i DevOps | **Rola:** DEVOPS
- **Cel:** Staging nie działa w nocy ani poza sezonem, a dev ma zatrzymywaną bazę, dzięki czemu koszty mieszczą się w budżetach.
- **Zakres:** Skalowanie ECS staging do 0 w nocy (20:00–07:00) i poza sezonem (wyłączenie przez flagę), zatrzymywanie RDS dev na noc, alarmy Budgets; **Poza zakresem:** –
- **Zależności:** [IMP-011](#imp-011--terraform-ecs-fargate-alb-dns-certyfikaty)
- **Odwołania:** ADR-007
- **Kroki:**
  1. Dodaj EventBridge Scheduler + Application Auto Scaling: `api`/`worker` staging do 0 zadań o 20:00 i z powrotem o 07:00 (Europe/Warsaw).
  2. Dodaj harmonogram zatrzymania RDS dev o 20:00 i uruchomienia o 07:00 (Lambda `rds:StopDBInstance`/`StartDBInstance`).
  3. Dodaj zmienną `staging_offseason` (Terraform) wyłączającą staging całkowicie poza sezonem.
  4. Pomijaj wyłączenie w oknach UAT zapisanych w `ops/freeze-windows.yaml` (Lambda czyta plik z S3 publikowany przez CI).
  5. Otwórz PR `IMP-029: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Koszt staging w miesiącu próbnym ≤ 170 USD
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

