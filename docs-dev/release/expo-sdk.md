# Expo SDK przed wydaniem 1.0 (IMP-507)

Polityka: ADR-001, R-11, NFR-905 – 1.0 na najnowszym stabilnym SDK wydanym ≥ 6 tygodni przed zamrożeniem; później aktualizacje tylko między sezonami. Polityka zależności projektu: wersje opublikowane ≥ 7 dni temu.

## Decyzja 27.10.2026: **bez zmian** (SDK 58)

| Fakt | Wartość |
|---|---|
| Zainstalowane `expo` | 58.0.19 (`npm view expo dist-tags.latest` = 58.0.19) |
| Wydanie 58.0.19 | 23.10.2026 – młodsze niż tydzień; patch nie jest aktualizowany (polityka wieku) |
| SDK 59 | nie istnieje w rejestrze npm (stabilny ani `next`) |
| Zamrożenie 1.0 | termin PM (IMP-550/99-przekazanie) – nieustalony |

Wniosek: aktualizacja SDK 59 niemożliwa; patch SDK 58 już najnowszy. Ponowna kontrola: przy planowaniu zamrożenia 1.0 – jeśli SDK 59 wyjdzie ≥ 6 tygodni wcześniej, gałąź `chore/expo-sdk-59` wg kroków IMP-507 (dev client, `preview`, pełny regres Maestro, TC-COMPAT-001/009, nowy `runtimeVersion`). Inaczej `npx expo install --fix` dla patchy SDK 58 starszych niż tydzień.
