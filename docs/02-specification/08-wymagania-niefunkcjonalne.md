# Wymagania niefunkcjonalne (NFR)

> Dokument: `02-specification/08-wymagania-niefunkcjonalne.md` · Wersja 1.0 · 23.10.2026
> Konwencja ID: `NFR-MNN` (M – grupa). Każde wymaganie ma miarę i sposób weryfikacji (dla planu testów Tech Leada). Urządzenia referencyjne: NFR-703.

| Grupa | Zakres |
|---|---|
| 1xx | Wydajność |
| 2xx | Dostępność (a11y) i jakość UI |
| 3xx | Offline i niezawodność |
| 4xx | Bezpieczeństwo |
| 5xx | Prywatność (RODO) |
| 6xx | Lokalizacja |
| 7xx | Urządzenia i platformy |
| 8xx | Skalowalność |
| 9xx | Utrzymanie i obserwowalność |

## 1xx – Wydajność

| ID | Wymaganie | Miara | Weryfikacja |
|---|---|---|---|
| NFR-101 | Zimny start aplikacji do pierwszego interaktywnego ekranu (bez minimalnego czasu splashu) | ≤ 3,0 s p90 na urządzeniach referencyjnych | pomiar w buildzie release (Sentry Performance / Maestro) |
| NFR-102 | Czas odpowiedzi API | odczyt p95 ≤ 300 ms; zapis (w tym przyjęcie oceny z przeliczeniem rankingu) p95 ≤ 500 ms przy obciążeniu NFR-802 | k6 na staging |
| NFR-103 | Zatwierdzenie oceny na tablecie (tap → toast) | ≤ 100 ms p95, niezależnie od sieci | test instrumentowany na Galaxy Tab A8 |
| NFR-104 | Reakcja formularza oceny | aktualizacja „Twój wynik” ≤ 50 ms; suwak ≥ 55 fps p95 | profiler RN (Perf Monitor), Reassure |
| NFR-105 | Opóźnienie realtime | ocena przyjęta → ranking u organizatora ≤ 2 s p95; zmiana statusu kategorii → tablet ≤ 3 s p95 | test E2E z dwoma urządzeniami |
| NFR-106 | Synchronizacja kolejki po powrocie sieci | 300 ocen ≤ 30 s | test integracyjny z symulacją sieci |
| NFR-107 | Generowanie PDF | kategoria ≤ 3 s, cały turniej (60 kategorii / 1 500 startów) ≤ 10 s p95 | test workera |
| NFR-108 | Migawka urządzenia | ≤ 1,5 MB JSON (≤ 250 kB gzip) dla turnieju maksymalnego; zapis do SQLite ≤ 2 s | test integracyjny |
| NFR-109 | Rozmiar aplikacji | ≤ 60 MB pobrania (iOS / Android) | raport EAS |
| NFR-110 | Weryfikacja PIN offline (PBKDF2 600k) | ≤ 1 s na najsłabszym tablecie referencyjnym | benchmark (ADR-005) |

## 2xx – Dostępność i jakość UI

| ID | Wymaganie | Miara | Weryfikacja |
|---|---|---|---|
| NFR-201 | Zgodność z **WCAG 2.2 AA** w zakresie mającym zastosowanie do aplikacji mobilnych | 0 błędów krytycznych w audycie. **Błąd krytyczny (definicja TL-52):** uniemożliwia wykonanie scenariusza US Must z czytnikiem ekranu, przy skalowaniu tekstu NFR-204 lub przy kontraście tekstu < 4,5:1 (< 3:1 dla dużego tekstu i elementów UI) | audyt (Accessibility Inspector, Android Accessibility Scanner) + ręczny |
| NFR-202 | Kontrast tokenów Nocturne (tabela §2.1) | tekst ≥ 4,5:1 (duży ≥ 3:1), elementy UI ≥ 3:1 | test automatyczny tokenów (`@polechamp/tokens`) |
| NFR-203 | Cele dotykowe | ≥ 44×44 pt (przyciski −/+ kar 40 dp wizualnie + `hitSlop` do 44) | lint komponentów + przegląd |
| NFR-204 | Skalowanie tekstu systemowego | organizator do 130%, sędzia do 120% bez obcinania funkcji i nakładania się tekstów (UI-05) | testy zrzutów ekranu (różne rozmiary czcionek) |
| NFR-205 | Stany ekranów | każdy ekran z danymi ma zdefiniowane: ładowanie, pusty, błąd, offline (gdzie dotyczy) | przegląd specyfikacji vs. implementacja |
| NFR-206 | Czytnik ekranu | wszystkie elementy interaktywne mają etykietę i rolę; suwaki i liczniki jako `adjustable`; kolejność fokusu zgodna z wizualną | VoiceOver / TalkBack – scenariusze US Must |
| NFR-207 | Ograniczenie ruchu | przy „Ogranicz ruch” brak animacji splash (statyczna klatka) i przejść poza fade ≤ 150 ms | test ręczny |
| NFR-208 | Reguły UI-01…UI-15 z przeglądu designu ([03-analiza-designu.md §6](../00-research/03-analiza-designu.md#6-uwagi-z-przeglądu-designu-uploads)) | 100% reguł spełnionych | checklista w PR + testy zrzutów |
| NFR-209 | Motyw | tylko ciemny (Nocturne) w aplikacji; PDF jasny (wydruk) | przegląd |
| NFR-210 | Spójność z designem | odchylenie od prototypu ≤ 2 dp w odstępach i rozmiarach na ekranach SCR z designu | porównanie zrzutów (projektant) |

### 2.1 Kontrast kluczowych par (wyliczone wg WCAG 2.x)

| Para (pierwszy plan / tło) | Kontrast | Dozwolone użycie |
|---|---|---|
| text `#e9e9ed` / bg `#161826` | 14,54:1 | każdy tekst |
| text / surface `#232532` | 12,55:1 | każdy tekst |
| neutral-300 `#cfd3e5` / surface | 10,20:1 | każdy tekst |
| neutral-400 `#b2b6ca` / surface | 7,55:1 | tekst pomocniczy (meta, etykiety) |
| neutral-500 `#9397ab` / surface | 5,25:1 | tekst drugorzędny (np. „/10”, carety) |
| neutral-600 `#75798c` / surface | 3,52:1 | **tylko** ikony / elementy nietekstowe / tekst ≥ 18,66 px pogrubiony |
| neutral-600 / bg | 4,08:1 | ikony, obramowania |
| accent `#9184d9` / bg | 5,45:1 | tekst przycisków, linki, ikony |
| accent / surface | 4,71:1 | tekst przycisków na arkuszach |
| accent-300 `#d2cefd` / accent-900 `#2b2741` | 9,52:1 | pigułki „Trwa”, odznaki wag |
| accent-200 `#e7e5fe` / accent-900 | 11,60:1 | odznaki numerów, banery |
| neutral-200 `#e4e7f5` / neutral-900 `#292b31` | 11,49:1 | odznaki kar, chipy |
| divider (≈ `#434450`) / surface | 1,58:1 | **niewystarczające** jako jedyna granica pola formularza |
| neutral-800 `#3f424d` / bg | 1,76:1 | tor paska/suwaka (dekoracyjny, wartość podana tekstem) |

**Wynikające adaptacje (zgodne z intencją Nocturne):** obramowanie pól formularza w spoczynku w neutral-600 (3,52:1 na surface) zamiast samego divider (WCAG 1.4.11); przyciski secondary pozostają z obrysem divider, bo identyfikuje je tekst; stan fokusu obrys 2 dp accent.

## 3xx – Offline i niezawodność

| ID | Wymaganie | Miara | Weryfikacja |
|---|---|---|---|
| NFR-301 | Ocenianie offline | 100% funkcji panelu sędziego po pierwszej synchronizacji; ≥ 12 h pracy offline; kolejka ≥ 5 000 mutacji | test E2E w trybie samolotowym |
| NFR-302 | Trwałość ocen | 0 utraconych zatwierdzonych ocen przy zabiciu aplikacji, restarcie i rozładowaniu (zapis przed toastem) | testy „kill -9” w pętli (100 iteracji) |
| NFR-303 | Fallback realtime | gdy WS niedostępny: odpytywanie co 15 s (organizator) / 30 s (tablet) | test z zablokowanym WSS |
| NFR-304 | Dostępność backendu | ≥ 99,5% miesięcznie; ≥ 99,9% w oknach turniejów oznaczonych jako krytyczne | CloudWatch Synthetics: kanarek co 5 min, a w oknach krytycznych co 1 min (99,9% z 10-godzinnego dnia to ok. 36 s przerwy, więc pomiar co 5 min nie wystarcza – TL-36) |
| NFR-305 | Odtwarzanie po awarii | RPO ≤ 5 min (PITR), RTO ≤ 1 h | test odtworzenia raz na kwartał |
| NFR-306 | Idempotencja | wielokrotne wysłanie dowolnej mutacji / żądania z kluczem daje ten sam stan | testy właściwości (property-based) |
| NFR-307 | Degradacja | awaria Redis nie blokuje oceniania (API działa, brak realtime → odpytywanie) | test chaos (wyłączenie Valkey na staging) |
| NFR-308 | Stabilność aplikacji | crash-free sessions ≥ 99,5% (sędzia), ≥ 99,0% (organizator) | Sentry |
| NFR-309 | Zegar urządzenia | błędny czas na tablecie (±24 h) nie wpływa na przyjęcie ani kolejność ocen | test z przestawionym zegarem |

## 4xx – Bezpieczeństwo

| ID | Wymaganie | Miara | Weryfikacja |
|---|---|---|---|
| NFR-401 | Standard | OWASP ASVS 5.0 L2 (API); OWASP MASVS 2.x – profil testów MAS-L1 + testy MAS-L2 dla MASVS-AUTH, MASVS-CRYPTO i magazynu kluczy (mobile). Aktualizacja wersji standardów – TL-26 | checklisty w PR, pentest |
| NFR-402 | Transport | TLS 1.2+ (preferowany 1.3), HSTS | skan SSL Labs (A) |
| NFR-403 | Kryptografia haseł i PIN-ów | Argon2id (hasła, PIN na serwerze); PBKDF2-SHA256 600k (weryfikator offline) | przegląd kodu |
| NFR-404 | Czas życia tokenów | access 15 min; refresh 30 dni z rotacją; sędzia 12 h; urządzenie 1 h | testy integracyjne |
| NFR-405 | Limity zapytań | wg [03-api.md §1](../01-architecture/03-api.md#1-styl-i-konwencje) i [05-bezpieczenstwo.md §3.2](../01-architecture/05-bezpieczenstwo.md#32-limity-prób) | testy nadużyć |
| NFR-406 | Sekrety | 0 sekretów w repozytorium i bundlu aplikacji | gitleaks w CI, analiza bundla |
| NFR-407 | Zależności | 0 podatności high/critical w chwili wydania | `pnpm audit`, Renovate |
| NFR-408 | Testy bezpieczeństwa | DAST (ZAP baseline) na staging przed każdym wydaniem; zewnętrzny pentest przed pierwszym turniejem produkcyjnym | raporty |
| NFR-409 | Audyt | 100% zmian stanu i ocen w `audit_log`; brak możliwości modyfikacji wpisów przez aplikację | test uprawnień bazy |
| NFR-410 | Build produkcyjny | brak podpowiedzi PIN demo, danych demo i trybu debug | test buildu release |
| NFR-411 | Autoryzacja | 100% endpointów pokrytych testami macierzy uprawnień ([05-bezpieczenstwo.md §4](../01-architecture/05-bezpieczenstwo.md#4-autoryzacja--macierz-uprawnień)) | testy kontraktowe |

## 5xx – Prywatność (RODO)

| ID | Wymaganie | Miara | Weryfikacja |
|---|---|---|---|
| NFR-501 | Lokalizacja danych | 100% danych osobowych w EOG (AWS eu-central-1, Sentry EU, SES eu-central-1) | przegląd infrastruktury |
| NFR-502 | Minimalizacja | tylko pola z [05-bezpieczenstwo.md §5.2](../01-architecture/05-bezpieczenstwo.md#52-zakres-danych-minimalizacja) | przegląd schematu |
| NFR-503 | Retencja | pseudonimizacja danych zawodniczek i sędziów 24 mies. po zakończeniu turnieju; logi 30 dni; audyt 36 mies.; kopie 35 dni | test zadania retencji |
| NFR-504 | Brak PII w telemetrii | 0 pól `fullName`, `club`, `email`, `comment` w logach i Sentry | testy scrubbingu, przegląd próbek |
| NFR-505 | Śledzenie | brak analityki marketingowej i trackerów stron trzecich w MVP | analiza zależności |
| NFR-506 | Dane na tablecie | usunięcie danych turnieju 7 dni po zakończeniu (przy pustej kolejce) | test E2E |
| NFR-507 | Prawa osób | realizacja żądań (dostęp, sprostowanie, usunięcie) ≤ 14 dni | procedura operacyjna |

## 6xx – Lokalizacja

| ID | Wymaganie | Miara | Weryfikacja |
|---|---|---|---|
| NFR-601 | Internacjonalizacja | 100% tekstów UI, e-maili i PDF w kluczach i18n (`@polechamp/i18n`); PL domyślnie; EN w v1.1 bez zmian kodu | lint (brak literałów w JSX) |
| NFR-602 | Formaty | przecinek dziesiętny; daty `Intl` pl-PL („3–4 października 2026”); strefa domyślna Europe/Warsaw | testy jednostkowe formaterów |
| NFR-603 | Liczba mnoga | reguły CLDR pl (one / few / many), jak `plural()` w prototypie | testy jednostkowe |
| NFR-604 | Odporność układu | +30% długości tekstów bez utraty funkcji | pseudolokalizacja |

## 7xx – Urządzenia i platformy

| ID | Wymaganie | Miara | Weryfikacja |
|---|---|---|---|
| NFR-701 | Systemy | iOS / iPadOS ≥ 16.4 (minimum Expo SDK 56–58 – TL-25); Android ≥ 10 (API 29) | macierz testów |
| NFR-702 | Formy | Organizator: telefony 360–430 dp szerokości, pion; na tabletach układ telefoniczny wyśrodkowany (maks. 480 dp). Sędzia: tablety ≥ 10″ – najmniejszy wymiar ekranu ≥ 600 dp i szerokość w poziomie ≥ 1024 dp; na mniejszych ekranach tryb sędziego niedostępny (komunikat „Panel sędziego wymaga tabletu.”). Przy oknie węższym niż 1024 dp lub orientacji pionowej – nakładka „Obróć tablet do pozycji poziomej.” bez utraty stanu (TL-23, [ADR-013](../01-architecture/adr/ADR-013-orientacja-i-rozmiar-okna-tabletu.md)) | testy E2E |
| NFR-703 | Urządzenia referencyjne | iPhone 12, Google Pixel 6a (telefon); iPad 9. gen., Samsung Galaxy Tab A8 (tablet) | laboratorium urządzeń / farmy (EAS + BrowserStack) |
| NFR-704 | Zużycie baterii (sędzia) | ≤ 12% baterii na godzinę przy włączonym ekranie (iPad 9) | pomiar 2 h |
| NFR-705 | Pamięć | ≤ 300 MB RSS na tablecie przy turnieju maksymalnym | profiler |
| NFR-706 | Wymuszenie aktualizacji | API zwraca `minAppVersion`; starsza aplikacja pokazuje ekran aktualizacji (bez blokowania wysyłki outboxu) | test integracyjny |

## 8xx – Skalowalność

| ID | Wymaganie | Miara | Weryfikacja |
|---|---|---|---|
| NFR-801 | Limity turnieju | ≤ 60 kategorii, ≤ 1 500 startów, ≤ 300 startów w kategorii, ≤ 30 sędziów, ≤ 20 urządzeń, ≤ 12 kryteriów i ≤ 10 kar na kategorię | walidacja API + test |
| NFR-802 | Obciążenie systemu | 100 turniejów jednocześnie w statusie Trwa, 3 000 połączeń WS, 50 ocen/s szczytowo, 10 000 kont organizatorów | k6 |
| NFR-803 | Skalowanie poziome | API bezstanowe; zwiększenie liczby zadań ECS bez zmian kodu | test na staging (2 → 4 zadania) |
| NFR-804 | Zapas | test obciążeniowy na 2× NFR-802 przed wydaniem 1.0 | raport k6 |

## 9xx – Utrzymanie i obserwowalność

| ID | Wymaganie | Miara | Weryfikacja |
|---|---|---|---|
| NFR-901 | Logowanie | logi JSON (`pino`) z `requestId`; nagłówek `X-Request-Id` z klienta | przegląd |
| NFR-902 | Metryki i alarmy | latencja p95, odsetek 5xx, odrzucenia mutacji, `pending_mutations` z heartbeat, liczba WS; alarm przy 5xx > 1% przez 5 min | CloudWatch dashboard |
| NFR-903 | Testy | `@polechamp/scoring` – 100% gałęzi + testy referencyjne z [07-reguly-punktacji.md §6](07-reguly-punktacji.md#6-przykłady-liczbowe); API ≥ 80% linii; testy kontraktowe wszystkich endpointów; E2E dla wszystkich US „Must” | CI |
| NFR-904 | Migracje | zgodne wstecz (expand/contract), bez przestoju | przegląd PR |
| NFR-905 | Wydania w dni zawodów | brak wdrożeń i OTA w oknie turniejów krytycznych (poza poprawkami krytycznymi zatwierdzonymi przez dyżurnego) | procedura + blokada w pipeline (`ops/freeze-windows.yaml` + krok `freeze-guard` – TL-37) |
| NFR-906 | Dokumentacja API | OpenAPI 3.1 publikowane automatycznie z CI | artefakt CI |
| NFR-907 | Wersjonowanie | semver aplikacji i API; kompatybilność API wstecz co najmniej 2 wersje aplikacji | testy kontraktowe |
