# Ochrona gałęzi `main` (IMP-003)

Ustawienia w GitHub → Settings → Branches → Branch protection rule dla `main` (albo ruleset):

- Wymagaj PR przed scaleniem, **1 zatwierdzenie**; odrzucaj nieaktualne zatwierdzenia po nowych commitach.
- Wymagane statusy (workflow `pr`): `lint`, `typecheck`, `unit`, `secrets`, `audit`.
  Status `integration` dochodzi po pierwszym zielonym przebiegu w IMP-004.
- Wymagaj aktualności gałęzi z `main` przed scaleniem.
- Zakaz force-push i usuwania gałęzi.
- Scalanie tylko przez squash (00-konwencje §6).

Czas pipeline: cel ≤ 15 min p90 (NFR-903). Sprawdzaj w zakładce Actions → `pr` → Insights.
