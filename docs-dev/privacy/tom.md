# Środki techniczne i organizacyjne (TOM) – załącznik do umowy powierzenia

> IMP-406 · art. 28 ust. 3 lit. c i art. 32 RODO · PROJEKT (Q-10). Szczegóły: `docs-dev/security/asvs-mapping.md`,
> `docs-dev/security/masvs-mapping.md`, `docs-dev/security/threat-model.md`.

| Obszar | Środek |
|---|---|
| Poufność – dostęp | Konta organizatorów: hasło (min. 10 znaków, kontrola haseł wyciekłych), Argon2id, blokada po 5 nieudanych próbach. Sędziowie: sparowany tablet + PIN (limity prób, blokada). Autoryzacja na każdym zasobie (organizator widzi tylko swoje turnieje) |
| Poufność – transmisja | TLS 1.2+ (HSTS), tokeny JWT ES256 o krótkim czasie życia |
| Poufność – przechowywanie | Szyfrowanie w spoczynku (RDS, S3 – KMS), sekrety w AWS Secrets Manager, na urządzeniach Keychain/Keystore; brak kopii zapasowych danych tabletu |
| Integralność | Wyniki liczone tylko na serwerze, rewizje ocen tylko do dopisywania, audyt zmian (rola bazy bez UPDATE/DELETE), suma SHA-256 wyników w PDF |
| Dostępność | Tryb offline tabletów, kopie RDS (PITR 35 dni, kopia w drugim regionie UE), test odtworzenia raz na kwartał |
| Minimalizacja i retencja | Zakres danych ograniczony (bez PESEL, adresu, kontaktu zawodniczki); pseudonimizacja automatyczna po 24 mies.; usuwanie danych z tabletu po 7 dniach |
| Brak PII w telemetrii | Redakcja logów i zdarzeń błędów; test automatyczny (TC-SEC-017) |
| Rozliczalność | Dziennik audytu 36 mies., identyfikator żądania, rejestr operacji operatora (CLI) |
| Testowanie | Testy automatyczne bezpieczeństwa w CI, testy nadużyć przed wydaniem, pentest zewnętrzny przed pierwszym turniejem produkcyjnym |
| Organizacja | Dostęp produkcyjny tylko dla wyznaczonych osób (IAM, MFA), procedura naruszeń (`breach-procedure.md`), zobowiązanie do poufności personelu **[do uzupełnienia – PM]** |
| Podprzetwarzający | `subprocessors.md`; tylko EOG |
