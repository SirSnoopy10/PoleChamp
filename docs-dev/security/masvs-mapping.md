# Mapowanie OWASP MASVS 2.x – profil MAS-L1 (+ wybrane L2)

> IMP-401 · TC-SEC-002 · NFR-401, TL-26, R-06. Kontrola spójności: `pnpm --filter @polechamp/security-tools test`.
> Wyniki testów ręcznych i pentestu (IMP-408) dopisywać w kolumnie „Uwagi” z datą i wersją buildu.

Statusy: **spełnione** · **wyjątek** (zaakceptowane ryzyko) · **nie dotyczy** · **do weryfikacji** (test ręczny przed wydaniem).

| Kontrola | Implementacja | Test MASTG / TC | Status | Uwagi |
|---|---|---|---|---|
| MASVS-STORAGE-1 | `apps/mobile/src/data/secure/secureStore.ts` (Keychain `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` / Keystore), `apps/mobile/src/data/auth/deviceAuth.ts`, `apps/mobile/src/crypto/pinVerifier.ts` | MASTG-TEST-0001, MASTG-TEST-0052, TC-SEC-016 | wyjątek | L2: SQLite bez SQLCipher – wyjątek R-06 (niżej) |
| MASVS-STORAGE-2 | `apps/mobile/plugins/with-no-backup.js` (Android `allowBackup=false`, `dataExtractionRules`), `apps/mobile/babel.config.js` (bez `console.*` w produkcji), `apps/mobile/src/observability/scrub.ts` | MASTG-TEST-0009, MASTG-TEST-0003, TC-SEC-016, TC-SEC-017 | do weryfikacji | iOS: baza w `Documents` bez `NSURLIsExcludedFromBackupKey` (wymaga modułu natywnego) – SEC-GAP-06 |
| MASVS-CRYPTO-1 | `apps/mobile/src/crypto/pinCrypto.ts` (PBKDF2-SHA256 600 000, HKDF, AES-256-GCM – `react-native-quick-crypto`) | MASTG-TEST-0013, TC-SEC-025 | spełnione | Brak własnych algorytmów; wektory TL-04 wspólne z API |
| MASVS-CRYPTO-2 | Klucze z peppera urządzenia (HKDF) – pepper tylko w SecureStore | MASTG-TEST-0014, TC-SEC-016 | spełnione | Klucz nie jest zapisywany; liczony przy logowaniu |
| MASVS-AUTH-1 | `apps/mobile/src/data/api/tokens.ts`, `apps/mobile/src/data/auth/orgSession.ts` (refresh w middleware) | MASTG-TEST-0017, TC-SEC-008 | spełnione | Uwierzytelnianie po stronie API |
| MASVS-AUTH-2 | `apps/mobile/src/features/judge/auth/JudgeAuth.ts`, `apps/mobile/src/features/judge/auth/offlinePolicy.ts` (okno 24 h, limity lokalne) | MASTG-TEST-0018, TC-SEC-014 | spełnione | PIN offline tylko z weryfikatorem zaszyfrowanym (TL-04) |
| MASVS-AUTH-3 | Ponowny PIN po 15 min w tle / 2 h (`apps/mobile/src/features/judge/JudgeShell.tsx`) | TC-SEC-014 | spełnione | Biometria nie w MVP (tablet współdzielony) |
| MASVS-NETWORK-1 | HTTPS (ATS iOS, `usesCleartextTraffic=false` w buildach release), `apps/mobile/src/data/api` | MASTG-TEST-0019, TC-SEC-003 | do weryfikacji | Sprawdzić ruch w buildzie `preview` (proxy) |
| MASVS-NETWORK-2 | – | MASTG-TEST-0022 | nie dotyczy | Przypinanie certyfikatów – świadomie nie w MVP (05 §7: ryzyko blokady przy rotacji ACM), rozważyć w v2 |
| MASVS-PLATFORM-1 | Linki `polechamp.app/{reset,pair}` (`apps/mobile/app.config.ts`), walidacja parametrów | MASTG-TEST-0028, TC-SEC-021 | do weryfikacji | Bez automatycznych akcji – parowanie wymaga potwierdzenia |
| MASVS-PLATFORM-2 | Brak WebView z kodem aplikacji (`expo-web-browser` tylko dla dokumentów prawnych) | MASTG-TEST-0031 | spełnione | |
| MASVS-PLATFORM-3 | `apps/mobile/src/ui/pin/PinPad.tsx` (`filterTouchesWhenObscured`), `apps/mobile/src/data/secure/clipboard.ts` (czyszczenie po 60 s) | MASTG-TEST-0035, TC-SEC-020, TC-SEC-023 | spełnione | Zrzuty ekranu dozwolone (Q-09) |
| MASVS-CODE-1 | `minSdkVersion` 29, iOS 16.4 (`apps/mobile/app.config.ts`) | MASTG-TEST-0036 | spełnione | |
| MASVS-CODE-2 | `expo-updates` (wymuszenie `minAppVersion` z `GET /app-config`) | MASTG-TEST-0037 | spełnione | |
| MASVS-CODE-3 | `pnpm audit --prod` w `.github/workflows/pr.yml`, polityka wieku pakietów | TC-SEC-005 | częściowo | SBOM – SEC-GAP-02 |
| MASVS-CODE-4 | Schematy zod z `@polechamp/contracts` dla odpowiedzi i linków | MASTG-TEST-0025, TC-SEC-021 | spełnione | |
| MASVS-RESILIENCE-1…4 | – | – | nie dotyczy | L1 nie wymaga; brak wykrywania roota/obfuskacji – dane o niskiej wartości dla atakującego, kontrola po stronie serwera |
| MASVS-PRIVACY-1 | Minimalizacja (05 §5.2), brak SDK analitycznych | TC-RODO-008 | spełnione | Lista zależności natywnych – IMP-407 |
| MASVS-PRIVACY-2 | Sentry bez PII (`apps/mobile/src/observability/scrub.ts`), bez identyfikatorów reklamowych | TC-SEC-017 | spełnione | |
| MASVS-PRIVACY-3 | Deklaracje w sklepach, `PrivacyInfo.xcprivacy` | TC-RODO-008 | do weryfikacji | IMP-407 (zależy od IMP-550) |
| MASVS-PRIVACY-4 | Usunięcie konta w aplikacji i na stronie (`apps/site`) | TC-RODO-006 | spełnione | |

## Wyjątek STORAGE-1 L2 – SQLite bez szyfrowania (R-06)

**Decyzja:** dane turnieju na tablecie (imiona, nazwiska, kluby, numery, oceny) w SQLite bez SQLCipher.
**Uzasadnienie:** koszt wydajności i integracji z `expo-sqlite`; dane o niskiej wrażliwości (bez roku urodzenia na tablecie).
**Mitygacje:**
- szyfrowanie urządzenia (iOS Data Protection, Android FBE – `minSdkVersion` 29 wymusza FBE);
- pepper PIN-u, sekret i tokeny tylko w Keystore/Keychain – zrzut bazy nie pozwala zalogować się ani zweryfikować PIN-u;
- weryfikatory PIN w SQLite wyłącznie zaszyfrowane (AES-GCM, klucz z peppera – TL-04);
- brak kopii zapasowych (`with-no-backup.js`);
- usunięcie danych turnieju 7 dni po zakończeniu i przy „Odłącz urządzenie” (`TabletDataLifecycle.ts`), zdalne unieważnienie.
**Akceptacja:** TL (R-06). Przegląd przy v2 lub zmianie zakresu danych.

## Testy ręczne przed wydaniem (lista kontrolna `docs-dev/qa/release-checklist.md`)

| Test | Procedura | Oczekiwane |
|---|---|---|
| MASTG-TEST-0001 / 0003 | `adb logcat` i konsola Xcode podczas logowania, parowania, oceny | brak PIN-ów, tokenów, nazwisk w logach |
| MASTG-TEST-0009 | `adb shell bmgr backupnow` + `adb backup` / kopia iCloud | brak bazy i MMKV w kopii (Android) |
| MASTG-TEST-0052 | `adb shell run-as app.polechamp ls -R` i podgląd plików (emulator debug) | tokeny/sekret/pepper nieobecne w `databases/`, `files/mmkv` |
| MASTG-TEST-0019 | proxy (mitmproxy) z certyfikatem użytkownika | build release odrzuca certyfikat użytkownika; ruch tylko HTTPS |
| MASTG-TEST-0035 | aplikacja nakładkowa + klawiatura PIN | dotyki odrzucane |
| MASTG-TEST-0022 | przypinanie TLS | decyzja „nie” (NETWORK-2) – bez testu |

Wynik zrzutu systemu plików (IMP-402 krok 5): **niewykonany** – brak emulatora z buildem natywnym (bez EAS); do wykonania przy pierwszym buildzie `preview`.
