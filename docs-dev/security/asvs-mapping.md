# Mapowanie OWASP ASVS 5.0 – poziom 2 (API)

> IMP-400 · TC-SEC-001 · NFR-401, TL-26. Kontrola spójności: `pnpm --filter @polechamp/security-tools test`
> (każdy rozdział V1–V17 obecny, ścieżki istnieją, TC istnieją w planach testów, status z listy).

Statusy: **spełnione** · **częściowo** (luka w backlogu poniżej) · **nie dotyczy** (z uzasadnieniem).
Wyjątki wymagają akceptacji TL (kolumna „Uwagi”).

| Rozdział | Obszar | Implementacja | Testy | Status | Uwagi |
|---|---|---|---|---|---|
| V1 | Kodowanie i sanityzacja | `apps/api/src/db/schema.ts` (Drizzle – zapytania parametryzowane), `apps/api/src/common/validation/zod.pipe.ts`; PDF bez HTML (`apps/api/src/modules/exports`) | TC-SEC-022 | spełnione | Brak SQL z łączenia napisów; CSV – neutralizacja formuł w eksporcie (`=`,`+`,`-`,`@`) |
| V2 | Walidacja i logika biznesowa | `packages/contracts/src/schemas`, `apps/api/src/common/validation/zod.pipe.ts`, `apps/api/src/common/concurrency/etag.ts` (`If-Match`), `apps/api/src/common/idempotency/idempotency.interceptor.ts` | TC-SEC-022, TC-SEC-011 | spełnione | Schematy `strict` (nieznane pola odrzucane), limity długości i zakresów |
| V3 | Bezpieczeństwo frontendu web | – | – | nie dotyczy | API bez przeglądarkowego frontendu w MVP (web v2); strona `apps/site` statyczna, bez sesji |
| V4 | API i usługi web | `apps/api/src/bootstrap.ts` (limit treści 1 MB, nagłówki bezpieczeństwa), `packages/contracts/src/openapi/routes.ts` | TC-SEC-003, TC-SEC-022, TC-CONTRACT-001 | spełnione | Każda trasa w kontrakcie OpenAPI; WS `/rt` z tokenem przy połączeniu |
| V5 | Obsługa plików | `apps/api/src/infra/storage.ts` (S3, podpisane URL, `expires=7d`) | TC-API-090 | częściowo | Brak przesyłania plików od klienta; wygaśnięcie bucketu przez Terraform (IMP-012 – SEC-GAP-04) |
| V6 | Uwierzytelnianie | `apps/api/src/modules/auth/password.service.ts` (Argon2id, HIBP + lista lokalna), `apps/api/src/modules/auth/auth.service.ts` (blokada konta), `apps/api/src/modules/devices/judge-sessions.service.ts` (PIN, limity) | TC-SEC-012, TC-SEC-013, TC-SEC-014, TC-SEC-015, TC-SEC-025 | spełnione | MFA dla organizatora – v1.1 (wyjątek zaakceptowany w ADR-008) |
| V7 | Zarządzanie sesją | `apps/api/src/modules/auth/auth.service.ts` (refresh rotowany, rodzina, `TOKEN_REUSED`), `apps/api/src/modules/devices/judge-sessions.service.ts` | TC-SEC-008, TC-API-011, TC-API-012 | spełnione | Wylogowanie unieważnia rodzinę; reset hasła – wszystkie rodziny |
| V8 | Autoryzacja | `apps/api/src/common/auth/auth.guard.ts` (domyślnie odmowa), `apps/api/src/db/repositories` (`OwnershipRepository`), `apps/api/test/authz/matrix.ts` | TC-SEC-010, TC-SEC-011, TC-AUTHZ-001 | spełnione | Macierz 8 kontekstów × każda trasa z `openapi.json` |
| V9 | Tokeny samodzielne (JWT) | `apps/api/src/modules/auth/jwt.service.ts` (ES256, `kid`, `iss`, `aud`, `typ`, active/next/previous) | TC-SEC-009, TC-SEC-024 | spełnione | `alg` przypięty do ES256; rotacja – `ops/runbooks/jwt-rotation.md` (IMP-405) |
| V10 | OAuth i OIDC | – | – | nie dotyczy | Brak OAuth/OIDC w MVP (ADR-008); Sign in with Apple/Google – v1.1 |
| V11 | Kryptografia | `apps/api/src/crypto/pin-wrap.ts` (HKDF + AES-GCM, TL-04), `apps/api/src/modules/auth/password.service.ts` | TC-SEC-025, TC-SEC-009 | spełnione | `crypto.randomBytes` dla sekretów; klucze w Secrets Manager (IMP-014 – SEC-GAP-01) |
| V12 | Bezpieczna komunikacja | ALB + ACM (Terraform IMP-012), HSTS w `apps/api/src/bootstrap.ts` | TC-SEC-003 | częściowo | TLS kończy się na ALB – konfiguracja polityki TLS w Terraform niewykonana (SEC-GAP-01) |
| V13 | Konfiguracja | `apps/api/src/config/env.ts` (walidacja zmiennych, blokada `E2E_HELPERS` w produkcji), `pnpm-workspace.yaml` (`allowBuilds`) | TC-SEC-004, TC-SEC-005, TC-SEC-018 | częściowo | gitleaks i SBOM w CI – SEC-GAP-02 |
| V14 | Ochrona danych | `packages/contracts/src/privacy.ts` (`scrubPii`), `apps/api/src/worker/retention/retention.job.ts`, `apps/api/src/modules/audit` | TC-SEC-017, TC-RODO-001, TC-RODO-003 | spełnione | Inwentarz – `docs-dev/privacy/data-inventory.md` (IMP-406) |
| V15 | Bezpieczne kodowanie i architektura | `apps/api/src/db/sequence.ts`, `apps/api/src/db/repositories`, `apps/api/test/integration/db-integrity.test.ts` | TC-INT-008, TC-SEC-019, TC-SEC-005 | spełnione | Test architektury repozytoriów i ról bazy (IMP-409) |
| V16 | Logowanie i obsługa błędów | `apps/api/src/common/errors/problem.filter.ts` (RFC 9457 bez stosu), `apps/api/src/modules/audit`, `apps/api/src/common/request-context.ts` | TC-AUDIT-001, TC-AUDIT-002, TC-SEC-017 | spełnione | Audyt tylko do dopisywania (rola `pc_app` bez UPDATE/DELETE) |
| V17 | WebRTC | – | – | nie dotyczy | System nie używa WebRTC |

## Luki (backlog, zakres pentestu IMP-408)

| ID | Priorytet | Opis | Zadanie | W zakresie pentestu |
|---|---|---|---|---|
| SEC-GAP-01 | P1 | Infrastruktura AWS (TLS na ALB, KMS, Secrets Manager, WAF) nie istnieje – konfiguracja tylko w planie | IMP-012, IMP-014 | tak (konfiguracja TLS, WAF) |
| SEC-GAP-02 | P1 | gitleaks, SBOM (CycloneDX), Semgrep i ZAP nie są w CI | IMP-027 | tak (wynik ZAP jako wejście) |
| SEC-GAP-03 | P2 | MFA (TOTP) dla organizatora | v1.1 | nie |
| SEC-GAP-04 | P2 | Reguła wygaśnięcia bucketu eksportów (tag `expires=7d`) | IMP-012 | tak (dostęp do starych podpisanych URL) |
| SEC-GAP-06 | P3 | iOS: baza tabletu bez `NSURLIsExcludedFromBackupKey` (moduł natywny); tablety referencyjne to Android | backlog (MASVS-STORAGE-2) | tak (aplikacja iOS) |
| SEC-GAP-05 | P2 | Adapter Socket.IO bez `commandTimeout` Valkey (odporność na DoS) | backlog | tak (DoS WS) |
