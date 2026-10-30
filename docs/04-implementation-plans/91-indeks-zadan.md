# Indeks zadań implementacyjnych

> Dokument: `04-implementation-plans/91-indeks-zadan.md` · Tech Lead · 23.10.2026 · Generowany z kart zadań. Konwencje: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Graf: [90-graf-zaleznosci.md](90-graf-zaleznosci.md)

**250 zadań, 1679 h** bez buforów (bufor ryzyka 328 h; z buforem ryzyka i narzutem 15% – 2308 h, szczegóły w [99-przekazanie-dla-pm.md](99-przekazanie-dla-pm.md)). Najmniejsze zadanie 2 h, największe 16 h (żadne nie przekracza 2 dni roboczych).

## 1. Sumy per epik

| Epik | Plik | Zadań | Godziny | Bufor ryzyka | Razem z buforem ryzyka |
|---|---|---|---|---|---|
| EP-01 Fundamenty i DevOps | [01-fundamenty-i-devops.md](01-fundamenty-i-devops.md) | 29 | 178 | 28 | 206 |
| EP-02 Pakiety współdzielone (scoring, contracts, tokens, i18n) | [02-pakiety-wspoldzielone.md](02-pakiety-wspoldzielone.md) | 21 | 127 | 15 | 142 |
| EP-03 Backend – rdzeń, konto i konfiguracja turnieju | [03-backend-konto-i-konfiguracja-turnieju.md](03-backend-konto-i-konfiguracja-turnieju.md) | 33 | 202 | 34 | 236 |
| EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | [04-backend-urzadzenia-ocenianie-synchronizacja.md](04-backend-urzadzenia-ocenianie-synchronizacja.md) | 17 | 110 | 28 | 138 |
| EP-05 Backend – eksport PDF, audyt, RODO, worker | [05-backend-eksport-audyt-rodo.md](05-backend-eksport-audyt-rodo.md) | 10 | 61 | 9 | 70 |
| EP-06 Mobile – fundamenty i design system Nocturne | [06-mobile-fundamenty-i-design-system.md](06-mobile-fundamenty-i-design-system.md) | 21 | 153 | 31 | 184 |
| EP-07 Mobile – ekrany organizatora | [07-mobile-ekrany-organizatora.md](07-mobile-ekrany-organizatora.md) | 29 | 195 | 25 | 220 |
| EP-08 Mobile – ekrany sędziego | [08-mobile-ekrany-sedziego.md](08-mobile-ekrany-sedziego.md) | 20 | 131 | 27 | 158 |
| EP-09 Mobile – offline i synchronizacja | [09-mobile-offline-i-synchronizacja.md](09-mobile-offline-i-synchronizacja.md) | 10 | 61 | 19 | 80 |
| EP-10 Bezpieczeństwo i RODO | [10-bezpieczenstwo-i-rodo.md](10-bezpieczenstwo-i-rodo.md) | 10 | 57 | 9 | 66 |
| EP-11 QA i automatyzacja testów | [11-qa-i-automatyzacja-testow.md](11-qa-i-automatyzacja-testow.md) | 20 | 194 | 54 | 248 |
| EP-12 Twardnienie NFR | [12-twardnienie-nfr.md](12-twardnienie-nfr.md) | 8 | 56 | 15 | 71 |
| EP-13 Wydanie i pilotaż | [13-wydanie.md](13-wydanie.md) | 8 | 46 | 11 | 57 |
| EP-14 Spike’i techniczne | [14-spike.md](14-spike.md) | 10 | 66 | 14 | 80 |
| EP-15 Design i akceptacje | [15-design-i-akceptacje.md](15-design-i-akceptacje.md) | 4 | 42 | 8 | 50 |
| EP-16 Poprawki UX (dodany 28.10.2026, poza sumą poniżej) | [16-poprawki-ux.md](16-poprawki-ux.md) | 19 | 133 | 36 | 169 |
| **Razem** | | **250** | **1679** | **328** | **2007** |


## 2. Sumy per rola

| Rola | Zadań | Godziny | Udział |
|---|---|---|---|
| BE | 83 | 512 | 30% |
| MOB | 104 | 682 | 41% |
| FULL | 8 | 69 | 4% |
| DEVOPS | 26 | 162 | 10% |
| QA | 25 | 218 | 13% |
| DESIGN | 4 | 36 | 2% |


## 3. Pokrycie wymagań i ekranów zadaniami

FR w MVP bez zadania: **brak**. Ekrany SCR z MVP bez zadania: **brak**.

### 3.1 FR w MVP → zadania

| FR | Zadania |
|---|---|
| FR-101 (M) | IMP-060, IMP-104, IMP-114, IMP-251 |
| FR-102 (M) | IMP-013, IMP-060, IMP-114, IMP-115, IMP-119, IMP-252 |
| FR-103 (M) | IMP-060, IMP-104, IMP-116, IMP-250 |
| FR-104 (M) | IMP-013, IMP-060, IMP-117, IMP-119, IMP-179, IMP-253 |
| FR-105 (M) | IMP-060, IMP-116, IMP-215, IMP-277 |
| FR-106 (M) | IMP-060, IMP-118, IMP-119, IMP-179, IMP-277 |
| FR-107 (M) | IMP-060, IMP-116, IMP-250 |
| FR-201 (M) | IMP-070, IMP-121, IMP-255 |
| FR-202 (M) | IMP-061, IMP-121, IMP-207, IMP-256 |
| FR-203 (S) | IMP-122, IMP-259 |
| FR-204 (S) | IMP-122, IMP-259 |
| FR-205 (M) | IMP-121, IMP-257 |
| FR-206 (M) | IMP-122, IMP-257 |
| FR-207 (M) | IMP-123, IMP-258 |
| FR-208 (M) | IMP-122, IMP-257 |
| FR-209 (M) | IMP-055, IMP-121, IMP-150, IMP-255, IMP-257 |
| FR-210 (S) | IMP-211, IMP-254, IMP-606 |
| FR-301 (M) | IMP-052, IMP-061, IMP-124, IMP-260 |
| FR-302 (M) | IMP-124, IMP-260 |
| FR-303 (S) | IMP-124, IMP-260 |
| FR-304 (M) | IMP-124, IMP-262 |
| FR-305 (M) | IMP-051, IMP-061, IMP-125, IMP-207, IMP-262, IMP-263 |
| FR-306 (M) | IMP-125, IMP-132, IMP-263 |
| FR-307 (M) | IMP-051, IMP-061, IMP-125, IMP-207, IMP-264 |
| FR-308 (M) | IMP-126, IMP-261 |
| FR-309 (M) | IMP-061, IMP-127, IMP-261, IMP-271, IMP-557 |
| FR-310 (M) | IMP-127, IMP-261 |
| FR-311 (M) | IMP-054, IMP-125 |
| FR-312 (M) | IMP-124, IMP-204, IMP-261, IMP-262 |
| FR-401 (M) | IMP-128, IMP-265 |
| FR-402 (M) | IMP-062, IMP-128, IMP-266 |
| FR-403 (S) | IMP-128, IMP-267 |
| FR-404 (S) | IMP-129, IMP-267 |
| FR-405 (M) | IMP-128, IMP-265 |
| FR-406 (S) | IMP-062, IMP-128, IMP-266 |
| FR-501 (M) | IMP-130, IMP-273 |
| FR-502 (M) | IMP-062, IMP-130, IMP-274 |
| FR-503 (M) | IMP-130, IMP-131, IMP-274 |
| FR-504 (M) | IMP-062, IMP-140, IMP-141, IMP-144, IMP-275, IMP-301, IMP-351, IMP-356 |
| FR-505 (M) | IMP-062, IMP-141, IMP-142, IMP-273, IMP-276 |
| FR-506 (M) | IMP-144, IMP-211, IMP-302 |
| FR-507 (M) | IMP-303 |
| FR-508 (M) | IMP-143, IMP-304, IMP-305 |
| FR-509 (M) | IMP-131, IMP-143, IMP-148, IMP-305 |
| FR-510 (M) | IMP-148, IMP-305 |
| FR-511 (M) | IMP-143, IMP-300, IMP-306 |
| FR-512 (M) | IMP-143, IMP-306 |
| FR-601 (M) | IMP-070, IMP-307 |
| FR-602 (M) | IMP-308 |
| FR-603 (M) | IMP-052, IMP-147, IMP-309, IMP-310 |
| FR-604 (M) | IMP-052, IMP-311 |
| FR-605 (M) | IMP-207, IMP-312 |
| FR-606 (M) | IMP-052, IMP-055, IMP-312 |
| FR-607 (M) | IMP-147, IMP-312, IMP-313 |
| FR-608 (M) | IMP-147, IMP-313, IMP-316 |
| FR-609 (M) | IMP-208, IMP-308, IMP-314 |
| FR-610 (M) | IMP-153, IMP-350 |
| FR-611 (S) | IMP-315 |
| FR-612 (M) | IMP-147, IMP-150 |
| FR-701 (M) | IMP-055, IMP-064, IMP-151, IMP-204, IMP-268 |
| FR-702 (M) | IMP-053, IMP-054, IMP-055, IMP-150, IMP-151, IMP-268 |
| FR-703 (M) | IMP-065, IMP-151, IMP-154, IMP-155, IMP-156, IMP-216, IMP-268 |
| FR-704 (M) | IMP-053, IMP-054, IMP-150, IMP-151, IMP-172, IMP-268 |
| FR-705 (M) | IMP-064, IMP-171, IMP-172, IMP-270 |
| FR-706 (M) | IMP-057, IMP-171, IMP-172, IMP-173, IMP-270 |
| FR-707 (S) | IMP-064, IMP-152, IMP-269 |
| FR-708 (C) | IMP-174 |
| FR-801 (M) | IMP-063, IMP-144, IMP-153, IMP-351 |
| FR-802 (M) | IMP-063, IMP-146, IMP-353, IMP-354, IMP-355 |
| FR-803 (M) | IMP-300, IMP-317, IMP-358 |
| FR-804 (M) | IMP-065, IMP-145, IMP-154, IMP-155, IMP-156, IMP-216, IMP-316, IMP-352, IMP-355 |
| FR-805 (M) | IMP-064, IMP-149, IMP-208, IMP-272, IMP-308, IMP-316, IMP-317, IMP-357 |
| FR-806 (M) | IMP-062, IMP-063, IMP-142, IMP-355 |
| FR-807 (M) | IMP-208, IMP-215, IMP-278 |
| FR-808 (M) | IMP-208, IMP-306, IMP-318 |
| FR-901 (M) | IMP-064, IMP-109, IMP-175 |
| FR-902 (S) | IMP-152, IMP-269 |
| FR-903 (M) | IMP-114, IMP-120, IMP-179, IMP-251, IMP-277, IMP-551 |
| FR-904 (S) | IMP-177, IMP-267 |
| FR-905 (M) | IMP-176 |


### 3.2 Ekrany SCR z MVP → zadania

| Ekran | Zadania |
|---|---|
| SCR-ORG-00 – Ekran startowy organizatora | IMP-211, IMP-254 |
| SCR-ORG-01 – Turnieje (lista) | IMP-254, IMP-255 |
| SCR-ORG-02 – Nowy turniej | IMP-256, IMP-259, IMP-602 |
| SCR-ORG-03 – Szczegóły turnieju | IMP-252, IMP-257, IMP-272 |
| SCR-ORG-04 – Zakończyć turniej? | IMP-258, IMP-650 |
| SCR-ORG-05 – Nowa kategoria / Edytuj kategorię | IMP-260 |
| SCR-ORG-06 – Kategoria – zakładka Kryteria | IMP-261, IMP-262, IMP-272 |
| SCR-ORG-07 – Kategoria – zakładka Zawodniczki | IMP-261, IMP-265, IMP-272 |
| SCR-ORG-08 – Kategoria – zakładka Wyniki | IMP-261, IMP-268, IMP-272 |
| SCR-ORG-09 – Nowe kryterium / Edytuj kryterium | IMP-263 |
| SCR-ORG-10 – Nowa kara / Edytuj karę | IMP-264 |
| SCR-ORG-11 – Nowa zawodniczka | IMP-266, IMP-267 |
| SCR-ORG-12 – Podgląd PDF | IMP-174, IMP-270 |
| SCR-SYS-01 – Wybór trybu (Organizator / Tablet sędziowski) | IMP-213, IMP-650 |
| SCR-ORG-13 – Logowanie / rejestracja / reset hasła | IMP-250, IMP-251, IMP-252, IMP-253, IMP-254, IMP-650 |
| SCR-ORG-14 – Sędziowie i urządzenia turnieju | IMP-257, IMP-273, IMP-276, IMP-650 |
| SCR-ORG-15 – Nowy / Edytuj sędziego (z PIN-em) | IMP-274, IMP-650 |
| SCR-ORG-16 – Sparuj tablet (kod QR) | IMP-275, IMP-650 |
| SCR-ORG-17 – Edytuj zawodniczkę / wycofaj | IMP-267, IMP-650 |
| SCR-ORG-18 – Zablokować kategorię? (ostrzeżenie o brakach) | IMP-261, IMP-271, IMP-650 |
| SCR-ORG-19 – Oceny zawodniczki (szczegóły per sędzia) | IMP-269, IMP-650 |
| SCR-ORG-20 – Edytuj turniej | IMP-259, IMP-650 |
| SCR-ORG-21 – Konto (ustawienia, wylogowanie) | IMP-217, IMP-277, IMP-650 |
| SCR-ORG-22 – Odrzucone oceny | IMP-272, IMP-650 |
| SCR-JDG-00 – Ekran startowy sędziego | IMP-211, IMP-302 |
| SCR-JDG-01 – Panel sędziego – wybór profilu | IMP-302, IMP-303, IMP-650 |
| SCR-JDG-02 – Panel sędziego – PIN | IMP-304 |
| SCR-JDG-03 – Kategorie („Dzień dobry, {imię}”) | IMP-300, IMP-307 |
| SCR-JDG-04 – Kategoria – kolejka (pusty panel prawy) | IMP-300, IMP-308 |
| SCR-JDG-05 – Formularz oceny | IMP-309 |
| SCR-JDG-06 – Parowanie tabletu | IMP-301, IMP-302, IMP-303, IMP-650 |
| SCR-JDG-07 – Stan synchronizacji (szczegóły) | IMP-317, IMP-359, IMP-650 |
| SCR-JDG-08 – Blokada PIN (zbyt wiele prób) | IMP-305, IMP-650 |
| SCR-JDG-09 – Wylogować się? (niewysłane oceny) | IMP-306, IMP-650 |
| SCR-JDG-10 – Urządzenie odłączone | IMP-302, IMP-318, IMP-650 |


SCR-PUB-01 (publiczne wyniki, FR-709) i FR-407 (import CSV) są poza MVP – brak zadań z założenia.

## 4. Wszystkie zadania

| ID | Tytuł | Epik | Rola | Szacunek | Ryzyko | Zależności | Odwołania (wymagania, ekrany) |
|---|---|---|---|---|---|---|---|
| [IMP-001](01-fundamenty-i-devops.md#imp-001--monorepo-pnpm-workspaces--turborepo--bazowa-konfiguracja-ts) | Monorepo: pnpm workspaces + Turborepo + bazowa konfiguracja TS | EP-01 | DEVOPS | 6 h | niskie | – | ADR-011, ADR-002 |
| [IMP-002](01-fundamenty-i-devops.md#imp-002--lint-formatowanie-i-hooki-git) | Lint, formatowanie i hooki git | EP-01 | DEVOPS | 6 h | niskie | IMP-001 | NFR-601, NFR-208, ADR-011 |
| [IMP-003](01-fundamenty-i-devops.md#imp-003--ci-na-pr-github-actions) | CI na PR (GitHub Actions) | EP-01 | DEVOPS | 8 h | niskie | IMP-001, IMP-002 | NFR-903, NFR-406, NFR-407 |
| [IMP-004](01-fundamenty-i-devops.md#imp-004--ci-testy-integracyjne-z-testcontainers) | CI: testy integracyjne z Testcontainers | EP-01 | DEVOPS | 4 h | niskie | IMP-003 | NFR-903, ADR-002 |
| [IMP-005](01-fundamenty-i-devops.md#imp-005--obraz-docker-apiworker) | Obraz Docker API/worker | EP-01 | DEVOPS | 4 h | niskie | IMP-001, IMP-100 | ADR-002, ADR-007, ADR-009 |
| [IMP-006](01-fundamenty-i-devops.md#imp-006--środowisko-lokalne-docker-compose-i-seed) | Środowisko lokalne (Docker Compose) i seed | EP-01 | BE | 4 h | niskie | IMP-001, IMP-103 |  |
| [IMP-007](01-fundamenty-i-devops.md#imp-007--terraform-bootstrap-kont-i-stanu) | Terraform: bootstrap kont i stanu | EP-01 | DEVOPS | 8 h | średnie | IMP-001 | ADR-007, NFR-501 |
| [IMP-008](01-fundamenty-i-devops.md#imp-008--terraform-sieć-vpc) | Terraform: sieć VPC | EP-01 | DEVOPS | 8 h | średnie | IMP-007 | ADR-007 |
| [IMP-009](01-fundamenty-i-devops.md#imp-009--terraform-rds-postgresql-18-i-role-bazy) | Terraform: RDS PostgreSQL 18 i role bazy | EP-01 | DEVOPS | 10 h | średnie | IMP-008 | ADR-002, ADR-007, NFR-305, TL-16 |
| [IMP-010](01-fundamenty-i-devops.md#imp-010--terraform-elasticache-valkey) | Terraform: ElastiCache Valkey | EP-01 | DEVOPS | 4 h | niskie | IMP-008 | ADR-007, NFR-307 |
| [IMP-011](01-fundamenty-i-devops.md#imp-011--terraform-ecs-fargate-alb-dns-certyfikaty) | Terraform: ECS Fargate, ALB, DNS, certyfikaty | EP-01 | DEVOPS | 12 h | średnie | IMP-008, IMP-009, IMP-010, IMP-005 | ADR-007, ADR-003, NFR-402, NFR-803 |
| [IMP-012](01-fundamenty-i-devops.md#imp-012--terraform-s3-eksporty-strona-statyczna-i-cloudfront) | Terraform: S3 (eksporty, strona statyczna) i CloudFront | EP-01 | DEVOPS | 6 h | niskie | IMP-007 | ADR-009, TL-39, NFR-501 |
| [IMP-013](01-fundamenty-i-devops.md#imp-013--terraform-ses-domena-dkim-dmarc-i-wyjście-z-sandboxa) | Terraform: SES (domena, DKIM, DMARC) i wyjście z sandboxa | EP-01 | DEVOPS | 6 h | średnie | IMP-007 | FR-102, FR-104, NFR-501 |
| [IMP-014](01-fundamenty-i-devops.md#imp-014--terraform-secrets-manager-kms-iam-ról-zadań) | Terraform: Secrets Manager, KMS, IAM ról zadań | EP-01 | DEVOPS | 6 h | niskie | IMP-007 | NFR-406, TL-06 |
| [IMP-015](01-fundamenty-i-devops.md#imp-015--terraform-waf-guardduty-cloudtrail) | Terraform: WAF, GuardDuty, CloudTrail | EP-01 | DEVOPS | 6 h | niskie | IMP-011 | NFR-405 |
| [IMP-016](01-fundamenty-i-devops.md#imp-016--cd-build--ecr--migracje--wdrożenie) | CD: build → ECR → migracje → wdrożenie | EP-01 | DEVOPS | 10 h | średnie | IMP-011, IMP-003, IMP-103 | ADR-007, NFR-904 |
| [IMP-017](01-fundamenty-i-devops.md#imp-017--okna-zamrożenia-wydań-freeze-guard) | Okna zamrożenia wydań (freeze-guard) | EP-01 | DEVOPS | 4 h | niskie | IMP-016, IMP-023 | NFR-905, TL-37 |
| [IMP-018](01-fundamenty-i-devops.md#imp-018--logowanie-strukturalne-i-korelacja-żądań) | Logowanie strukturalne i korelacja żądań | EP-01 | BE | 6 h | niskie | IMP-100 | NFR-901, NFR-504 |
| [IMP-019](01-fundamenty-i-devops.md#imp-019--metryki-ślady-dashboard-i-alarmy) | Metryki, ślady, dashboard i alarmy | EP-01 | DEVOPS | 10 h | średnie | IMP-011, IMP-018 | NFR-902 |
| [IMP-020](01-fundamenty-i-devops.md#imp-020--cloudwatch-synthetics--kanarek-api) | CloudWatch Synthetics – kanarek API | EP-01 | DEVOPS | 6 h | niskie | IMP-016, IMP-017 | NFR-304, TL-36 |
| [IMP-021](01-fundamenty-i-devops.md#imp-021--sentry-region-ue--api-i-mobile) | Sentry (region UE) – API i mobile | EP-01 | FULL | 6 h | niskie | IMP-100, IMP-200 | NFR-504, NFR-308, NFR-501 |
| [IMP-022](01-fundamenty-i-devops.md#imp-022--eas-profile-kanały-runtimeversion-poświadczenia) | EAS: profile, kanały, runtimeVersion, poświadczenia | EP-01 | MOB | 6 h | niskie | IMP-200 | ADR-001, ADR-007 |
| [IMP-023](01-fundamenty-i-devops.md#imp-023--ci-mobile-buildy-eas-i-publikacja-aktualizacji) | CI mobile: buildy EAS i publikacja aktualizacji | EP-01 | MOB | 6 h | niskie | IMP-022, IMP-003 | NFR-905, ADR-007 |
| [IMP-024](01-fundamenty-i-devops.md#imp-024--konfiguracja-środowisk-aplikacji-i-kontrola-sekretów-w-bundlu) | Konfiguracja środowisk aplikacji i kontrola sekretów w bundlu | EP-01 | MOB | 3 h | niskie | IMP-200 | NFR-406, NFR-410 |
| [IMP-025](01-fundamenty-i-devops.md#imp-025--kopie-zapasowe-runbook-i-test-odtworzenia) | Kopie zapasowe: runbook i test odtworzenia | EP-01 | DEVOPS | 6 h | średnie | IMP-009, IMP-016 | NFR-305 |
| [IMP-026](01-fundamenty-i-devops.md#imp-026--zarządzanie-zależnościami-i-sbom) | Zarządzanie zależnościami i SBOM | EP-01 | DEVOPS | 3 h | niskie | IMP-003 | NFR-407 |
| [IMP-027](01-fundamenty-i-devops.md#imp-027--sast-semgrep-i-dast-zap-w-ci) | SAST (Semgrep) i DAST (ZAP) w CI | EP-01 | DEVOPS | 5 h | niskie | IMP-003, IMP-016, IMP-066 | NFR-408 |
| [IMP-028](01-fundamenty-i-devops.md#imp-028--dane-staging-seed-syntetyczny-i-turniej-maksymalny) | Dane staging: seed syntetyczny i turniej maksymalny | EP-01 | BE | 6 h | niskie | IMP-450, IMP-016 | NFR-801, NFR-802 |
| [IMP-029](01-fundamenty-i-devops.md#imp-029--kontrola-kosztów-harmonogram-staging-i-alarmy) | Kontrola kosztów: harmonogram staging i alarmy | EP-01 | DEVOPS | 3 h | niskie | IMP-011 | ADR-007 |
| [IMP-050](02-pakiety-wspoldzielone.md#imp-050--polechampscoring--szkielet-pakietu) | @polechamp/scoring – szkielet pakietu | EP-02 | BE | 3 h | niskie | IMP-001, IMP-002 | ADR-011, ADR-006 |
| [IMP-051](02-pakiety-wspoldzielone.md#imp-051--scoring-typy-i-arytmetyka-stałoprzecinkowa) | scoring: typy i arytmetyka stałoprzecinkowa | EP-02 | BE | 6 h | niskie | IMP-050 | ADR-006, FR-305, FR-307 |
| [IMP-052](02-pakiety-wspoldzielone.md#imp-052--scoring-wynik-sędziego-maksimum-wartości-domyślne-walidacja-arkusza) | scoring: wynik sędziego, maksimum, wartości domyślne, walidacja arkusza | EP-02 | BE | 6 h | niskie | IMP-051 | FR-603, FR-604, FR-606, FR-301 |
| [IMP-053](02-pakiety-wspoldzielone.md#imp-053--scoring-agregacja-i-średnie-remisowe) | scoring: agregacja i średnie remisowe | EP-02 | BE | 6 h | niskie | IMP-052 | FR-702, FR-704, TL-30 |
| [IMP-054](02-pakiety-wspoldzielone.md#imp-054--scoring-ranking-remisy-starty-bez-ocen-i-wycofane) | scoring: ranking, remisy, starty bez ocen i wycofane | EP-02 | BE | 8 h | średnie | IMP-053 | FR-311, FR-702, FR-704 |
| [IMP-055](02-pakiety-wspoldzielone.md#imp-055--scoring-formatowanie-wyników-i-postęp) | scoring: formatowanie wyników i postęp | EP-02 | BE | 8 h | niskie | IMP-054 | FR-606, FR-701, FR-702, FR-209 |
| [IMP-056](02-pakiety-wspoldzielone.md#imp-056--scoring-testy-właściwości-i-zgodności-klientserwer) | scoring: testy właściwości i zgodności klient–serwer | EP-02 | QA | 10 h | niskie | IMP-055, IMP-201 | NFR-903, ADR-011 |
| [IMP-057](02-pakiety-wspoldzielone.md#imp-057--scoring-kanoniczny-json-wyników) | scoring: kanoniczny JSON wyników | EP-02 | BE | 4 h | niskie | IMP-054 | FR-706, TL-16 |
| [IMP-058](02-pakiety-wspoldzielone.md#imp-058--polechampcontracts--szkielet) | @polechamp/contracts – szkielet | EP-02 | BE | 3 h | niskie | IMP-001 | ADR-012 |
| [IMP-059](02-pakiety-wspoldzielone.md#imp-059--contracts-schematy-wspólne-i-katalog-błędów) | contracts: schematy wspólne i katalog błędów | EP-02 | BE | 6 h | niskie | IMP-058 | NFR-401, NFR-906, TL-08 |
| [IMP-060](02-pakiety-wspoldzielone.md#imp-060--contracts-konto-i-uwierzytelnianie) | contracts: konto i uwierzytelnianie | EP-02 | BE | 4 h | niskie | IMP-059 | FR-101, FR-102, FR-103, FR-104, FR-105, FR-106, FR-107, NFR-706 |
| [IMP-061](02-pakiety-wspoldzielone.md#imp-061--contracts-turnieje-kategorie-kryteria-kary) | contracts: turnieje, kategorie, kryteria, kary | EP-02 | BE | 6 h | niskie | IMP-059 | FR-202, FR-301, FR-305, FR-307, FR-309 |
| [IMP-062](02-pakiety-wspoldzielone.md#imp-062--contracts-zawodniczki-sędziowie-urządzenia-parowanie) | contracts: zawodniczki, sędziowie, urządzenia, parowanie | EP-02 | BE | 6 h | niskie | IMP-059 | FR-402, FR-406, FR-502, FR-504, FR-505, FR-806 |
| [IMP-063](02-pakiety-wspoldzielone.md#imp-063--contracts-synchronizacja-i-sesje-sędziów) | contracts: synchronizacja i sesje sędziów | EP-02 | BE | 8 h | średnie | IMP-059 | FR-801, FR-802, FR-806, ADR-004, TL-04, TL-12 |
| [IMP-064](02-pakiety-wspoldzielone.md#imp-064--contracts-wyniki-oceny-odrzucenia-eksporty-audyt) | contracts: wyniki, oceny, odrzucenia, eksporty, audyt | EP-02 | BE | 4 h | niskie | IMP-059 | FR-701, FR-707, FR-805, FR-705, FR-901 |
| [IMP-065](02-pakiety-wspoldzielone.md#imp-065--contracts-zdarzenia-realtime) | contracts: zdarzenia realtime | EP-02 | BE | 3 h | niskie | IMP-059 | FR-703, FR-804, TL-14 |
| [IMP-066](02-pakiety-wspoldzielone.md#imp-066--contracts-generowanie-openapi-31-i-kontrola-zmian-łamiących) | contracts: generowanie OpenAPI 3.1 i kontrola zmian łamiących | EP-02 | BE | 8 h | niskie | IMP-060, IMP-061, IMP-062, IMP-063, IMP-064 | NFR-906, NFR-907, ADR-012 |
| [IMP-067](02-pakiety-wspoldzielone.md#imp-067--klient-api-dla-aplikacji-typy-z-openapi) | Klient API dla aplikacji (typy z OpenAPI) | EP-02 | MOB | 4 h | niskie | IMP-066, IMP-200 | ADR-012, ADR-003 |
| [IMP-068](02-pakiety-wspoldzielone.md#imp-068--polechamptokens--tokeny-nocturne) | @polechamp/tokens – tokeny Nocturne | EP-02 | MOB | 6 h | niskie | IMP-001 | NFR-202, NFR-210 |
| [IMP-069](02-pakiety-wspoldzielone.md#imp-069--polechampi18n--infrastruktura-liczba-mnoga-formatery) | @polechamp/i18n – infrastruktura, liczba mnoga, formatery | EP-02 | FULL | 10 h | niskie | IMP-001 | NFR-601, NFR-602, NFR-603, NFR-604 |
| [IMP-070](02-pakiety-wspoldzielone.md#imp-070--i18n-katalog-tekstów-wiążących-pl) | i18n: katalog tekstów wiążących PL | EP-02 | FULL | 8 h | niskie | IMP-069 | NFR-601, FR-201, FR-601 |
| [IMP-100](03-backend-konto-i-konfiguracja-turnieju.md#imp-100--szkielet-api-nestjs-12-fastify) | Szkielet API NestJS 12 (Fastify) | EP-03 | BE | 6 h | niskie | IMP-001 | ADR-002 |
| [IMP-101](03-backend-konto-i-konfiguracja-turnieju.md#imp-101--błędy-rfc-9457-i-middleware-identyfikatora-żądania) | Błędy RFC 9457 i middleware identyfikatora żądania | EP-03 | BE | 4 h | niskie | IMP-100, IMP-059 | NFR-401, NFR-901 |
| [IMP-102](03-backend-konto-i-konfiguracja-turnieju.md#imp-102--walidacja-standard-schema-i-test-zgodności-tras-z-openapi) | Walidacja Standard Schema i test zgodności tras z OpenAPI | EP-03 | BE | 6 h | średnie | IMP-101, IMP-058 | ADR-012, NFR-906 |
| [IMP-103](03-backend-konto-i-konfiguracja-turnieju.md#imp-103--baza-drizzle-migracje-transakcje-z-kontekstem) | Baza: Drizzle, migracje, transakcje z kontekstem | EP-03 | BE | 8 h | średnie | IMP-100 | ADR-002, NFR-904 |
| [IMP-104](03-backend-konto-i-konfiguracja-turnieju.md#imp-104--migracja-1-konto-i-tokeny) | Migracja 1: konto i tokeny | EP-03 | BE | 4 h | niskie | IMP-103 | FR-101, FR-103, TL-15 |
| [IMP-105](03-backend-konto-i-konfiguracja-turnieju.md#imp-105--migracja-2-turnieje-kategorie-kryteria-kary-zawodniczki-sędziowie) | Migracja 2: turnieje, kategorie, kryteria, kary, zawodniczki, sędziowie | EP-03 | BE | 6 h | niskie | IMP-103 | TL-04, TL-06 |
| [IMP-106](03-backend-konto-i-konfiguracja-turnieju.md#imp-106--migracja-3-urządzenia-sesje-oceny-wyniki) | Migracja 3: urządzenia, sesje, oceny, wyniki | EP-03 | BE | 6 h | niskie | IMP-105 |  |
| [IMP-107](03-backend-konto-i-konfiguracja-turnieju.md#imp-107--migracja-4-audyt-dziennik-zmian-idempotencja-zdarzenia-eksporty) | Migracja 4: audyt, dziennik zmian, idempotencja, zdarzenia, eksporty | EP-03 | BE | 8 h | średnie | IMP-106, IMP-009 | NFR-409, TL-16, TL-49 |
| [IMP-108](03-backend-konto-i-konfiguracja-turnieju.md#imp-108--repozytoria-z-kontekstem-właściciela-scoped-repository) | Repozytoria z kontekstem właściciela („scoped repository”) | EP-03 | BE | 4 h | niskie | IMP-103 | NFR-411 |
| [IMP-109](03-backend-konto-i-konfiguracja-turnieju.md#imp-109--audyt-dziennik-zmian-i-outbox-zdarzeń-w-transakcji) | Audyt, dziennik zmian i outbox zdarzeń w transakcji | EP-03 | BE | 8 h | średnie | IMP-107 | FR-901, ADR-002 |
| [IMP-110](03-backend-konto-i-konfiguracja-turnieju.md#imp-110--idempotency-key-dla-post-organizatora) | Idempotency-Key dla POST organizatora | EP-03 | BE | 5 h | niskie | IMP-104, IMP-101 | US-011, NFR-306 |
| [IMP-111](03-backend-konto-i-konfiguracja-turnieju.md#imp-111--optymistyczna-współbieżność-etag--if-match) | Optymistyczna współbieżność (ETag / If-Match) | EP-03 | BE | 3 h | niskie | IMP-101 |  |
| [IMP-112](03-backend-konto-i-konfiguracja-turnieju.md#imp-112--limity-zapytań-valkey) | Limity zapytań (Valkey) | EP-03 | BE | 6 h | niskie | IMP-100, IMP-010 | NFR-405, NFR-307 |
| [IMP-113](03-backend-konto-i-konfiguracja-turnieju.md#imp-113--jwt-es256-i-guardy-ról) | JWT ES256 i guardy ról | EP-03 | BE | 8 h | średnie | IMP-101, IMP-014 | ADR-008, NFR-404, NFR-411 |
| [IMP-114](03-backend-konto-i-konfiguracja-turnieju.md#imp-114--rejestracja-konta-argon2id-hibp-regulamin) | Rejestracja konta (Argon2id, HIBP, regulamin) | EP-03 | BE | 8 h | średnie | IMP-104, IMP-060, IMP-112 | FR-101, FR-102, FR-903, US-001, TL-41 |
| [IMP-115](03-backend-konto-i-konfiguracja-turnieju.md#imp-115--weryfikacja-e-maila-i-ponowne-wysłanie-kodu) | Weryfikacja e-maila i ponowne wysłanie kodu | EP-03 | BE | 4 h | niskie | IMP-114 | FR-102, US-001, TL-07 |
| [IMP-116](03-backend-konto-i-konfiguracja-turnieju.md#imp-116--logowanie-blokada-konta-refresh-z-rotacją-wylogowanie) | Logowanie, blokada konta, refresh z rotacją, wylogowanie | EP-03 | BE | 8 h | średnie | IMP-114, IMP-113 | FR-103, FR-105, FR-107, US-002, US-003, NFR-404 |
| [IMP-117](03-backend-konto-i-konfiguracja-turnieju.md#imp-117--reset-hasła-link-uniwersalny) | Reset hasła (link uniwersalny) | EP-03 | BE | 5 h | niskie | IMP-116, IMP-119 | FR-104, US-002 |
| [IMP-118](03-backend-konto-i-konfiguracja-turnieju.md#imp-118--profil-i-usunięcie-konta) | Profil i usunięcie konta | EP-03 | BE | 6 h | niskie | IMP-116 | FR-106, US-003, TL-22 |
| [IMP-119](03-backend-konto-i-konfiguracja-turnieju.md#imp-119--moduł-e-mail-ses-przez-worker-i-szablony-pl) | Moduł e-mail (SES przez worker) i szablony PL | EP-03 | BE | 6 h | niskie | IMP-170, IMP-013, IMP-069 | FR-102, FR-104, FR-106, NFR-601 |
| [IMP-120](03-backend-konto-i-konfiguracja-turnieju.md#imp-120--konfiguracja-aplikacji-i-minimalna-wersja) | Konfiguracja aplikacji i minimalna wersja | EP-03 | BE | 3 h | niskie | IMP-100, IMP-060 | NFR-706, FR-903, TL-07 |
| [IMP-121](03-backend-konto-i-konfiguracja-turnieju.md#imp-121--turnieje-lista-utworzenie-szczegóły) | Turnieje: lista, utworzenie, szczegóły | EP-03 | BE | 8 h | niskie | IMP-105, IMP-108, IMP-109, IMP-110, IMP-061, IMP-055 | FR-201, FR-202, FR-205, FR-209, US-010, US-011, US-013 |
| [IMP-122](03-backend-konto-i-konfiguracja-turnieju.md#imp-122--turnieje-edycja-usunięcie-start-ochrona-turnieju-zakończonego) | Turnieje: edycja, usunięcie, start, ochrona turnieju zakończonego | EP-03 | BE | 6 h | niskie | IMP-121, IMP-111 | FR-203, FR-204, FR-206, FR-208, US-012, US-014 |
| [IMP-123](03-backend-konto-i-konfiguracja-turnieju.md#imp-123--turnieje-zakończenie-auto-blokada-nierozegrane-sesje) | Turnieje: zakończenie (auto-blokada, nierozegrane, sesje) | EP-03 | BE | 6 h | średnie | IMP-122, IMP-127, IMP-143 | FR-207, US-015, TL-14 |
| [IMP-124](03-backend-konto-i-konfiguracja-turnieju.md#imp-124--kategorie-tworzenie-z-szablonu-odczyt-edycja-usunięcie) | Kategorie: tworzenie z szablonu, odczyt, edycja, usunięcie | EP-03 | BE | 8 h | niskie | IMP-121, IMP-052, IMP-061 | FR-301, FR-302, FR-303, FR-304, FR-312, US-020, US-021, US-022 |
| [IMP-125](03-backend-konto-i-konfiguracja-turnieju.md#imp-125--kryteria-i-kary--crud-z-blokadą-po-starcie) | Kryteria i kary – CRUD z blokadą po starcie | EP-03 | BE | 8 h | niskie | IMP-124 | FR-305, FR-306, FR-307, FR-311, US-023, US-024, TL-09 |
| [IMP-126](03-backend-konto-i-konfiguracja-turnieju.md#imp-126--start-kategorii-warunki-panel-auto-start-turnieju) | Start kategorii: warunki, panel, auto-start turnieju | EP-03 | BE | 6 h | niskie | IMP-125, IMP-130 | FR-308, US-025, TL-10 |
| [IMP-127](03-backend-konto-i-konfiguracja-turnieju.md#imp-127--blokada-i-odblokowanie-kategorii-z-sumą-kontrolną) | Blokada i odblokowanie kategorii z sumą kontrolną | EP-03 | BE | 8 h | wysokie | IMP-126, IMP-150, IMP-057, IMP-142 | FR-309, FR-310, US-026, US-027, ADR-010, TL-19 |
| [IMP-128](03-backend-konto-i-konfiguracja-turnieju.md#imp-128--zawodniczki-lista-z-licznikami-dodawanie-edycja) | Zawodniczki: lista z licznikami, dodawanie, edycja | EP-03 | BE | 8 h | niskie | IMP-124, IMP-062 | FR-401, FR-402, FR-403, FR-405, FR-406, US-030, US-031, US-033, TL-17 |
| [IMP-129](03-backend-konto-i-konfiguracja-turnieju.md#imp-129--zawodniczki-wycofanie-przywrócenie-usunięcie) | Zawodniczki: wycofanie, przywrócenie, usunięcie | EP-03 | BE | 5 h | niskie | IMP-128, IMP-150 | FR-404, US-032 |
| [IMP-130](03-backend-konto-i-konfiguracja-turnieju.md#imp-130--sędziowie-lista-dodanie-z-pin-em-i-weryfikatorami-edycja-dezaktywacja-usunięcie) | Sędziowie: lista, dodanie z PIN-em i weryfikatorami, edycja, dezaktywacja, usunięcie | EP-03 | BE | 10 h | średnie | IMP-105, IMP-062, IMP-014 | FR-501, FR-502, FR-503, US-040, US-041, TL-04, TL-06, TL-18 |
| [IMP-131](03-backend-konto-i-konfiguracja-turnieju.md#imp-131--reset-pin-u-sędziego) | Reset PIN-u sędziego | EP-03 | BE | 4 h | niskie | IMP-130, IMP-143 | FR-503, US-042, FR-509 |
| [IMP-132](03-backend-konto-i-konfiguracja-turnieju.md#imp-132--limity-turnieju-nfr-801) | Limity turnieju (NFR-801) | EP-03 | BE | 3 h | niskie | IMP-124 | NFR-801, FR-306 |
| [IMP-140](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-140--kody-parowania) | Kody parowania | EP-04 | BE | 4 h | niskie | IMP-105, IMP-062 | FR-504, US-043 |
| [IMP-141](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-141--urządzenia-parowanie-token-lista-nazwa-unieważnienie) | Urządzenia: parowanie, token, lista, nazwa, unieważnienie | EP-04 | BE | 8 h | średnie | IMP-140, IMP-113, IMP-112 | FR-504, FR-505, US-043, US-044, TL-05, TL-35 |
| [IMP-142](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-142--heartbeat-urządzeń-i-stan-online) | Heartbeat urządzeń i stan online | EP-04 | BE | 5 h | niskie | IMP-141 | FR-806, FR-505, US-044 |
| [IMP-143](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-143--sesje-sędziów-online-i-limity-prób-pin) | Sesje sędziów online i limity prób PIN | EP-04 | BE | 8 h | średnie | IMP-141, IMP-130 | FR-508, FR-509, FR-511, FR-512, US-051, US-052, US-054, ADR-005 |
| [IMP-144](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-144--migawka-urządzenia) | Migawka urządzenia | EP-04 | BE | 8 h | średnie | IMP-141, IMP-130, IMP-063 | FR-504, FR-506, FR-801, NFR-108, NFR-502, TL-04 |
| [IMP-145](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-145--dziennik-zmian-i-pobieranie-zmian) | Dziennik zmian i pobieranie zmian | EP-04 | BE | 8 h | średnie | IMP-109, IMP-144 | FR-804, US-082, TL-49 |
| [IMP-146](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-146--sync-push-paczki-idempotencja-transakcje-per-mutacja) | Sync push: paczki, idempotencja, transakcje per mutacja | EP-04 | BE | 8 h | wysokie | IMP-145, IMP-063 | FR-802, NFR-306, US-080, ADR-004 |
| [IMP-147](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-147--mutacja-submit_score_sheet) | Mutacja SUBMIT_SCORE_SHEET | EP-04 | BE | 10 h | wysokie | IMP-146, IMP-150, IMP-143 | FR-603, FR-607, FR-608, FR-612, US-064, TL-12 |
| [IMP-148](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-148--mutacje-sesji-offline-i-raportu-prób-pin) | Mutacje sesji offline i raportu prób PIN | EP-04 | BE | 5 h | średnie | IMP-146, IMP-143 | FR-509, FR-510, US-053 |
| [IMP-149](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-149--odrzucone-zgłoszenia-zapis-lista-przyjęcie-odrzucenie) | Odrzucone zgłoszenia: zapis, lista, przyjęcie, odrzucenie | EP-04 | BE | 8 h | średnie | IMP-147 | FR-805, US-083, ADR-010, TL-13, TL-49 |
| [IMP-150](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-150--serwis-przeliczania-wyników-kategorii) | Serwis przeliczania wyników kategorii | EP-04 | BE | 8 h | średnie | IMP-106, IMP-055 | FR-612, FR-702, FR-704, FR-209, TL-18 |
| [IMP-151](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-151--wyniki-endpointy-rankingu-kategorii-i-turnieju) | Wyniki: endpointy rankingu kategorii i turnieju | EP-04 | BE | 5 h | niskie | IMP-150, IMP-064 | FR-701, FR-702, FR-703, FR-704, US-070, US-071 |
| [IMP-152](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-152--oceny-zawodniczki-i-historia-rewizji-dla-organizatora) | Oceny zawodniczki i historia rewizji dla organizatora | EP-04 | BE | 4 h | niskie | IMP-147 | FR-707, FR-902, US-074 |
| [IMP-153](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-153--własne-arkusze-sędziego) | Własne arkusze sędziego | EP-04 | BE | 2 h | niskie | IMP-147 | FR-610, FR-801 |
| [IMP-154](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-154--gateway-realtime-socketio) | Gateway realtime (Socket.IO) | EP-04 | BE | 8 h | średnie | IMP-113, IMP-010 | ADR-003, FR-703, FR-804 |
| [IMP-155](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-155--publikator-zdarzeń-z-outboxu) | Publikator zdarzeń z outboxu | EP-04 | BE | 6 h | średnie | IMP-154, IMP-109 | FR-703, FR-804, NFR-307, ADR-003 |
| [IMP-156](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-156--mapowanie-komend-na-zdarzenia-realtime) | Mapowanie komend na zdarzenia realtime | EP-04 | BE | 5 h | niskie | IMP-155, IMP-149, IMP-142 | FR-703, FR-804, US-072, US-082, TL-14 |
| [IMP-170](05-backend-eksport-audyt-rodo.md#imp-170--worker-kolejki-bullmq) | Worker: kolejki BullMQ | EP-05 | BE | 4 h | niskie | IMP-100, IMP-010 | ADR-002, ADR-009 |
| [IMP-171](05-backend-eksport-audyt-rodo.md#imp-171--eksporty-api-zleceń-i-linki-s3) | Eksporty: API zleceń i linki S3 | EP-05 | BE | 5 h | niskie | IMP-170, IMP-151, IMP-012 | FR-705, FR-706, US-073 |
| [IMP-172](05-backend-eksport-audyt-rodo.md#imp-172--renderer-pdf-pdfmake-inter-polskie-znaki) | Renderer PDF (pdfmake, Inter, polskie znaki) | EP-05 | BE | 12 h | średnie | IMP-171, IMP-069, IMP-605 | FR-705, FR-706, FR-704, ADR-009, TL-27 |
| [IMP-173](05-backend-eksport-audyt-rodo.md#imp-173--pdf-regresja-wizualna-i-wydajność) | PDF: regresja wizualna i wydajność | EP-05 | QA | 6 h | niskie | IMP-172, IMP-028 | NFR-107, FR-706 |
| [IMP-174](05-backend-eksport-audyt-rodo.md#imp-174--eksport-csv-wyników-could) | Eksport CSV wyników (Could) | EP-05 | FULL | 4 h | niskie | IMP-171, IMP-270 | FR-708 |
| [IMP-175](05-backend-eksport-audyt-rodo.md#imp-175--odczyt-dziennika-audytu) | Odczyt dziennika audytu | EP-05 | BE | 3 h | niskie | IMP-109 | FR-901, US-090 |
| [IMP-176](05-backend-eksport-audyt-rodo.md#imp-176--zadanie-retencji-i-pseudonimizacji) | Zadanie retencji i pseudonimizacji | EP-05 | BE | 10 h | średnie | IMP-170, IMP-107, IMP-118 | FR-905, NFR-503, US-091, TL-16 |
| [IMP-177](05-backend-eksport-audyt-rodo.md#imp-177--usuń-dane-osobowe-zawodniczki) | „Usuń dane osobowe” zawodniczki | EP-05 | BE | 4 h | niskie | IMP-128, IMP-176 | FR-904, US-091, TL-17 |
| [IMP-178](05-backend-eksport-audyt-rodo.md#imp-178--narzędzia-operatora-cli) | Narzędzia operatora (CLI) | EP-05 | BE | 8 h | niskie | IMP-141, IMP-176 | TL-38, TL-40, NFR-507 |
| [IMP-179](05-backend-eksport-audyt-rodo.md#imp-179--strona-statyczna-dokumenty-prawne-usunięcie-konta-linki-uniwersalne) | Strona statyczna: dokumenty prawne, usunięcie konta, linki uniwersalne | EP-05 | FULL | 5 h | niskie | IMP-012 | FR-903, FR-106, FR-104, TL-39, TL-22 |
| [IMP-200](06-mobile-fundamenty-i-design-system.md#imp-200--inicjalizacja-aplikacji-expo-sdk-58) | Inicjalizacja aplikacji Expo SDK 58 | EP-06 | MOB | 6 h | średnie | IMP-001, IMP-600 | ADR-001, NFR-701, TL-01, TL-25 |
| [IMP-201](06-mobile-fundamenty-i-design-system.md#imp-201--metro-pnpm-workspace-i-środowisko-testów-mobile) | Metro, pnpm workspace i środowisko testów mobile | EP-06 | MOB | 5 h | średnie | IMP-200, IMP-050, IMP-058, IMP-068, IMP-069 | ADR-011, NFR-903 |
| [IMP-202](06-mobile-fundamenty-i-design-system.md#imp-202--theme-fonty-inter-i-komponenty-tekstu) | Theme, fonty Inter i komponenty tekstu | EP-06 | MOB | 6 h | niskie | IMP-201 | NFR-204, NFR-209 |
| [IMP-203](06-mobile-fundamenty-i-design-system.md#imp-203--komponent-button-primary-secondary-ghost-iconround) | Komponent Button (primary, secondary, ghost, iconRound) | EP-06 | MOB | 8 h | niskie | IMP-202, IMP-210 | NFR-203, NFR-206 |
| [IMP-204](06-mobile-fundamenty-i-design-system.md#imp-204--statuspill-badge-avatar-progressbar) | StatusPill, Badge, Avatar, ProgressBar | EP-06 | MOB | 6 h | niskie | IMP-202 | FR-312, FR-701 |
| [IMP-205](06-mobile-fundamenty-i-design-system.md#imp-205--karty-listy-grupowane-nagłówki-sekcji-stany-puste-szkielety) | Karty, listy grupowane, nagłówki sekcji, stany puste, szkielety | EP-06 | MOB | 10 h | niskie | IMP-203, IMP-204 | NFR-205, NFR-207 |
| [IMP-206](06-mobile-fundamenty-i-design-system.md#imp-206--komponent-sheet-bottom-sheet--implementacja-własna) | Komponent Sheet (bottom sheet) – implementacja własna | EP-06 | MOB | 16 h | wysokie | IMP-203, IMP-602 | NFR-206, TL-03 |
| [IMP-207](06-mobile-fundamenty-i-design-system.md#imp-207--pola-formularzy-textfield-numberfield-textarea-choicechip-pole-daty) | Pola formularzy: TextField, NumberField, TextArea, ChoiceChip, pole daty | EP-06 | MOB | 12 h | średnie | IMP-203, IMP-069 | FR-202, FR-305, FR-307, FR-605, NFR-202 |
| [IMP-208](06-mobile-fundamenty-i-design-system.md#imp-208--toast-banner-dialog) | Toast, Banner, Dialog | EP-06 | MOB | 8 h | niskie | IMP-203 | NFR-206, FR-609, FR-805, FR-807, FR-808 |
| [IMP-209](06-mobile-fundamenty-i-design-system.md#imp-209--segmentedcontrol-stickyactionbar-screenheaderbacklink-kontenery-ekranów) | SegmentedControl, StickyActionBar, ScreenHeader/BackLink, kontenery ekranów | EP-06 | MOB | 8 h | niskie | IMP-203 | TL-24 |
| [IMP-210](06-mobile-fundamenty-i-design-system.md#imp-210--ikony-phosphor) | Ikony Phosphor | EP-06 | MOB | 2 h | niskie | IMP-201 |  |
| [IMP-211](06-mobile-fundamenty-i-design-system.md#imp-211--splash-z-animacją-tancerki-polespinner) | Splash z animacją tancerki (PoleSpinner) | EP-06 | MOB | 16 h | średnie | IMP-202, IMP-606 | FR-210, FR-506, SCR-ORG-00, SCR-JDG-00, NFR-207 |
| [IMP-212](06-mobile-fundamenty-i-design-system.md#imp-212--devcatalog--katalog-komponentów-tylko-development) | DevCatalog – katalog komponentów (tylko development) | EP-06 | MOB | 6 h | niskie | IMP-205, IMP-206, IMP-207, IMP-208, IMP-209 | NFR-208, NFR-210 |
| [IMP-213](06-mobile-fundamenty-i-design-system.md#imp-213--scr-sys-01--wybór-trybu-forma-urządzenia-orientacja-per-tryb) | SCR-SYS-01 – wybór trybu, forma urządzenia, orientacja per tryb | EP-06 | MOB | 6 h | średnie | IMP-205, IMP-209 | SCR-SYS-01, NFR-702, ADR-013, TL-23, TL-24 |
| [IMP-214](06-mobile-fundamenty-i-design-system.md#imp-214--warstwa-api-klienta-tokeny-odświeżanie-błędy) | Warstwa API klienta: tokeny, odświeżanie, błędy | EP-06 | MOB | 8 h | średnie | IMP-067, IMP-069 | ADR-003, ADR-008, NFR-706, US-011 |
| [IMP-215](06-mobile-fundamenty-i-design-system.md#imp-215--tanstack-query-cache-mmkv-i-tryb-offline-organizatora) | TanStack Query, cache MMKV i tryb offline organizatora | EP-06 | MOB | 8 h | niskie | IMP-214, IMP-208 | FR-807, FR-105, US-084 |
| [IMP-216](06-mobile-fundamenty-i-design-system.md#imp-216--klient-realtime-z-fallbackiem-na-odpytywanie) | Klient realtime z fallbackiem na odpytywanie | EP-06 | MOB | 8 h | średnie | IMP-214, IMP-065, IMP-604 | FR-703, FR-804, NFR-303, ADR-003 |
| [IMP-217](06-mobile-fundamenty-i-design-system.md#imp-217--ekran-wymuszonej-aktualizacji) | Ekran wymuszonej aktualizacji | EP-06 | MOB | 3 h | niskie | IMP-214, IMP-120 | NFR-706 |
| [IMP-218](06-mobile-fundamenty-i-design-system.md#imp-218--integracja-sentry-w-aplikacji) | Integracja Sentry w aplikacji | EP-06 | MOB | 3 h | niskie | IMP-021, IMP-200 | NFR-308, NFR-504, NFR-101 |
| [IMP-219](06-mobile-fundamenty-i-design-system.md#imp-219--i18n-w-aplikacji) | i18n w aplikacji | EP-06 | MOB | 3 h | niskie | IMP-201, IMP-069 | NFR-601, NFR-603 |
| [IMP-220](06-mobile-fundamenty-i-design-system.md#imp-220--struktura-tras-expo-router-i-nawigacja) | Struktura tras Expo Router i nawigacja | EP-06 | MOB | 5 h | niskie | IMP-213 | ADR-001 |
| [IMP-250](07-mobile-ekrany-organizatora.md#imp-250--scr-org-13--logowanie-i-sesja-organizatora) | SCR-ORG-13 – logowanie i sesja organizatora | EP-07 | MOB | 8 h | niskie | IMP-207, IMP-214, IMP-220, IMP-116 | FR-103, FR-107, US-002, SCR-ORG-13 |
| [IMP-251](07-mobile-ekrany-organizatora.md#imp-251--scr-org-13--rejestracja) | SCR-ORG-13 – rejestracja | EP-07 | MOB | 6 h | niskie | IMP-250, IMP-114, IMP-120 | FR-101, FR-903, US-001 |
| [IMP-252](07-mobile-ekrany-organizatora.md#imp-252--scr-org-13--weryfikacja-e-maila-i-baner-w-turnieju) | SCR-ORG-13 – weryfikacja e-maila i baner w turnieju | EP-07 | MOB | 6 h | niskie | IMP-251, IMP-115 | FR-102, US-001 |
| [IMP-253](07-mobile-ekrany-organizatora.md#imp-253--scr-org-13--reset-hasła-i-linki-uniwersalne) | SCR-ORG-13 – reset hasła i linki uniwersalne | EP-07 | MOB | 6 h | średnie | IMP-250, IMP-117, IMP-179 | FR-104, US-002, TL-39 |
| [IMP-254](07-mobile-ekrany-organizatora.md#imp-254--scr-org-00--splash-organizatora-z-ładowaniem-danych) | SCR-ORG-00 – splash organizatora z ładowaniem danych | EP-07 | MOB | 4 h | niskie | IMP-211, IMP-215, IMP-250 | FR-210, US-016, SCR-ORG-00 |
| [IMP-255](07-mobile-ekrany-organizatora.md#imp-255--scr-org-01--lista-turniejów) | SCR-ORG-01 – lista turniejów | EP-07 | MOB | 10 h | niskie | IMP-205, IMP-215, IMP-121 | FR-201, FR-209, US-010, SCR-ORG-01 |
| [IMP-256](07-mobile-ekrany-organizatora.md#imp-256--scr-org-02--nowy-turniej) | SCR-ORG-02 – nowy turniej | EP-07 | MOB | 6 h | niskie | IMP-206, IMP-207, IMP-255 | FR-202, US-011, SCR-ORG-02 |
| [IMP-257](07-mobile-ekrany-organizatora.md#imp-257--scr-org-03--szczegóły-turnieju) | SCR-ORG-03 – szczegóły turnieju | EP-07 | MOB | 12 h | niskie | IMP-255, IMP-216, IMP-122 | FR-205, FR-206, FR-208, FR-209, US-013, US-014, SCR-ORG-03 |
| [IMP-258](07-mobile-ekrany-organizatora.md#imp-258--scr-org-04--zakończenie-turnieju) | SCR-ORG-04 – zakończenie turnieju | EP-07 | MOB | 4 h | niskie | IMP-257, IMP-123, IMP-206 | FR-207, US-015, SCR-ORG-04, TL-48 |
| [IMP-259](07-mobile-ekrany-organizatora.md#imp-259--scr-org-20--edycja-i-usunięcie-turnieju) | SCR-ORG-20 – edycja i usunięcie turnieju | EP-07 | MOB | 5 h | niskie | IMP-256, IMP-257 | FR-203, FR-204, US-012, SCR-ORG-20 |
| [IMP-260](07-mobile-ekrany-organizatora.md#imp-260--scr-org-05--nowa--edycja-kategorii) | SCR-ORG-05 – nowa / edycja kategorii | EP-07 | MOB | 8 h | niskie | IMP-206, IMP-207, IMP-124 | FR-301, FR-302, FR-303, US-020, US-021, SCR-ORG-05 |
| [IMP-261](07-mobile-ekrany-organizatora.md#imp-261--scr-org-060708--rama-szczegółów-kategorii) | SCR-ORG-06/07/08 – rama szczegółów kategorii | EP-07 | MOB | 10 h | średnie | IMP-209, IMP-257, IMP-126, IMP-127 | FR-308, FR-309, FR-310, FR-312, US-025, US-026, US-027, SCR-ORG-06, SCR-ORG-07, SCR-ORG-08 |
| [IMP-262](07-mobile-ekrany-organizatora.md#imp-262--scr-org-06--zakładka-kryteria) | SCR-ORG-06 – zakładka Kryteria | EP-07 | MOB | 6 h | niskie | IMP-261 | FR-304, FR-305, FR-312, US-022, SCR-ORG-06 |
| [IMP-263](07-mobile-ekrany-organizatora.md#imp-263--scr-org-09--kryterium-noweedycjausunięcie) | SCR-ORG-09 – kryterium (nowe/edycja/usunięcie) | EP-07 | MOB | 6 h | niskie | IMP-262, IMP-125 | FR-305, FR-306, US-023, SCR-ORG-09 |
| [IMP-264](07-mobile-ekrany-organizatora.md#imp-264--scr-org-10--kara-nowaedycjausunięcie) | SCR-ORG-10 – kara (nowa/edycja/usunięcie) | EP-07 | MOB | 5 h | niskie | IMP-262, IMP-125 | FR-307, US-024, SCR-ORG-10 |
| [IMP-265](07-mobile-ekrany-organizatora.md#imp-265--scr-org-07--zakładka-zawodniczki) | SCR-ORG-07 – zakładka Zawodniczki | EP-07 | MOB | 8 h | niskie | IMP-261, IMP-128 | FR-401, FR-405, US-030, SCR-ORG-07 |
| [IMP-266](07-mobile-ekrany-organizatora.md#imp-266--scr-org-11--nowa-zawodniczka) | SCR-ORG-11 – nowa zawodniczka | EP-07 | MOB | 6 h | niskie | IMP-265 | FR-402, FR-406, US-031, US-033, SCR-ORG-11 |
| [IMP-267](07-mobile-ekrany-organizatora.md#imp-267--scr-org-17--edycja-wycofanie-usunięcie-usuń-dane-osobowe) | SCR-ORG-17 – edycja, wycofanie, usunięcie, „Usuń dane osobowe” | EP-07 | MOB | 6 h | niskie | IMP-266, IMP-129, IMP-177 | FR-403, FR-404, FR-904, US-032, US-091, SCR-ORG-17 |
| [IMP-268](07-mobile-ekrany-organizatora.md#imp-268--scr-org-08--zakładka-wyniki-ranking-na-żywo) | SCR-ORG-08 – zakładka Wyniki (ranking na żywo) | EP-07 | MOB | 10 h | średnie | IMP-261, IMP-151, IMP-216 | FR-701, FR-702, FR-703, FR-704, US-070, US-071, US-072, SCR-ORG-08 |
| [IMP-269](07-mobile-ekrany-organizatora.md#imp-269--scr-org-19--oceny-zawodniczki) | SCR-ORG-19 – oceny zawodniczki | EP-07 | MOB | 6 h | niskie | IMP-268, IMP-152 | FR-707, FR-902, US-074, SCR-ORG-19 |
| [IMP-270](07-mobile-ekrany-organizatora.md#imp-270--scr-org-12--podgląd-i-pobranie-pdf) | SCR-ORG-12 – podgląd i pobranie PDF | EP-07 | MOB | 10 h | średnie | IMP-206, IMP-171, IMP-268 | FR-705, FR-706, US-073, SCR-ORG-12 |
| [IMP-271](07-mobile-ekrany-organizatora.md#imp-271--scr-org-18--ostrzeżenie-przed-blokadą) | SCR-ORG-18 – ostrzeżenie przed blokadą | EP-07 | MOB | 4 h | niskie | IMP-261, IMP-206 | FR-309, US-026, SCR-ORG-18 |
| [IMP-272](07-mobile-ekrany-organizatora.md#imp-272--scr-org-22--odrzucone-oceny) | SCR-ORG-22 – odrzucone oceny | EP-07 | MOB | 6 h | niskie | IMP-261, IMP-149 | FR-805, US-083, SCR-ORG-22 |
| [IMP-273](07-mobile-ekrany-organizatora.md#imp-273--scr-org-14--sędziowie-i-urządzenia) | SCR-ORG-14 – sędziowie i urządzenia | EP-07 | MOB | 10 h | niskie | IMP-209, IMP-130, IMP-141, IMP-216 | FR-501, FR-505, US-040, US-044, SCR-ORG-14 |
| [IMP-274](07-mobile-ekrany-organizatora.md#imp-274--scr-org-15--sędzia-nowy-z-pin-em-edycja-reset-aktywność-usunięcie) | SCR-ORG-15 – sędzia (nowy z PIN-em, edycja, reset, aktywność, usunięcie) | EP-07 | MOB | 8 h | niskie | IMP-273, IMP-131, IMP-206 | FR-502, FR-503, US-040, US-041, US-042, SCR-ORG-15 |
| [IMP-275](07-mobile-ekrany-organizatora.md#imp-275--scr-org-16--parowanie-tabletu) | SCR-ORG-16 – parowanie tabletu | EP-07 | MOB | 6 h | niskie | IMP-273, IMP-140 | FR-504, US-043, SCR-ORG-16 |
| [IMP-276](07-mobile-ekrany-organizatora.md#imp-276--akcje-urządzenia-zmiana-nazwy-i-odłączenie) | Akcje urządzenia: zmiana nazwy i odłączenie | EP-07 | MOB | 3 h | niskie | IMP-273 | FR-505, US-044, SCR-ORG-14 |
| [IMP-277](07-mobile-ekrany-organizatora.md#imp-277--scr-org-21--konto) | SCR-ORG-21 – konto | EP-07 | MOB | 6 h | niskie | IMP-250, IMP-118, IMP-120 | FR-105, FR-106, FR-903, US-003, SCR-ORG-21, TL-22 |
| [IMP-278](07-mobile-ekrany-organizatora.md#imp-278--tryb-offline-organizatora-na-wszystkich-ekranach) | Tryb offline organizatora na wszystkich ekranach | EP-07 | MOB | 4 h | niskie | IMP-215, IMP-257, IMP-261, IMP-273 | FR-807, US-084 |
| [IMP-300](08-mobile-ekrany-sedziego.md#imp-300--powłoka-trybu-sędziego-i-judgeheader) | Powłoka trybu sędziego i JudgeHeader | EP-08 | MOB | 8 h | średnie | IMP-213, IMP-208, IMP-204 | FR-511, FR-803, SCR-JDG-03, SCR-JDG-04, NFR-702, TL-23 |
| [IMP-301](08-mobile-ekrany-sedziego.md#imp-301--scr-jdg-06--parowanie-tabletu) | SCR-JDG-06 – parowanie tabletu | EP-08 | MOB | 8 h | średnie | IMP-300, IMP-356, IMP-351, IMP-141 | FR-504, US-043, SCR-JDG-06 |
| [IMP-302](08-mobile-ekrany-sedziego.md#imp-302--scr-jdg-00--splash-sędziego-z-rzeczywistym-rozruchem) | SCR-JDG-00 – splash sędziego z rzeczywistym rozruchem | EP-08 | MOB | 6 h | niskie | IMP-211, IMP-352, IMP-356 | FR-506, US-050, SCR-JDG-00 |
| [IMP-303](08-mobile-ekrany-sedziego.md#imp-303--scr-jdg-01--wybór-profilu-z-ponownym-użyciem-tabletu) | SCR-JDG-01 – wybór profilu (z ponownym użyciem tabletu) | EP-08 | MOB | 5 h | niskie | IMP-300, IMP-350 | FR-507, US-050, SCR-JDG-01, TL-47 |
| [IMP-304](08-mobile-ekrany-sedziego.md#imp-304--scr-jdg-02--klawiatura-pin-i-kropki) | SCR-JDG-02 – klawiatura PIN i kropki | EP-08 | MOB | 6 h | niskie | IMP-300, IMP-203 | FR-508, US-051, SCR-JDG-02 |
| [IMP-305](08-mobile-ekrany-sedziego.md#imp-305--logowanie-sędziego-onlineoffline-i-limity-prób-scr-jdg-08) | Logowanie sędziego online/offline i limity prób (SCR-JDG-08) | EP-08 | MOB | 10 h | wysokie | IMP-304, IMP-353, IMP-143, IMP-601 | FR-508, FR-509, FR-510, US-051, US-052, US-053, ADR-005, TL-04, TL-21 |
| [IMP-306](08-mobile-ekrany-sedziego.md#imp-306--zarządzanie-sesją-sędziego-i-wylogowanie-scr-jdg-09) | Zarządzanie sesją sędziego i wylogowanie (SCR-JDG-09) | EP-08 | MOB | 8 h | średnie | IMP-305, IMP-208, IMP-216 | FR-511, FR-512, FR-808, US-054, US-085, SCR-JDG-09, TL-14 |
| [IMP-307](08-mobile-ekrany-sedziego.md#imp-307--scr-jdg-03--lista-kategorii-sędziego) | SCR-JDG-03 – lista kategorii sędziego | EP-08 | MOB | 6 h | niskie | IMP-300, IMP-350, IMP-055 | FR-601, US-055, SCR-JDG-03 |
| [IMP-308](08-mobile-ekrany-sedziego.md#imp-308--scr-jdg-04--kolejka-zawodniczek) | SCR-JDG-04 – kolejka zawodniczek | EP-08 | MOB | 8 h | niskie | IMP-300, IMP-350, IMP-358 | FR-602, FR-609, FR-805, US-056, SCR-JDG-04 |
| [IMP-309](08-mobile-ekrany-sedziego.md#imp-309--scr-jdg-05--układ-formularza-oceny) | SCR-JDG-05 – układ formularza oceny | EP-08 | MOB | 6 h | niskie | IMP-308 | FR-603, US-057, SCR-JDG-05 |
| [IMP-310](08-mobile-ekrany-sedziego.md#imp-310--scoreslider-i-przyciski--kryterium) | ScoreSlider i przyciski −/+ kryterium | EP-08 | MOB | 12 h | wysokie | IMP-309 | FR-603, US-057, NFR-104, NFR-206 |
| [IMP-311](08-mobile-ekrany-sedziego.md#imp-311--penaltycounter) | PenaltyCounter | EP-08 | MOB | 4 h | niskie | IMP-309 | FR-604, US-058, NFR-203 |
| [IMP-312](08-mobile-ekrany-sedziego.md#imp-312--komentarz-i-stopka-z-wynikiem-na-żywo) | Komentarz i stopka z wynikiem na żywo | EP-08 | MOB | 6 h | niskie | IMP-310, IMP-311 | FR-605, FR-606, FR-607, US-057 |
| [IMP-313](08-mobile-ekrany-sedziego.md#imp-313--zatwierdzenie-oceny-i-auto-przejście) | Zatwierdzenie oceny i auto-przejście | EP-08 | MOB | 8 h | średnie | IMP-312, IMP-353 | FR-607, FR-608, US-059, US-060, NFR-103, TL-46 |
| [IMP-314](08-mobile-ekrany-sedziego.md#imp-314--tryb-tylko-do-odczytu-kategoria-zablokowana) | Tryb tylko do odczytu (kategoria zablokowana) | EP-08 | MOB | 4 h | niskie | IMP-313 | FR-609, US-061 |
| [IMP-315](08-mobile-ekrany-sedziego.md#imp-315--autozapis-szkicu-formularza) | Autozapis szkicu formularza | EP-08 | MOB | 5 h | niskie | IMP-313 | FR-611, US-063 |
| [IMP-316](08-mobile-ekrany-sedziego.md#imp-316--stany-dodatkowe-formularza-odrzucona-lista-zmieniona-stale_revision) | Stany dodatkowe formularza (odrzucona, lista zmieniona, STALE_REVISION) | EP-08 | MOB | 5 h | niskie | IMP-313, IMP-357 | FR-805, FR-804, FR-608, US-082 |
| [IMP-317](08-mobile-ekrany-sedziego.md#imp-317--scr-jdg-07--pigułka-synchronizacji-i-popover) | SCR-JDG-07 – pigułka synchronizacji i popover | EP-08 | MOB | 6 h | niskie | IMP-300, IMP-358 | FR-803, FR-805, US-081, SCR-JDG-07 |
| [IMP-318](08-mobile-ekrany-sedziego.md#imp-318--scr-jdg-10--urządzenie-odłączone-i-eksport-niewysłanych) | SCR-JDG-10 – urządzenie odłączone i eksport niewysłanych | EP-08 | MOB | 6 h | niskie | IMP-300, IMP-354 | FR-808, US-044, SCR-JDG-10 |
| [IMP-319](08-mobile-ekrany-sedziego.md#imp-319--cykl-życia-danych-tabletu) | Cykl życia danych tabletu | EP-08 | MOB | 4 h | niskie | IMP-350, IMP-303 | NFR-506 |
| [IMP-350](09-mobile-offline-i-synchronizacja.md#imp-350--lokalna-baza-sqlite-schemat-migracje-pragma) | Lokalna baza SQLite: schemat, migracje, PRAGMA | EP-09 | MOB | 8 h | wysokie | IMP-201, IMP-603, IMP-609 | ADR-004, NFR-302, TL-20, FR-610 |
| [IMP-351](09-mobile-offline-i-synchronizacja.md#imp-351--pobieranie-i-zapis-migawki) | Pobieranie i zapis migawki | EP-09 | MOB | 6 h | średnie | IMP-350, IMP-214, IMP-144 | FR-504, FR-801, NFR-108 |
| [IMP-352](09-mobile-offline-i-synchronizacja.md#imp-352--pobieranie-zmian-pull) | Pobieranie zmian (pull) | EP-09 | MOB | 8 h | średnie | IMP-351, IMP-145 | FR-804, US-082, TL-49 |
| [IMP-353](09-mobile-offline-i-synchronizacja.md#imp-353--outbox--rdzeń) | Outbox – rdzeń | EP-09 | MOB | 6 h | średnie | IMP-350, IMP-063 | FR-802, NFR-302, NFR-301, TL-20 |
| [IMP-354](09-mobile-offline-i-synchronizacja.md#imp-354--syncengine--wysyłka-push) | SyncEngine – wysyłka (push) | EP-09 | MOB | 10 h | wysokie | IMP-353, IMP-146 | FR-802, US-080, NFR-106, NFR-306 |
| [IMP-355](09-mobile-offline-i-synchronizacja.md#imp-355--syncengine--wyzwalacze-harmonogram-heartbeat) | SyncEngine – wyzwalacze, harmonogram, heartbeat | EP-09 | MOB | 6 h | średnie | IMP-354, IMP-352, IMP-216, IMP-142 | FR-806, FR-802, FR-804, US-044 |
| [IMP-356](09-mobile-offline-i-synchronizacja.md#imp-356--uwierzytelnianie-urządzenia-na-tablecie) | Uwierzytelnianie urządzenia na tablecie | EP-09 | MOB | 4 h | średnie | IMP-214, IMP-141 | ADR-005, FR-504, NFR-404 |
| [IMP-357](09-mobile-offline-i-synchronizacja.md#imp-357--obsługa-odrzuceń-na-tablecie) | Obsługa odrzuceń na tablecie | EP-09 | MOB | 6 h | średnie | IMP-354, IMP-352 | FR-805, US-083, TL-13 |
| [IMP-358](09-mobile-offline-i-synchronizacja.md#imp-358--magazyn-stanu-synchronizacji-zustand) | Magazyn stanu synchronizacji (Zustand) | EP-09 | MOB | 4 h | niskie | IMP-353 | FR-803, TL-45 |
| [IMP-359](09-mobile-offline-i-synchronizacja.md#imp-359--dziennik-diagnostyczny-synchronizacji) | Dziennik diagnostyczny synchronizacji | EP-09 | MOB | 3 h | niskie | IMP-354, IMP-218 | NFR-504, NFR-902 |
| [IMP-400](10-bezpieczenstwo-i-rodo.md#imp-400--mapowanie-asvs-50-l2-i-model-zagrożeń) | Mapowanie ASVS 5.0 L2 i model zagrożeń | EP-10 | BE | 6 h | niskie | IMP-113 | NFR-401, TL-26 |
| [IMP-401](10-bezpieczenstwo-i-rodo.md#imp-401--mapowanie-masvs-2x-mas-l1--wybrane-l2) | Mapowanie MASVS 2.x (MAS-L1 + wybrane L2) | EP-10 | MOB | 4 h | niskie | IMP-356 | NFR-401, TL-26 |
| [IMP-402](10-bezpieczenstwo-i-rodo.md#imp-402--twardnienie-przechowywania-na-urządzeniach) | Twardnienie przechowywania na urządzeniach | EP-10 | MOB | 4 h | niskie | IMP-356, IMP-250 | NFR-401, ADR-005 |
| [IMP-403](10-bezpieczenstwo-i-rodo.md#imp-403--testy-usuwania-pii-z-telemetrii) | Testy usuwania PII z telemetrii | EP-10 | QA | 4 h | niskie | IMP-018, IMP-218 | NFR-504 |
| [IMP-404](10-bezpieczenstwo-i-rodo.md#imp-404--zestaw-testów-nadużyć) | Zestaw testów nadużyć | EP-10 | QA | 8 h | średnie | IMP-116, IMP-141, IMP-143, IMP-453 | NFR-405, NFR-401, ADR-008 |
| [IMP-405](10-bezpieczenstwo-i-rodo.md#imp-405--rotacja-kluczy-jwt--procedura) | Rotacja kluczy JWT – procedura | EP-10 | DEVOPS | 3 h | niskie | IMP-113, IMP-014 | NFR-401 |
| [IMP-406](10-bezpieczenstwo-i-rodo.md#imp-406--materiały-rodo-dla-prawnika) | Materiały RODO dla prawnika | EP-10 | BE | 6 h | niskie | IMP-176 | NFR-501, NFR-502, NFR-507, Q-10 |
| [IMP-407](10-bezpieczenstwo-i-rodo.md#imp-407--deklaracje-prywatności-w-sklepach) | Deklaracje prywatności w sklepach | EP-10 | MOB | 3 h | niskie | IMP-406, IMP-550 | NFR-505 |
| [IMP-408](10-bezpieczenstwo-i-rodo.md#imp-408--pentest-zewnętrzny-i-poprawki) | Pentest zewnętrzny i poprawki | EP-10 | BE | 16 h | średnie | IMP-027, IMP-404, IMP-457 | NFR-408 |
| [IMP-409](10-bezpieczenstwo-i-rodo.md#imp-409--test-uprawnień-bazy-i-architektury-dostępu) | Test uprawnień bazy i architektury dostępu | EP-10 | BE | 3 h | niskie | IMP-107, IMP-108 | NFR-409 |
| [IMP-450](11-qa-i-automatyzacja-testow.md#imp-450--dane-testowe-port-seedu-prototypu-i-fabryki) | Dane testowe: port seedu prototypu i fabryki | EP-11 | QA | 8 h | niskie | IMP-055, IMP-105 | NFR-903 |
| [IMP-451](11-qa-i-automatyzacja-testow.md#imp-451--harness-testów-integracyjnych-api) | Harness testów integracyjnych API | EP-11 | QA | 6 h | niskie | IMP-103, IMP-113, IMP-004, IMP-450 | NFR-903 |
| [IMP-452](11-qa-i-automatyzacja-testow.md#imp-452--testy-kontraktowe-odpowiedzi-i-zgodności-wstecznej) | Testy kontraktowe odpowiedzi i zgodności wstecznej | EP-11 | QA | 6 h | niskie | IMP-451, IMP-066 | NFR-903, NFR-907, ADR-012 |
| [IMP-453](11-qa-i-automatyzacja-testow.md#imp-453--generator-testów-macierzy-uprawnień) | Generator testów macierzy uprawnień | EP-11 | QA | 8 h | niskie | IMP-451, IMP-066 | NFR-411 |
| [IMP-454](11-qa-i-automatyzacja-testow.md#imp-454--maestro-struktura-identyfikatory-uruchamianie-w-ci) | Maestro: struktura, identyfikatory, uruchamianie w CI | EP-11 | QA | 10 h | średnie | IMP-023, IMP-450 | NFR-903, ADR-001 |
| [IMP-455](11-qa-i-automatyzacja-testow.md#imp-455--e2e-organizatora--konto-turnieje-kategorie-i-kryteria) | E2E organizatora – konto, turnieje, kategorie i kryteria | EP-11 | QA | 10 h | średnie | IMP-454, IMP-278, IMP-277 | NFR-903 |
| [IMP-467](11-qa-i-automatyzacja-testow.md#imp-467--e2e-organizatora--zawodniczki-wyniki-sędziowie-urządzenia-i-offline) | E2E organizatora – zawodniczki, wyniki, sędziowie, urządzenia i offline | EP-11 | QA | 10 h | średnie | IMP-454, IMP-278, IMP-277 | NFR-903 |
| [IMP-456](11-qa-i-automatyzacja-testow.md#imp-456--e2e-sędziego--parowanie-logowanie-pin-em-kolejka-i-formularz) | E2E sędziego – parowanie, logowanie PIN-em, kolejka i formularz | EP-11 | QA | 10 h | średnie | IMP-454, IMP-319, IMP-318 | NFR-903 |
| [IMP-468](11-qa-i-automatyzacja-testow.md#imp-468--e2e-sędziego--blokada-sesje-synchronizacja-odłączenie-i-orientacja) | E2E sędziego – blokada, sesje, synchronizacja, odłączenie i orientacja | EP-11 | QA | 10 h | średnie | IMP-454, IMP-319, IMP-318 | NFR-903 |
| [IMP-457](11-qa-i-automatyzacja-testow.md#imp-457--e2e-pełnego-turnieju-dwa-urządzenia) | E2E pełnego turnieju (dwa urządzenia) | EP-11 | QA | 12 h | wysokie | IMP-455, IMP-467, IMP-456, IMP-468 | NFR-105, NFR-903 |
| [IMP-458](11-qa-i-automatyzacja-testow.md#imp-458--e2e-offline--narzędzia-sieci-i-scenariusze-tc-sync-001020) | E2E offline – narzędzia sieci i scenariusze TC-SYNC-001…020 | EP-11 | QA | 10 h | wysokie | IMP-456, IMP-357, IMP-355 | NFR-301, NFR-302, NFR-306, NFR-309 |
| [IMP-469](11-qa-i-automatyzacja-testow.md#imp-469--e2e-offline--scenariusze-tc-sync-021040-pojemność-zdarzenia-cykl-życia) | E2E offline – scenariusze TC-SYNC-021…040 (pojemność, zdarzenia, cykl życia) | EP-11 | QA | 10 h | wysokie | IMP-458 | NFR-301, NFR-302, NFR-306, NFR-309 |
| [IMP-459](11-qa-i-automatyzacja-testow.md#imp-459--regresja-wizualna-zrzuty--odiff) | Regresja wizualna (zrzuty + odiff) | EP-11 | QA | 10 h | średnie | IMP-212, IMP-454, IMP-608 | NFR-208, NFR-210 |
| [IMP-460](11-qa-i-automatyzacja-testow.md#imp-460--testy-dostępności) | Testy dostępności | EP-11 | QA | 12 h | średnie | IMP-455, IMP-467, IMP-456, IMP-468 | NFR-201, NFR-204, NFR-206, NFR-207 |
| [IMP-461](11-qa-i-automatyzacja-testow.md#imp-461--testy-obciążeniowe-k6) | Testy obciążeniowe k6 | EP-11 | QA | 12 h | średnie | IMP-028, IMP-156 | NFR-102, NFR-802, NFR-803, NFR-804 |
| [IMP-462](11-qa-i-automatyzacja-testow.md#imp-462--testy-chaosu-i-odporności-na-staging) | Testy chaosu i odporności na staging | EP-11 | DEVOPS | 6 h | średnie | IMP-461 | NFR-307, NFR-304, NFR-305 |
| [IMP-463](11-qa-i-automatyzacja-testow.md#imp-463--przebiegi-na-urządzeniach-referencyjnych) | Przebiegi na urządzeniach referencyjnych | EP-11 | QA | 8 h | niskie | IMP-455, IMP-467, IMP-456, IMP-468 | NFR-701, NFR-702, NFR-703, NFR-704, NFR-705 |
| [IMP-464](11-qa-i-automatyzacja-testow.md#imp-464--przygotowanie-uat-i-próby-generalnej) | Przygotowanie UAT i próby generalnej | EP-11 | QA | 8 h | niskie | IMP-457 | NFR-301, US-080 |
| [IMP-465](11-qa-i-automatyzacja-testow.md#imp-465--próba-generalna--wsparcie-i-poprawki) | Próba generalna – wsparcie i poprawki | EP-11 | FULL | 16 h | wysokie | IMP-464 | US-070, US-080, US-083 |
| [IMP-466](11-qa-i-automatyzacja-testow.md#imp-466--regres-ręczny-przed-wydaniem-i-triage-defektów) | Regres ręczny przed wydaniem i triage defektów | EP-11 | QA | 12 h | średnie | IMP-463, IMP-458, IMP-469 | NFR-903, NFR-308 |
| [IMP-500](12-twardnienie-nfr.md#imp-500--profilowanie-i-optymalizacja-formularza-sędziego) | Profilowanie i optymalizacja formularza sędziego | EP-12 | MOB | 12 h | wysokie | IMP-313 | NFR-104 |
| [IMP-501](12-twardnienie-nfr.md#imp-501--optymalizacja-zimnego-startu) | Optymalizacja zimnego startu | EP-12 | MOB | 6 h | średnie | IMP-254, IMP-302 | NFR-101 |
| [IMP-502](12-twardnienie-nfr.md#imp-502--wydajność-api-pod-obciążeniem) | Wydajność API pod obciążeniem | EP-12 | BE | 8 h | średnie | IMP-461 | NFR-102, NFR-802 |
| [IMP-503](12-twardnienie-nfr.md#imp-503--pomiar-baterii-i-pamięci-tabletu) | Pomiar baterii i pamięci tabletu | EP-12 | QA | 6 h | niskie | IMP-463 | NFR-704, NFR-705 |
| [IMP-504](12-twardnienie-nfr.md#imp-504--pseudolokalizacja-i-skalowanie-tekstu--poprawki) | Pseudolokalizacja i skalowanie tekstu – poprawki | EP-12 | MOB | 6 h | niskie | IMP-459, IMP-460 | NFR-204, NFR-604 |
| [IMP-505](12-twardnienie-nfr.md#imp-505--niezawodność-wdrożeń-i-połączeń-ws) | Niezawodność wdrożeń i połączeń WS | EP-12 | BE | 4 h | średnie | IMP-216, IMP-155 | NFR-803, ADR-003 |
| [IMP-506](12-twardnienie-nfr.md#imp-506--kontrola-rozmiaru-aplikacji) | Kontrola rozmiaru aplikacji | EP-12 | MOB | 2 h | niskie | IMP-552 | NFR-109 |
| [IMP-507](12-twardnienie-nfr.md#imp-507--aktualizacja-expo-sdk-przed-wydaniem-10-jeśli-dostępna) | Aktualizacja Expo SDK przed wydaniem 1.0 (jeśli dostępna) | EP-12 | MOB | 12 h | średnie | IMP-463 | ADR-001, NFR-905 |
| [IMP-550](13-wydanie.md#imp-550--konta-i-rekordy-aplikacji-w-app-store-connect-i-google-play) | Konta i rekordy aplikacji w App Store Connect i Google Play | EP-13 | MOB | 4 h | niskie | IMP-022 | ADR-007 |
| [IMP-551](13-wydanie.md#imp-551--wpisy-w-sklepach-pl) | Wpisy w sklepach (PL) | EP-13 | DESIGN | 6 h | niskie | IMP-550, IMP-652 | FR-903 |
| [IMP-552](13-wydanie.md#imp-552--dystrybucja-testowa-dla-pilotażu) | Dystrybucja testowa dla pilotażu | EP-13 | MOB | 3 h | niskie | IMP-550, IMP-023 | ADR-007 |
| [IMP-553](13-wydanie.md#imp-553--przygotowanie-przeglądu-w-sklepach) | Przygotowanie przeglądu w sklepach | EP-13 | MOB | 3 h | średnie | IMP-178, IMP-277, IMP-179 | TL-22, TL-40 |
| [IMP-554](13-wydanie.md#imp-554--lista-kontrolna-wydania-i-runbook-dnia-zawodów) | Lista kontrolna wydania i runbook dnia zawodów | EP-13 | DEVOPS | 4 h | niskie | IMP-019, IMP-017 | NFR-905, NFR-902, ADR-010 |
| [IMP-555](13-wydanie.md#imp-555--uruchomienie-produkcji) | Uruchomienie produkcji | EP-13 | DEVOPS | 8 h | średnie | IMP-408, IMP-465, IMP-466, IMP-554, IMP-553 | ADR-007, NFR-304 |
| [IMP-556](13-wydanie.md#imp-556--wsparcie-pilotażowego-turnieju) | Wsparcie pilotażowego turnieju | EP-13 | FULL | 12 h | wysokie | IMP-555 | NFR-308, NFR-304 |
| [IMP-557](13-wydanie.md#imp-557--instrukcja-dla-organizatorów-onboarding) | Instrukcja dla organizatorów (onboarding) | EP-13 | QA | 6 h | niskie | IMP-464 | ADR-010, FR-309 |
| [IMP-600](14-spike.md#imp-600--spike-zgodność-stosu-expo-sdk-58-limit-8-h) | SPIKE: zgodność stosu Expo SDK 58 (limit 8 h) | EP-14 | MOB | 8 h | średnie | IMP-001 | ADR-001, TL-01 |
| [IMP-601](14-spike.md#imp-601--spike-pbkdf2-600k-na-tabletach-i-argon2id-na-fargate-limit-6-h) | SPIKE: PBKDF2 600k na tabletach i Argon2id na Fargate (limit 6 h) | EP-14 | MOB | 6 h | średnie | IMP-600 | NFR-110, ADR-005 |
| [IMP-602](14-spike.md#imp-602--spike-bottom-sheet--gorhombottom-sheet-vs-własny-limit-4-h) | SPIKE: bottom sheet – @gorhom/bottom-sheet vs własny (limit 4 h) | EP-14 | MOB | 4 h | niskie | IMP-600 | TL-03 |
| [IMP-603](14-spike.md#imp-603--spike-trwałość-expo-sqlite-przy-kill--9-i-utracie-zasilania-limit-8-h) | SPIKE: trwałość expo-sqlite przy kill -9 i utracie zasilania (limit 8 h) | EP-14 | MOB | 8 h | wysokie | IMP-600 | NFR-302, NFR-103, TL-20, ADR-004 |
| [IMP-604](14-spike.md#imp-604--spike-socketio-przez-alb-i-klient-rn-w-tle-limit-8-h) | SPIKE: Socket.IO przez ALB i klient RN w tle (limit 8 h) | EP-14 | FULL | 8 h | średnie | IMP-011, IMP-600 | ADR-003, NFR-105, NFR-303 |
| [IMP-605](14-spike.md#imp-605--spike-pdfmake-z-inter-i-polskimi-znakami-wydajność-limit-6-h) | SPIKE: pdfmake z Inter i polskimi znakami, wydajność (limit 6 h) | EP-14 | BE | 6 h | niskie | IMP-001 | ADR-009, NFR-107, TL-27 |
| [IMP-606](14-spike.md#imp-606--spike-animacja-splash--skia-vs-sekwencja-klatek-limit-8-h) | SPIKE: animacja splash – Skia vs sekwencja klatek (limit 8 h) | EP-14 | MOB | 8 h | niskie | IMP-600 | ADR-001, FR-210 |
| [IMP-607](14-spike.md#imp-607--spike-orientacja-i-zmiana-okna-android-16-ipados-26-limit-6-h) | SPIKE: orientacja i zmiana okna (Android 16, iPadOS 26) (limit 6 h) | EP-14 | MOB | 6 h | średnie | IMP-600 | ADR-013, TL-23, NFR-702 |
| [IMP-608](14-spike.md#imp-608--spike-regresja-wizualna-w-ci-limit-6-h) | SPIKE: regresja wizualna w CI (limit 6 h) | EP-14 | QA | 6 h | niskie | IMP-454 | NFR-210, NFR-208 |
| [IMP-609](14-spike.md#imp-609--spike-drizzle-na-expo-sqlite-i-zapis-migawki-limit-6-h) | SPIKE: Drizzle na expo-sqlite i zapis migawki (limit 6 h) | EP-14 | MOB | 6 h | niskie | IMP-600 | NFR-108, ADR-004 |
| [IMP-650](15-design-i-akceptacje.md#imp-650--akceptacja-ekranów-poza-designem-q-08) | Akceptacja ekranów poza designem (Q-08) | EP-15 | DESIGN | 16 h | średnie | – | Q-08, TL-23, TL-33, TL-47, TL-48, SCR-ORG-13, SCR-JDG-06 |
| [IMP-651](15-design-i-akceptacje.md#imp-651--wdrożenie-poprawek-projektanta-do-ekranów-poza-designem) | Wdrożenie poprawek projektanta do ekranów poza designem | EP-15 | MOB | 12 h | średnie | IMP-650, IMP-278, IMP-318 | Q-08, NFR-210 |
| [IMP-652](15-design-i-akceptacje.md#imp-652--ikona-aplikacji-splash-statyczny-materiały-do-sklepów) | Ikona aplikacji, splash statyczny, materiały do sklepów | EP-15 | DESIGN | 8 h | niskie | – | ADR-001 |
| [IMP-653](15-design-i-akceptacje.md#imp-653--akceptacja-wzorców-regresji-wizualnej) | Akceptacja wzorców regresji wizualnej | EP-15 | DESIGN | 6 h | niskie | IMP-459 | NFR-210 |

| [IMP-700](16-poprawki-ux.md#imp-700--krok-oceny-w-synchronizacji-ocen-syncpush) | Krok oceny w synchronizacji ocen (sync/push) | EP-16 | BE | 6 h | wysokie | – | ustalenie #1; FR-305, FR-603; 07-reguly-punktacji |
| [IMP-701](16-poprawki-ux.md#imp-701--widoczny-los-każdej-oceny-na-tablecie-outbox-i-popover-synchronizacji) | Widoczny los każdej oceny na tablecie (outbox i popover synchronizacji) | EP-16 | MOB | 8 h | wysokie | IMP-700 | ustalenia #1, #15, #35 (licznik); SCR-JDG-07; FR-803, FR-805 |
| [IMP-702](16-poprawki-ux.md#imp-702--ochrona-przed-podwójnym-zatwierdzeniem-oceny) | Ochrona przed podwójnym zatwierdzeniem oceny | EP-16 | MOB | 4 h | średnie | – | ustalenie #2; FR-606; TC-EDGE (podwójne kliknięcia) |
| [IMP-703](16-poprawki-ux.md#imp-703--spójny-stan-danych-organizatora-po-zapisach) | Spójny stan danych organizatora po zapisach | EP-16 | MOB | 10 h | wysokie | – | ustalenia #3, #4, #10; SCR-ORG-03, SCR-ORG-06…08, SCR-ORG-22; TL-45; FR-807 |
| [IMP-704](16-poprawki-ux.md#imp-704--ekran-zawodniczki-turnieju-i-nawigacja-wstecz) | Ekran „Zawodniczki” turnieju i nawigacja wstecz | EP-16 | MOB | 8 h | niskie | – | ustalenia #11, #28, #37, #43; SCR-ORG-07, SCR-ORG-17 |
| [IMP-705](16-poprawki-ux.md#imp-705--ryzykowne-akcje-tryb-urządzenia-pin-start-turnieju-dezaktywacja-usunięcie-konta) | Ryzykowne akcje: tryb urządzenia, PIN, start turnieju, dezaktywacja, usunięcie konta | EP-16 | FULL | 10 h | średnie | IMP-650 (teksty), decyzja PO dla (c) | ustalenia #5, #6, #7, #16, #17; SCR-SYS-01, SCR-ORG-03, SCR-ORG-15, SCR-ORG-21; FR-206, FR-308, FR-106 |
| [IMP-706](16-poprawki-ux.md#imp-706--teksty-zmienne-odmiana-liczba-mnoga-toasty) | Teksty: zmienne, odmiana, liczba mnoga, toasty | EP-16 | MOB | 7 h | niskie | IMP-650 (akceptacja tekstów) | ustalenia #8, #18, #19, #20, #21, #22, #45 (teksty), #46; NFR-210 |
| [IMP-707](16-poprawki-ux.md#imp-707--formularze-organizatora-zgoda-pola-liczbowe-klawiatura-wybór-daty) | Formularze organizatora: zgoda, pola liczbowe, klawiatura, wybór daty | EP-16 | MOB | 10 h | niskie | – | ustalenia #21, #23, #24, #25, #36, #39, #44; SCR-ORG-02, 05, 09, 10, 11, 17, 20; TC-L10N-002, TC-A11Y-007 |
| [IMP-708](16-poprawki-ux.md#imp-708--spójność-wzorców-ui-organizatora) | Spójność wzorców UI organizatora | EP-16 | MOB | 8 h | niskie | IMP-650 (nazewnictwo), IMP-706 | ustalenia #26, #27, #29, #30, #31, #32; tabela „Niespójności w nazewnictwie”; 09-design-system |
| [IMP-709](16-poprawki-ux.md#imp-709--wycofana-zawodniczka-w-rankingu-pdf-i-csv) | Wycofana zawodniczka w rankingu, PDF i CSV | EP-16 | FULL | 4 h | średnie | decyzja PO | ustalenie #12; FR-403, FR-701; SCR-ORG-08, SCR-ORG-17 |
| [IMP-710](16-poprawki-ux.md#imp-710--eksport-pdfcsv-podgląd-i-informacja-zwrotna) | Eksport PDF/CSV: podgląd i informacja zwrotna | EP-16 | MOB | 7 h | średnie | IMP-703 | ustalenia #13, #42; SCR-ORG-12; FR-705, FR-706; IMP-174 |
| [IMP-711](16-poprawki-ux.md#imp-711--pin-sędziego-informacja-o-weryfikacji-próbach-i-odblokowaniu) | PIN sędziego: informacja o weryfikacji, próbach i odblokowaniu | EP-16 | MOB | 6 h | średnie | – | ustalenia #9, #34; SCR-JDG-02, SCR-JDG-08; FR-509 |
| [IMP-712](16-poprawki-ux.md#imp-712--formularz-oceny-i-kolejka-sędziego-nieruszone-kryteria-szkice-stany-końcowe) | Formularz oceny i kolejka sędziego: nieruszone kryteria, szkice, stany końcowe | EP-16 | MOB | 8 h | średnie | IMP-650 | ustalenia #14, #35; SCR-JDG-01, 03, 04, 05; FR-603…611 |
| [IMP-713](16-poprawki-ux.md#imp-713--parowanie-tabletu-kamera-układ-nazwa-urządzenia) | Parowanie tabletu: kamera, układ, nazwa urządzenia | EP-16 | MOB | 4 h | niskie | – | ustalenie #33; SCR-JDG-06, SCR-ORG-14, SCR-ORG-16 |
| [IMP-714](16-poprawki-ux.md#imp-714--regresja-ux-na-emulatorach-telefon--tablet) | Regresja UX na emulatorach (telefon + tablet) | EP-16 | QA | 6 h | niskie | IMP-700…713, IMP-715…718 | raport UX |
| [IMP-715](16-poprawki-ux.md#imp-715--podwójne-żądania-wolny-klient-http-i-błędy-po-udanych-akcjach) | Podwójne żądania, wolny klient HTTP i błędy po udanych akcjach | EP-16 | FULL | 10 h | wysokie | – | ustalenia #4, #38; TL-45; FR-101…104; NFR-102 |
| [IMP-716](16-poprawki-ux.md#imp-716--usunięcie-danych-osobowych-każdej-zawodniczki-zakończonego-turnieju) | Usunięcie danych osobowych każdej zawodniczki zakończonego turnieju | EP-16 | FULL | 3 h | średnie | – | ustalenie #40; FR-904; SCR-ORG-17; TL-17; US-091 |
| [IMP-717](16-poprawki-ux.md#imp-717--tablet-po-zakończeniu-turnieju) | Tablet po zakończeniu turnieju | EP-16 | FULL | 8 h | wysokie | IMP-701 | ustalenie #41; SCR-JDG-01 (TL-47), SCR-JDG-02, SCR-JDG-10, SCR-ORG-14; FR-808 |
| [IMP-718](16-poprawki-ux.md#imp-718--ścieżki-konta-organizatora-adres-e-mail-reset-hasła-e-maile) | Ścieżki konta organizatora: adres e-mail, reset hasła, e-maile | EP-16 | FULL | 6 h | niskie | IMP-715, decyzja PO (zmiana e-maila) | ustalenie #45; SCR-ORG-13, SCR-ORG-21; FR-101…107 |

## EP-17 – Poprawki UX po przeglądzie 30.10

Zadania IMP-750…760: [17-poprawki-ux-2.md](17-poprawki-ux-2.md).
