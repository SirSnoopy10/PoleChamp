# ADR-007: Hosting na AWS eu-central-1, IaC w Terraform, CI/CD w GitHub Actions + EAS

- **Status:** Zaakceptowana – potwierdzona przez Tech Leada 23.10.2026 (Q-13 zamknięte: AWS; szacunek kosztów na końcu)
- **Data:** 2026-10-23
- **Powiązane:** [01-przeglad-architektury.md §3, §6](../01-przeglad-architektury.md#3-kontenery-c4--poziom-2), [05-bezpieczenstwo.md](../05-bezpieczenstwo.md)

## Kontekst
- Dane osobowe (także niepełnoletnich) muszą zostać w EOG.
- Potrzebne są: długotrwałe połączenia WebSocket, zarządzany PostgreSQL z PITR, Redis, magazyn plików, e-mail, sekrety.
- Obciążenie jest skokowe: weekendy zawodów (szczyty), w tygodniu minimalne.

## Decyzja
- **AWS eu-central-1 (Frankfurt):** ECS Fargate (usługa `api` min. 2 zadania w 2 AZ, `worker` 1 zadanie), Application Load Balancer (HTTPS + WSS, idle timeout 300 s), RDS PostgreSQL 18 Multi-AZ (prod), ElastiCache Valkey, S3 (SSE-KMS, lifecycle 7 dni dla PDF), SES, Secrets Manager, KMS, CloudWatch (+ Synthetics), WAF, GuardDuty, ECR.
- **Infrastruktura jako kod: Terraform** (moduły per środowisko: `dev`, `staging`, `production`), stan w S3 + DynamoDB lock.
- **CI/CD:** GitHub Actions – PR: lint, typecheck, testy jednostkowe, testy integracyjne (Testcontainers PostgreSQL + Valkey), build; `main`: obraz → ECR → wdrożenie `dev` automatycznie, `staging` po tagu, `production` po zatwierdzeniu (environment protection). Migracje bazy jako osobny krok przed wdrożeniem (zgodne wstecz, wzorzec expand/contract).
- **Mobile:** EAS Build (profile `development`, `preview`, `production`), EAS Submit (TestFlight, Google Play internal → production), EAS Update (kanały `dev` / `staging` / `production`).
- **Polityka „dni zawodów”:** brak wdrożeń produkcyjnych i OTA w oknach turniejów oznaczonych jako krytyczne, z wyjątkiem poprawek krytycznych zatwierdzonych przez dyżurnego.

## Rozważane alternatywy
| Opcja | Za | Przeciw | Werdykt |
|---|---|---|---|
| **GCP (Cloud Run + Cloud SQL), region europe-central2 Warszawa** | Dane w Polsce, prosty serverless | Cloud Run ma limit czasu żądania (do 60 min) dla WS, wymaga obsługi ponownych połączeń. Zespół częściej zna AWS | Realna alternatywa – do ponownej oceny przez Tech Leada |
| **Azure (Poland Central)** | Region w Polsce | Mniejsza znajomość w zespole (założenie) | Odrzucona |
| **Fly.io / Render / Railway** | Bardzo prosty start, tanio | Mniej kontroli nad zgodnością (DPA, lokalizacja kopii), ograniczone usługi zarządzane | Odrzucona dla produkcji (możliwa dla `dev`) |
| **Serverless (Lambda + API Gateway WS)** | Koszt zerowy w spoczynku | Zimne starty, inny model WS, trudniejsze transakcje długie i outbox | Odrzucona |
| **VPS + Docker Compose** | Najtańsze | Ręczne HA, kopie i bezpieczeństwo | Odrzucona |

## Konsekwencje
- ➕ Dane w UE, zarządzane HA i kopie, dojrzałe narzędzia bezpieczeństwa.
- ➖ Koszt bazowy (ALB, NAT, RDS Multi-AZ) rzędu kilkuset USD/mies. w prod – do oszacowania przez PM. Możliwe oszczędności: single-AZ poza sezonem, Fargate Spot dla `worker`.
- ⚠ Ryzyko: złożoność Terraform dla małego zespołu – mitygacja: oficjalne moduły `terraform-aws-modules`, jedno konto per środowisko (AWS Organizations).

## Weryfikacja Tech Leada (23.10.2026)

- **Q-13 (AWS Frankfurt vs GCP Warszawa) – rozstrzygnięte: AWS eu-central-1.** Powody: ALB obsługuje długie połączenia WebSocket bez limitu czasu żądania (Cloud Run ma limit 60 min i wymaga ponownych połączeń), RDS Multi-AZ z PITR 35 dni, SES w tym samym regionie, mniejsze ryzyko zespołowe. GCP Warszawa nie daje przewagi prawnej (oba regiony w EOG). Ponowna ocena tylko przy twardym limicie budżetu PM.
- **Szacunek kosztów (ceny katalogowe eu-central-1, orientacyjnie, bez podatku):** produkcja ok. **350–450 USD/mies.** (największe pozycje: RDS Multi-AZ db.t4g.medium ~130, NAT ×2 ~80, ECS Fargate ARM 3 zadania ~50, ALB ~25, Valkey z repliką ~25, WAF + GuardDuty + Synthetics + logi ~60), staging ok. **120–170 USD/mies.** (single-AZ, 1 NAT, nocne skalowanie do zera), dev ok. **60–100 USD/mies.**; poza AWS: Sentry Team, EAS (plan płatny), Apple Developer 99 USD/rok, Google Play 25 USD jednorazowo. Szczegóły i założenia: [98-weryfikacja-tech-leada.md §5](../98-weryfikacja-tech-leada.md#5-zgrubny-koszt-środowisk-aws). Przed akceptacją budżetu PM liczy wariant w AWS Pricing Calculator.
- ALB idle timeout 300 s potwierdzony (zakres 1–4000 s, domyślnie 60 s).
