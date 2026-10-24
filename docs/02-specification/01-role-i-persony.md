# Role i persony

> Dokument: `02-specification/01-role-i-persony.md` · Wersja 1.0 · 23.10.2026
> Uprawnienia ról: [05-bezpieczenstwo.md §4](../01-architecture/05-bezpieczenstwo.md#4-autoryzacja--macierz-uprawnień). Research ról w innych systemach: [01-analiza-konkurencji.md §4](../00-research/01-analiza-konkurencji.md#4-role-w-badanych-systemach).

## 1. Role systemowe

| ID | Rola | Wersja | Urządzenie | Uwierzytelnianie | Cel w systemie |
|---|---|---|---|---|---|
| R-ORG | **Organizator** (właściciel turnieju, „admin”) | MVP | telefon (iOS/Android), pion | e-mail + hasło | Konfiguracja turnieju, sterowanie statusami, nadzór nad ocenianiem, wyniki i eksport |
| R-DEV | **Urządzenie sędziowskie** (rola techniczna) | MVP | tablet ≥ 10″, poziom | sparowanie kodem (sekret urządzenia) | Przechowuje migawkę turnieju, hostuje sesje sędziów, wysyła oceny |
| R-JDG | **Sędzia** | MVP | tablet (sparowany) | wybór profilu + PIN 4-cyfrowy | Ocena występów w swoich kategoriach |
| R-HJ | **Sędzia główny** (Head Judge) | v1.1 | tablet | jak sędzia + uprawnienie | Kary sędziego głównego, podgląd ocen panelu, zatwierdzanie blokady |
| R-SEC | **Sekretariat / współorganizator** | v1.1 | telefon / tablet | konto e-mail zaproszone przez organizatora | Lista startowa, check-in, bez sterowania statusami |
| R-PUB | **Publiczność** (widz, zawodniczka, trener, studio) | v2 | przeglądarka (telefon) | brak (link/QR) | Wyniki opublikowane przez organizatora |
| — | **Zawodniczka** (osoba, której dotyczą dane) | MVP – tylko jako dane | – | – | Jej dane i oceny są przetwarzane. Nie loguje się w MVP |

## 2. Persony

### P1 – Marta, organizatorka (R-ORG)
- **Kim jest:** 34 lata, właścicielka studia pole dance w Wrocławiu, sędzia z certyfikatem krajowym. Organizuje 2–3 zawody rocznie (60–120 startów, 6–10 kategorii, 3–5 sędziów).
- **Urządzenie i kontekst:** iPhone 13, w dniu zawodów biega między sekretariatem, sceną i zapleczem. Ma LTE, ale Wi-Fi w hali bywa przeciążone. Jedną ręką obsługuje telefon, często w półmroku przy scenie (ciemny motyw pomaga).
- **Cele:** przygotować kategorie i listy dzień–dwa wcześniej; w dniu zawodów widzieć, którzy sędziowie jeszcze nie ocenili; zamknąć kategorię i od razu ogłosić podium; wysłać PDF z wynikami klubom.
- **Bóle dziś:** arkusz Excel, ręczne przepisywanie kartek sędziów, pomyłki w sumowaniu, kłótnie o remisy, opóźnienia ogłoszeń.
- **Kluczowe ekrany:** SCR-ORG-01, 03, 06–08, 12, 14.
- **Miary sukcesu:** ogłoszenie wyników kategorii ≤ 2 min po ostatnim występie; zero błędów sumowania.

### P2 – Katarzyna Nowak, sędzia (R-JDG)
- **Kim jest:** 41 lat, była zawodniczka, sędziuje kilkanaście zawodów rocznie (dane z prototypu: „Katarzyna Nowak”).
- **Urządzenie i kontekst:** tablet od organizatora na stole sędziowskim przed sceną, w poziomie. Ocenia 60–80 występów dziennie po 2,5–4 min (czasy z regulaminów [S9]). Między występami ma 30–60 s na wpisanie noty. Nie konsultuje ocen z innymi sędziami (zasady POSA [S3]).
- **Cele:** wpisać noty szybko i bez pomyłek; widzieć, kogo już oceniła; móc poprawić ocenę przed zamknięciem kategorii; nie martwić się o internet.
- **Bóle dziś:** kartki papierowe, nieczytelne pismo, niepewność, czy sekretariat dobrze przepisał.
- **Kluczowe ekrany:** SCR-JDG-01…05.
- **Miary sukcesu:** wprowadzenie oceny ≤ 45 s; zero „zgubionych” ocen.

### P3 – Michał Woźniak, sędzia główny (R-HJ, v1.1)
- Prowadzi panel, nakłada kary sędziego głównego (np. spóźnienie na scenę, awaria kostiumu – wzorem POSA [S3]), pilnuje kompletu ocen przed zamknięciem kategorii.
- Potrzebuje podglądu ocen wszystkich sędziów panelu i rozbieżności.

### P4 – Julia, zawodniczka (dane w systemie)
- 16 lat (**niepełnoletnia**), startuje w „Pole Sport Junior”. Jej dane (imię i nazwisko, klub, numer, rok urodzenia opcjonalnie) wprowadza organizator.
- Oczekuje szybkich i sprawiedliwych wyników. W v2 – publicznego wyniku i komentarzy sędziów.
- **Wymagania prywatności:** minimalne dane, zgoda opiekuna potwierdzona przez organizatora, w publikacji publicznej (v2) domyślnie inicjał nazwiska.

### P5 – Ola, trenerka i widz (R-PUB, v2)
- Prowadzi grupę z klubu „Spin City Poznań”. Chce śledzić wyniki podopiecznych na telefonie w trakcie zawodów (link/QR na ekranie w hali).

### P6 – Paweł, wolontariusz w sekretariacie (R-SEC, v1.1)
- Dopisuje zgłoszenia „na ostatnią chwilę”, wycofuje zawodniczki, które nie stawiły się na scenie.

## 3. Kontekst użycia – podsumowanie

| Aspekt | Organizator | Sędzia |
|---|---|---|
| Urządzenie | telefon, pion, 360–430 dp szerokości | tablet 10–13″, poziom, ≥ 1024 dp szerokości |
| Środowisko | ruch, hałas, półmrok, LTE | stół przed sceną, półmrok, zawodne Wi-Fi |
| Częstotliwość | konfiguracja raz, nadzór ciągły w dniu zawodów | intensywna praca seriami (dziesiątki ocen) |
| Kluczowe ryzyko | błędne statusy, zamknięcie kategorii z brakami | utrata oceny, pomyłka w nocie, brak sieci |
| Odpowiedź w designie | duże karty, bottom sheety, pigułki statusu, paski postępu | dwa panele (kolejka + formularz), suwaki z −/+, liczniki kar, auto-przejście |
