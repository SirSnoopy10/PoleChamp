# Procedura naruszeń ochrony danych (podmiot przetwarzający)

> IMP-406 · art. 33 ust. 2 RODO · 05-bezpieczenstwo §5.4. PROJEKT (Q-10).

## Kroki

| Krok | Termin | Kto | Działanie |
|---|---|---|---|
| 1. Wykrycie | – | dyżurny / każdy członek zespołu | Źródła: alarmy CloudWatch/GuardDuty, Sentry, zgłoszenie organizatora, raport pentestu. Zgłoszenie na kanale incydentów, otwarcie wpisu w rejestrze |
| 2. Ograniczenie | natychmiast | dyżurny | Unieważnienie kluczy/sesji (`ops/runbooks/jwt-rotation.md` – tryb wycieku), unieważnienie urządzeń, blokada kont, odcięcie dostępu IAM |
| 3. Ocena | ≤ 24 h od wykrycia | TL + PM | Jakie dane, ilu osób i których administratorów dotyczy (`audit_log`, CloudTrail, logi), czy dotyczy niepełnoletnich, ryzyko dla osób |
| 4. Powiadomienie administratorów | bez zbędnej zwłoki (cel ≤ 24 h) | PM | E-mail do organizatorów, których dane dotyczą: charakter naruszenia, kategorie i liczba osób, skutki, środki – aby mogli zgłosić PUODO w 72 h (art. 33 ust. 1) |
| 5. Usunięcie przyczyny | wg ważności | zespół | Poprawka, test regresji, retest |
| 6. Wnioski | ≤ 14 dni | TL | Aktualizacja modelu zagrożeń i mapowań ASVS/MASVS |

## Rejestr naruszeń

Każde naruszenie (także niezgłaszane) w rejestrze: data wykrycia, opis, dotknięci administratorzy, kategorie
i liczba osób, ocena ryzyka, działania, data powiadomienia. Narzędzie rejestru: **[do ustalenia – PM]**.

## Narzędzia operatora

- `person:export` (`apps/api/src/cli/operator.ts`, `tools/scripts/run-cli.sh`) – dane osoby; zakres zmian – `GET /tournaments/{id}/audit-log` i zapytania na replice tylko do odczytu.
- CloudWatch Logs Insights – identyfikator żądania (`X-Request-Id`).
