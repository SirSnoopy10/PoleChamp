## Opis

<!-- IMP-NNN: co i dlaczego. Lista TC i opis testu ręcznego. -->

## Testy

- [ ] Lint, typecheck, testy jednostkowe
- [ ] Testy integracyjne (`pnpm --filter @polechamp/api test:int`), jeśli dotyczy API

## Bezpieczeństwo (IMP-400)

- [ ] **Zmiana bezpieczeństwa?** Jeśli tak – zaktualizowany `docs-dev/security/threat-model.md` i mapowanie ASVS/MASVS
- [ ] Nowa trasa → `@Public()`/`@Auth(...)`, `x-permissions` w `routes.ts` i wiersz macierzy TC-AUTHZ (`apps/api/test/authz/matrix.ts`)
- [ ] Zasoby organizatora przez `OwnershipRepository` (cudzy → 404)
- [ ] Dane osobowe → redakcja logów (`scrubPii`/`scrubText`), wpis w `docs-dev/privacy/data-inventory.md`
- [ ] Sekrety → Secrets Manager / SecureStore; nic w repozytorium, bundlu ani logach
- [ ] Nowa zależność → wiek ≥ 7 dni, `allowBuilds` tylko gdy niezbędne
