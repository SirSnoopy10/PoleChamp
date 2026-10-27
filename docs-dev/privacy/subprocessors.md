# Podprzetwarzający

> IMP-406 · NFR-501 · TC-RODO-007. Wszystkie lokalizacje w EOG; zmiana listy wymaga powiadomienia administratorów
> (organizatorów) – treść klauzuli w umowie powierzenia (Q-10).

| Podmiot | Usługa | Lokalizacja | Zakres danych | Uwagi |
|---|---|---|---|---|
| Amazon Web Services EMEA SARL | RDS, ECS, S3, ElastiCache, CloudWatch, Secrets Manager, KMS | eu-central-1 (Frankfurt); kopie eu-west-1 (Irlandia) | wszystkie dane systemu | umowa DPA AWS |
| Amazon Web Services EMEA SARL | SES (e-mail) | eu-central-1 | e-mail i kody organizatorów | tylko organizatorzy |
| Functional Software (Sentry) | raporty błędów aplikacji | region UE (`*.de.sentry.io`) | zdarzenia bez PII (redakcja) | DSN z `ingest.de.sentry.io` |
| Expo (650 Industries) | buildy EAS, aktualizacje OTA | UE/USA – bez danych osób | brak danych osobowych (tylko kod aplikacji) | nie jest podprzetwarzającym danych osobowych – do potwierdzenia przez prawnika |
| HIBP (Pwned Passwords) | kontrola haseł wyciekłych | globalny CDN | 5-znakowy prefiks SHA-1 (nie jest daną osobową) | k-anonimowość, TL-41 |
