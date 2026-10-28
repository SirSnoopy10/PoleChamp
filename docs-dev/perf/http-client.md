# Klient HTTP – podwójne żądania i czas odpowiedzi (IMP-715)

Data: 28.10.2026 · Emulator `PoleChamp_Pixel` (x86_64), API lokalnie (`node --watch dist/main.js`, 10.0.2.2:3000)
· Ustalenia raportu UX: #4, #38.

## Metoda

- Dziennik dostępu API na poziomie `debug` (`[Http] METODA ścieżka status czas rid idem` – `bootstrap.ts`), liczone
  żądania między tapnięciem a końcem akcji.
- Klient: skrypt `adb` (wpisanie danych, tapnięcie „Zaloguj się”, czekanie aż zniknie `login-submit` w
  `uiautomator dump`). Czas zawiera narzut `uiautomator` (~1 s na odczyt drzewa).
- Build release lokalnie: `gradlew assembleRelease -PreactNativeArchitectures=x86_64 --max-workers=1` (bez EAS).
  Lokalnie do pomiaru dodany manifest `release` z `usesCleartextTraffic` (API przez `http://`, poza repozytorium).

## Wyniki – logowanie FX-EMPTY

| Build | Żądania `POST /v1/auth/login` | Czas API | Czas w kliencie (z narzutem) |
|---|---|---|---|
| release (Hermes, bez inspektora) | 1 | 34 ms | 2,8 s |
| dev client + Metro | 1 | 40 ms | 2,9 s |

Po zalogowaniu oba buildy wysyłają po 2 × `GET /v1/tournaments` (zakładki „Aktywne” i „Zakończone” – osobne
zapytania, nie duplikaty).

## Wnioski

- **Duplikatów nie odtworzono** ani w release, ani w dev kliencie. Opóźnienia 15–20 s i powtórzenia z raportu
  pojawiały się na emulatorze działającym ~11 h, z dwoma AVD i Dockerem/WSL jednocześnie: przed pomiarem system
  emulatora zgłaszał „Process system isn't responding”, a Windows – brak pliku stronicowania przy kompilacji.
  Po restarcie emulatora czasy są zbliżone do czasu API + render. Przyczyna środowiskowa, nie klient HTTP.
- Zabezpieczenie niezależne od środowiska (wdrożone): `Idempotency-Key` także dla publicznych POST
  uwierzytelniania (rejestracja, kod e-mail, `password/forgot`, `password/reset`) – ciche ponowienie żądania zwraca
  zapisany status zamiast błędu (`EMAIL_TAKEN`, kod już użyty). Test `UX-38` w `auth.test.ts`.
- Pomiar na urządzeniu fizycznym i buildzie `preview` (EAS) – niewykonany (brak kont/urządzeń; IMP-600…609).
- Pętla animacji splash (krok 5) – niemierzona `dumpsys gfxinfo` (emulator niestabilny); do spike'u IMP-602.

## Poprawki znalezione przy budowaniu release

- `babel.config.js`: preset `babel-preset-expo` rozwiązywany przez pakiet `expo` – Metro uruchamiany przez Gradle
  (`createBundleReleaseJsAndAssets`, `createReleaseUpdatesResources`) nie znajdował go po nazwie (izolowany
  `node_modules` pnpm). Ten sam krok wykonuje build EAS.
- Lokalny build wszystkich ABI wymaga ~16 GB pamięci wirtualnej; na stacji z emulatorem i Dockerem używać
  `-PreactNativeArchitectures=x86_64 --max-workers=1`.
