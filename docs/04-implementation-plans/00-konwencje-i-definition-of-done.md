# Konwencje, Definition of Done i Definition of Ready

> Dokument: `04-implementation-plans/00-konwencje-i-definition-of-done.md` · Tech Lead (Agent 2) · Wersja 1.0 · 23.10.2026
> Plan zawiera **250 zadań** na łącznie **1679 h** (bez buforów). Indeks: [91-indeks-zadan.md](91-indeks-zadan.md) · Graf i ścieżka krytyczna: [90-graf-zaleznosci.md](90-graf-zaleznosci.md) · Przekazanie dla PM: [99-przekazanie-dla-pm.md](99-przekazanie-dla-pm.md) · Plan testów: [../03-test-plans/](../03-test-plans/00-strategia-testowania.md) · Weryfikacja dokumentacji: [98-weryfikacja-tech-leada.md](../01-architecture/98-weryfikacja-tech-leada.md)

## 1. Pliki planu

| Plik | Epik | Zakres |
|---|---|---|
| [01-fundamenty-i-devops.md](01-fundamenty-i-devops.md) | EP-01 | monorepo, CI/CD, Terraform, środowiska, observability |
| [02-pakiety-wspoldzielone.md](02-pakiety-wspoldzielone.md) | EP-02 | `@polechamp/scoring`, `contracts`, `tokens`, `i18n` |
| [03-backend-konto-i-konfiguracja-turnieju.md](03-backend-konto-i-konfiguracja-turnieju.md) | EP-03 | szkielet API, baza, auth organizatora, turnieje, kategorie, kryteria, kary, zawodniczki, sędziowie |
| [04-backend-urzadzenia-ocenianie-synchronizacja.md](04-backend-urzadzenia-ocenianie-synchronizacja.md) | EP-04 | parowanie, sesje PIN, migawka, sync push/pull, oceny, odrzucenia, wyniki, realtime |
| [05-backend-eksport-audyt-rodo.md](05-backend-eksport-audyt-rodo.md) | EP-05 | worker, PDF, CSV, audyt, retencja, CLI operatora, strona statyczna |
| [06-mobile-fundamenty-i-design-system.md](06-mobile-fundamenty-i-design-system.md) | EP-06 | szkielet Expo, komponenty Nocturne, klient API, cache, realtime |
| [07-mobile-ekrany-organizatora.md](07-mobile-ekrany-organizatora.md) | EP-07 | SCR-ORG-00…22 |
| [08-mobile-ekrany-sedziego.md](08-mobile-ekrany-sedziego.md) | EP-08 | SCR-JDG-00…10 |
| [09-mobile-offline-i-synchronizacja.md](09-mobile-offline-i-synchronizacja.md) | EP-09 | SQLite, outbox, SyncEngine |
| [10-bezpieczenstwo-i-rodo.md](10-bezpieczenstwo-i-rodo.md) | EP-10 | ASVS/MASVS, twardnienie, nadużycia, pentest, materiały RODO |
| [11-qa-i-automatyzacja-testow.md](11-qa-i-automatyzacja-testow.md) | EP-11 | fikstury, harness, macierz uprawnień, Maestro, wizualne, k6, UAT |
| [12-twardnienie-nfr.md](12-twardnienie-nfr.md) | EP-12 | wydajność, bateria, skalowanie tekstu, aktualizacja SDK |
| [13-wydanie.md](13-wydanie.md) | EP-13 | sklepy, przegląd, produkcja, pilotaż |
| [14-spike.md](14-spike.md) | EP-14 | spike'i z kryterium decyzji i limitem czasu |
| [15-design-i-akceptacje.md](15-design-i-akceptacje.md) | EP-15 | akceptacje projektanta, zasoby graficzne |
| [16-poprawki-ux.md](16-poprawki-ux.md) | EP-16 | poprawki z testu UX (28.10.2026) |

## 2. Skala szacowania

Szacunki są w **godzinach pracy jednej osoby** i obejmują: implementację, testy z przypisanych przypadków TC, aktualizację kontraktu/dokumentacji technicznej i samodzielny przegląd przed PR. **Nie obejmują**: czasu recenzenta, spotkań, naprawy defektów znalezionych później, przełączania kontekstu – te pozycje PM uwzględnia buforem ([99-przekazanie-dla-pm.md §1](99-przekazanie-dla-pm.md#1-suma-szacunków)).

| Rozmiar | Godziny | Znaczenie |
|---|---|---|
| XS | 1–2 h | konfiguracja, drobna zmiana |
| S | 3–4 h | mały endpoint, prosty komponent |
| M | 5–8 h | typowe zadanie (endpoint z logiką, ekran prosty, moduł) |
| L | 9–12 h | złożony ekran lub moduł, integracja kilku elementów |
| XL | 13–16 h | maksymalny rozmiar zadania; większe zadania dzielimy |

Ryzyko zadania: **niskie** (znana technologia, jasna specyfikacja), **średnie** (integracja, zależność od spike'u lub platformy), **wysokie** (krytyczne dla integralności danych lub wydajności, możliwa przeróbka). Bufor ryzyka w planie PM: niskie +10%, średnie +25%, wysokie +50%.

## 3. Globalna Definition of Done

Każde zadanie IMP jest „zrobione”, gdy spełnia **wszystkie** poniższe punkty oraz punkty szczegółowe z karty zadania:

1. Kod scalony do `main` przez PR z co najmniej jednym zatwierdzeniem (zmiany w `packages/scoring`, `apps/api/src/modules/{sync,scoring,auth,judge-sessions}`, `apps/mobile/src/sync` – zatwierdzenie Tech Leada).
2. CI zielone: lint, typecheck, testy jednostkowe/komponentowe/integracyjne, progi pokrycia ([00-strategia §9](../03-test-plans/00-strategia-testowania.md#9-progi-pokrycia-nfr-903)), gitleaks, audyt zależności.
3. Przypadki testowe wskazane w zadaniu (TC-…) są zaimplementowane jako testy automatyczne (nazwa testu zawiera ID) albo – dla przypadków ręcznych – wykonane i opisane w PR.
4. Kontrakt: nowe/zmienione endpointy i zdarzenia są w `@polechamp/contracts` i OpenAPI (`x-permissions`), test zgodności tras i `oasdiff` przechodzą; macierz TC-AUTHZ zawiera nowe endpointy.
5. UI: zgodność z tokenami Nocturne i checklistą [09-design-system §7](../02-specification/09-design-system.md#7-czego-nie-robić-checklista-pr); teksty wyłącznie z kluczy i18n (teksty wiążące identyczne ze specyfikacją); etykiety i role a11y; stany ładowania/pusty/błąd/offline; zrzuty ekranu w PR (telefon/tablet, iOS/Android).
6. Bezpieczeństwo i prywatność: brak sekretów i danych osobowych w logach/telemetrii; zmiany stanu zapisują `audit_log` (backend); uprawnienia sprawdzone guardami.
7. Migracje bazy zgodne wstecz (expand/contract); migracje SQLite tabletu zachowują outbox i arkusze.
8. Dokumentacja: aktualizacja README modułu lub runbooka, jeśli zadanie zmienia sposób uruchamiania lub operowania; odstępstwo od dokumentacji Architekta/TL zgłoszone i opisane (ADR lub wpis TL).
9. Wdrożone na `dev` (backend) lub dostępne w buildzie `preview`/kanale `staging` (mobile) i sprawdzone ręcznie przez autora.

## 4. Definition of Ready

Zadanie może trafić do sprintu, gdy:
- ma kompletną kartę (cel, zakres, zależności, odwołania, kroki, DoD, szacunek, ryzyko),
- zależności są zrobione albo zaplanowane wcześniej w tym samym sprincie,
- specyfikacja ekranu/endpointu jest jednoznaczna; ekrany „poza designem” mają akceptację projektanta ([IMP-650](15-design-i-akceptacje.md)) lub świadomą decyzję PO o realizacji przed akceptacją,
- powiązane pytania Q-xx są rozstrzygnięte albo przyjęto założenie domyślne z [99-przekazanie-dla-tech-leada.md §5](../01-architecture/99-przekazanie-dla-tech-leada.md#5-pytania-otwarte) / [98-weryfikacja §8](../01-architecture/98-weryfikacja-tech-leada.md#8-kwestie-otwarte),
- spike, od którego zależy zakres (IMP-600…609), ma zapisaną decyzję,
- przypadki testowe TC są znane (lista w karcie).

## 5. Struktura monorepo

```
polechamp/
├─ apps/
│  ├─ api/                       NestJS 12 + Fastify 5 (Node 26 LTS)
│  │  ├─ src/main.ts | worker.ts | cli.ts
│  │  ├─ src/modules/            auth, account, app-config, tournaments, categories, entries, judges,
│  │  │                          devices, judge-sessions, scoring, results, sync, rejected, realtime,
│  │  │                          exports, audit, privacy, email, limits
│  │  ├─ src/common/             errors, guards, idempotency, concurrency, rate-limit, logging, metrics, config
│  │  ├─ src/db/                 schema/*.ts (Drizzle), migrations/, repositories/, tx.ts
│  │  ├─ src/worker/             pdf, email, retention
│  │  ├─ src/cli/                polecenia operatora (TL-38)
│  │  └─ test/                   integration/, authz/, contract/, pdf/, setup/
│  ├─ mobile/                    Expo SDK 58 (RN 0.88, Expo Router)
│  │  ├─ app/                    (system)/, (org)/, (judge)/, (dev)/
│  │  ├─ src/ui/                 komponenty Nocturne (Button, StatusPill, Sheet, Toast, ScoreSlider…)
│  │  ├─ src/features/           organizer/<ekran>/, judge/<ekran>/, system/
│  │  ├─ src/data/               api/ (openapi-fetch), query/ (TanStack Query + MMKV), realtime/, local/ (SQLite)
│  │  ├─ src/sync/               outbox, push, pull, engine, store, rejections
│  │  ├─ src/auth/               org-session, device-session, judge-login, judge-session
│  │  ├─ src/crypto/             pin-verifier (PBKDF2, HKDF, AES-GCM)
│  │  ├─ src/dev/catalog/        DevCatalog (tylko development)
│  │  └─ e2e/maestro/            org/, judge/, full/, sync/
│  └─ site/                      strony statyczne (dokumenty prawne, .well-known)
├─ packages/
│  ├─ scoring/                   czyste funkcje punktacji (bez zależności runtime)
│  ├─ contracts/                 zod 4, OpenAPI 3.1, kody błędów, zdarzenia WS, typy klienta
│  ├─ tokens/                    tokeny Nocturne
│  ├─ i18n/                      słowniki PL, liczba mnoga, formatery
│  └─ test-fixtures/             seed prototypu i fikstury FX-*
├─ infra/terraform/              modules/ (network, database, cache, compute, storage, static-site,
│                                email, secrets, security-baseline), envs/{dev,staging,production}, bootstrap/
├─ ops/                          freeze-windows.yaml, runbooks/
├─ tools/                        eslint-rules/, k6/, visual/, security/, chaos/, network/, e2e/, scripts/
└─ docs/                         dokumentacja projektu (ten katalog)
```

## 6. Gałęzie, PR i wydania

- **Trunk-based:** krótkie gałęzie `feat/IMP-123-opis`, `fix/…`, `chore/…`; scalanie do `main` przez squash; gałąź żyje ≤ 3 dni.
- **PR:** tytuł `IMP-123: <opis>` (Conventional Commits w commitach), opis z listą TC, zrzutami UI, ryzykiem i sposobem testu; maks. ~400 zmienionych linii (poza wygenerowanymi); flagi funkcji dla niedokończonych ekranów (`EXPO_PUBLIC_FEATURE_*`, wyłączone w produkcji).
- **Przegląd:** 1 zatwierdzenie; obszary krytyczne – TL (§3 pkt 1); zmiany Terraform – DevOps.
- **Wydania backendu:** `main` → `dev` automatycznie; tag `api-vX.Y.Z` → `staging`; zatwierdzenie środowiska → `production` (z `freeze-guard`).
- **Wydania mobile:** tag `mobile-vX.Y.Z` → EAS Build `production` → sklepy; poprawki JS przez EAS Update (`runtimeVersion` = fingerprint), nigdy w oknie zamrożenia bez `hotfix-approved`.
- **Semver:** API i aplikacja; API zgodne wstecz z 2 poprzednimi wersjami aplikacji (NFR-907).

## 7. Konwencje nazewnictwa

| Element | Konwencja | Przykład |
|---|---|---|
| Tabele / kolumny | `snake_case`, angielskie | `score_sheet.total_hundredths` |
| Pola JSON / TS | `camelCase` | `totalHundredths`, `pendingMutations` |
| Ścieżki REST | liczba mnoga, kebab-case | `/v1/penalty-types/{id}` |
| Kody błędów | `UPPER_SNAKE` | `CATEGORY_LOCKED` |
| Zdarzenia WS | `domena.czasownik` | `category.locked` |
| Klucze i18n | `obszar.ekran.element` | `org.category.startButton`, `toast.scoreSaved` |
| `testID` | `<tryb>.<ekran>.<element>` | `judge.form.submitButton` |
| Komponenty RN | PascalCase, plik = komponent | `ScoreSlider.tsx` |
| Moduły NestJS | kebab-case katalog, `*.module.ts`, komendy `*.command.ts` | `judge-sessions/login.command.ts` |
| Testy | ID przypadku w nazwie | `it('TC-API-037 blokada z ostrzeżeniami', …)` |
| Migracje | `NNNN_opis.sql` | `0004_audit_change_log.sql` |
| Wartości punktowe w kodzie | sufiks jednostki | `weightTenths`, `officialHundredths` |

## 8. Środowiska

| Środowisko | Backend | Mobile | Dane | Kto wdraża |
|---|---|---|---|---|
| `local` | Docker Compose (PG 18, Valkey, MinIO, Mailpit) | dev client na symulatorze/urządzeniu | `FX-SEED` | programista |
| `dev` | ECS 1 zadanie, RDS single-AZ micro | kanał EAS `dev` | syntetyczne | automatycznie z `main` |
| `staging` | jak produkcja, mniejsze instancje, nocne skalowanie do 0 | kanał `staging`, build `preview` | `seed:staging`, `FX-MAX` | tag `api-v*` |
| `production` | ECS ≥ 2 zadania w 2 AZ, RDS Multi-AZ, PITR 35 dni | kanał `production`, sklepy | rzeczywiste | zatwierdzenie + freeze-guard |

## 9. Format karty zadania

```
### IMP-NNN – <tytuł>
- Epik / obszar | Rola (BE / MOB / FULL / DEVOPS / QA / DESIGN)
- Cel
- Zakres; Poza zakresem
- Zależności (IMP-…)
- Odwołania (FR, US, SCR, ADR, NFR, TL, Q, TC)
- Kroki
- Definition of Done (punkty szczegółowe + globalna DoD §3)
- Szacunek (h i rozmiar) | Ryzyko
```

Role: **BE** – backend (NestJS, baza), **MOB** – React Native/Expo, **FULL** – zadanie łączące backend i aplikację (może wykonać BE lub MOB), **DEVOPS** – infrastruktura i pipeline, **QA** – automatyzacja i testy, **DESIGN** – projektant.
