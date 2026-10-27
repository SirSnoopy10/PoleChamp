# Deklaracje prywatności w sklepach – projekt do wpisania

> IMP-407 · NFR-505, R-12 · TC-RODO-008. Status: **przygotowane, niewpisane** – wymaga rekordów aplikacji w App Store
> Connect i Google Play (IMP-550) oraz akceptacji treści prawnych (Q-10). Źródło prawdy dla manifestu iOS:
> `apps/mobile/plugins/with-privacy-manifest.js` (test spójności w `apps/mobile/plugins/__tests__/with-privacy-manifest.test.js`).

## App Store – Privacy Nutrition Label

**Śledzenie (Tracking):** nie. Brak domen śledzących, brak IDFA, brak ATT.

| Kategoria Apple | Typ | Powiązane z użytkownikiem | Śledzenie | Cel |
|---|---|---|---|---|
| Contact Info | Email Address (organizator) | tak | nie | App Functionality |
| Contact Info | Name (nazwa wyświetlana organizatora) | tak | nie | App Functionality |
| User Content | Other User Content (imiona i nazwiska, kluby, oceny osób w turnieju) | tak | nie | App Functionality |
| Diagnostics | Crash Data (Sentry, region UE, bez PII) | nie | nie | App Functionality |
| Diagnostics | Performance Data (Sentry) | nie | nie | App Functionality |

## Google Play – Data safety

| Pytanie | Odpowiedź |
|---|---|
| Czy aplikacja zbiera lub udostępnia dane? | Zbiera: adres e-mail, imię i nazwisko (konto), treści użytkownika (dane turnieju), dzienniki awarii i diagnostyka |
| Udostępnianie stronom trzecim | Nie (podprzetwarzający działający w imieniu operatora nie są „udostępnianiem” – `subprocessors.md`) |
| Szyfrowanie w tranzycie | Tak (TLS 1.2+) |
| Możliwość usunięcia danych | Tak – w aplikacji (ustawienia konta) i przez stronę `legal.accountDeletionUrl` (`https://polechamp.app/usuniecie-konta`) |
| Dane opcjonalne / wymagane | E-mail i nazwa – wymagane do konta; diagnostyka – wymagana (bez PII) |
| Cel | Funkcjonowanie aplikacji, diagnostyka |
| Rodzina / dzieci | Aplikacja nie jest skierowana do dzieci; dane niepełnoletnich zawodniczek wprowadza organizator (05 §5.3) |

## Weryfikacja (krok 4)

- Zależności: test `TC-RODO-008` (lista SDK analitycznych i reklamowych – brak), hosty w kodzie: API, Sentry UE, EAS Update.
- `npx expo-doctor` i lista modułów natywnych (`npx expo prebuild --no-install` + `Podfile.lock` / `gradle dependencies`)
  – **do wykonania przy pierwszym buildzie** (bez EAS w tej fazie).
- Ruch sieciowy buildu `preview` przez proxy (MASTG-TEST-0019) – lista kontrolna wydania.
