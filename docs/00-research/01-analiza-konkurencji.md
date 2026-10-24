# Analiza konkurencji – systemy do zawodów i sędziowania

> Dokument: `00-research/01-analiza-konkurencji.md` · Autor: Architekt systemu (Agent 1) · Stan wiedzy: 23.10.2026
> Powiązane: [02-reguly-oceniania-w-pole-sport.md](02-reguly-oceniania-w-pole-sport.md), [03-analiza-designu.md](03-analiza-designu.md), [../02-specification/02-zakres-mvp.md](../02-specification/02-zakres-mvp.md)

## 1. Cel i metoda

Celem jest ustalenie, jakie narzędzia istnieją do obsługi zawodów pole dance i sportów pokrewnych z ocenianiem przez sędziów (gimnastyka, taniec sportowy, łyżwiarstwo figurowe, cheerleading). Interesowało nas, co z nich warto przenieść do PoleChamp, a czego unikać.

Metoda: wyszukiwanie w internecie (październik 2026), lektura stron producentów, dokumentów federacji i listingów (sklepy z aplikacjami, katalogi oprogramowania). Każda informacja ma źródło (numer w nawiasie kwadratowym, np. [S10], odsyła do sekcji [Źródła](#8-źródła)). Przy każdym narzędziu podano **poziom weryfikacji**:

| Poziom | Znaczenie |
|---|---|
| **A** | Potwierdzone na stronie producenta / w oficjalnym dokumencie, który został otwarty i przeczytany. |
| **B** | Informacja z fragmentu wyników wyszukiwania lub z katalogu/listingu (strona nie została otwarta lub zwróciła błąd). Traktować jako wskazówkę. |
| **C** | Nie udało się potwierdzić – trop z briefu nie znalazł pokrycia w źródłach. |

Ważne ustalenie ogólne: **nie znaleziono żadnego dedykowanego, publicznie dostępnego oprogramowania do sędziowania zawodów pole dance**. Federacje (IPSF, POSA) publikują regulaminy i wyniki, ale nie wskazują narzędzia, którego używają. Wyniki IPSF z 2023 r. to zwykła strona WWW z rankingiem, bez rozbicia punktów i bez nazwy dostawcy [S6]. Mniejsze zawody, także polskie, zbierają zgłoszenia przez ogólne formularze, a ocenianie robią według opublikowanej tabeli kryteriów [S9][S27]. To luka rynkowa, którą PoleChamp może wypełnić (patrz [§6](#6-luki-rynkowe)).

## 2. Tabela porównawcza

Legenda: ✔ – jest (potwierdzone), ~ – częściowo / niepewne, ✘ – brak lub nie dotyczy, ? – nie udało się ustalić.

| Narzędzie | Dziedzina | Rejestracja | Kategorie / harmonogram | Sędziowanie na urządzeniu | Agregacja not | Wyniki na żywo | Eksport / wydruk | Offline | Model | Weryf. |
|---|---|---|---|---|---|---|---|---|---|---|
| **scoring.dance** | taniec (m.in. WCS) | ? | ✔ harmonogram, marshalling | ✔ tablet (5 widoków) + karty papierowe | ✔ kilka modeli (wybiera sędzia główny) | ✔ online, infoscreeny | ✔ wiele układów wydruku | ✔ urządzenie zapasowe offline | web + tablet | A [S10] |
| **DanceComp Genie** | taniec (studia, konkursy) | ✔ konta studiów, płatności | ✔ automatyczny harmonogram | ✔ ekran sędziego (web), krytyki | ~ „tabulacja” (szczegóły nieznane) | ~ ekrany w sali, streaming | ✔ raporty | ? | web, licencja (demo) | A/B [S11][S12][S28] |
| **CompetitionSuite** | marching arts / taniec | ? | ? | ✔ aplikacja tabletowa, nagrywanie komentarza audio | ✔ tabulator | ? | ? | ~ status uploadu na tablecie | SaaS + tablet | A [S13] |
| **LiveJudge** | konkursy ogólne (taniec, cheer, pitch) | ✘ | ~ rundy | ✔ telefon sędziego (QR, nr telefonu) | ✔ średnia, odrzucenie skrajnych, Z-score, „olimpijska” | ✔ tablica wyników | ? | ✘ wymaga sieci | web, od ok. 0,95 USD | B [S14][S15] |
| **iDance (IDANCE计分)** | taniec (Chiny) | ~ check-in | ? | ✔ logowanie per rola, punktacja numerami | ? | ✔ duży ekran | ? | ? | aplikacja mobilna | B [S16] |
| **ALL10 Battle App** | battle (breaking) | ✘ | ✔ drabinki | ✔ iPad | ? | ? | ? | ✔ offline z auto-sync | iPad | B [S17] |
| **Kscore** | gimnastyka artystyczna | ✔ (od 2018) | ✔ rotacje | ✔ tablet/telefon lub sekretarz | ✔ FIG i USA 10.0 | ✔ osobny serwis live | ~ | ? | web, cennik osobno | A [S18][S19] |
| **ProScore** | gimnastyka | ✔ | ✔ sesje | ✔ wprowadzanie not | ✔ | ✔ publikacja do aplikacji myUSAGym | ? | ? (aplikacja desktop) | licencja | B [S20][S21] |
| **ISU Judging System** | łyżwiarstwo figurowe | ✘ (federacja) | ✘ | ✔ ekrany dotykowe, powtórki wideo | ✔ średnia obcięta (bez skrajnych) | ✔ | ✔ protokoły | ✘ (infrastruktura na miejscu) | system federacji | A/B [S22] |
| **WDSF JUDSYS (Judging System 2.x)** | taniec sportowy | ✘ | ✘ | ? | ✔ ocena cząstkowych aspektów | ? | ? | ? | open source | A [S23][S24] |
| **Easy Comp** | taniec (UK) | ✔ zgłoszenia | ✔ panele sędziów, przewodniczący bez głosu | ~ karty do druku | ✔ | ? | ✔ wydruki | desktop | licencja | B [S29] |
| **Competit.pl** | sport ogólnie (PL) | ✔ formularze, płatności PL, limity | ✔ kategorie, grupy, nr startowe | ✘ | ✘ | ✘ | ✔ Excel | ✘ | 1,99–2,99 zł netto / uczestnik | A [S25] |
| **Varsity – United Scoring Partners** | cheerleading | ✘ | ✘ | ✘ (jednolita karta ocen, szkolenia online) | – | – | – | – | standard branżowy | A [S26] |
| **Calypso (WDSF scoring)** – trop z briefu | – | – | – | – | – | – | – | – | – | C [S30] |
| **iJudge (cheer)** – trop z briefu | – | – | – | – | – | – | – | – | – | C |
| **Dance Competition Manager** – trop z briefu | – | – | – | – | – | – | – | – | – | C |

## 3. Opis narzędzi

### 3.1 scoring.dance (taniec, m.in. West Coast Swing) – weryfikacja A
- **Funkcje:** sędziowanie na tablecie z pięcioma widokami dla sędziego oraz dwoma układami kart papierowych; skróty klawiaturowe (numpad) i kontrola wprowadzanych not; panel sędziego głównego z wyborem modelu obliczeń wstępnych; listy sędziów online; marshalling na tablecie z check-inem zawodników; dynamiczny harmonogram; infoscreeny (harmonogram, listy, wyniki); publikacja na Facebooku, chatboty, powiadomienia mobilne dla zawodników; integracja z nakładką na transmisję; publiczne API; **urządzenie zapasowe offline**, które trzyma dane na miejscu, gdy pada internet [S10].
- **Role:** sędzia, sędzia główny, marshal, konferansjer (emcee), dyrektor wydarzenia, zawodnik (powiadomienia).
- **Mocne strony:** dojrzały workflow „przy stole sędziowskim”, świadome podejście do braku internetu, wielojęzyczność.
- **Słabości / braki:** nastawienie na formaty taneczne (rundy wstępne, „callbacki”), nie na kryteria ważone typowe dla pole. Strona nie opisuje rejestracji ani cennika.

### 3.2 DanceComp Genie – weryfikacja A/B
- **Funkcje (A):** rejestracja online z zapamiętanymi tancerzami i układami, wiele bramek płatności (Stripe, Square, PayPal i inne), automatyczny harmonogram bez konfliktów, ekran sędziego z trybem ciemnym i dużą czcionką, tabulator zarządzający całym wydarzeniem z jednego ekranu, nagrywanie krytyk, rola konferansjera i inspicjenta na tablecie, ekrany na ścianę („teraz występuje / następny”), streaming [S11].
- **(B)** Wersja wirtualna: sędziowie logują się do strony WWW i wpisują noty oraz krytyki, bez instalacji [S12]. Zestawienie Gitnux opisuje silnik tabulacji jako działający w czasie rzeczywistym, ale to źródło wtórne [S28].
- **Role:** studio/klient, tancerz, sędzia, tabulator, konferansjer, inspicjent.
- **Mocne strony:** kompletny cykl (zgłoszenie → płatność → harmonogram → ocena → nagrody).
- **Słabości:** rynek amerykańskich konkursów tanecznych dla studiów. Według recenzji wtórnej wymusza dopasowanie procesu do produktu [S28]. Nie ma informacji o pracy offline.

### 3.3 CompetitionSuite – weryfikacja A
- **Funkcje:** tabulator loguje się w aplikacji tabletowej i przypisuje tablet do sędziego i wydarzenia. Sędzia wprowadza noty i nagrywa komentarz audio, który trafia na serwer. Ekran statusu pokazuje wersję aplikacji, baterię, liczbę plików do wysłania i stan nagrywania na każdym tablecie. **Po zakończeniu rundy tabulator blokuje noty**; sędzia może potwierdzić zablokowaną notę lub ją zakwestionować, a wtedy tabulator ją odblokowuje albo koryguje [S13].
- **Wnioski dla PoleChamp:** wzorzec „przypisz tablet do sędziego/wydarzenia”, panel statusu urządzeń (bateria, zaległe wysyłki) i jawna blokada not po rundzie są bezpośrednio przydatne. Blokada kategorii w designie PoleChamp robi to samo.

### 3.4 LiveJudge – weryfikacja B
- **Funkcje (z katalogów Capterra/GetApp/SoftwareAdvice):** aplikacja webowa bez instalacji; sędziowie wchodzą przez kod QR i uwierzytelniają się numerem telefonu; rubryki zamieniane na suwaki lub odejmowanie punktów; metody normalizacji: zwykła średnia, odrzucenie najwyższej i najniższej, Z-score, „olimpijska”; tablica wyników na żywo i głosowanie publiczności; cena od ok. 0,95 USD [S14][S15].
- **Słabości:** wymaga połączenia z siecią (brak wzmianki o offline). Narzędzie ogólne, bez pojęcia kategorii pole.
- **Wnioski:** konfigurowalna metoda agregacji (średnia / średnia obcięta) to oczekiwana funkcja. W PoleChamp planujemy ją po MVP (patrz [ADR-006](../01-architecture/adr/ADR-006-model-punktacji-i-agregacji.md)).

### 3.5 iDance (IDANCE计分) – weryfikacja B
Według opisu w katalogu aplikacji: role (sędzia, check-in, prowadzący) przydzielane przez konto logowania, dzięki czemu nie trzeba wielu iPadów. Sędzia ocenia, klikając numery startowe; wyniki można wyświetlić na dużym ekranie [S16]. O pracy offline brak informacji.

### 3.6 ALL10 Battle App – weryfikacja B
Według fragmentu listingu App Store: aplikacja na iPada do sędziowania battle'i i turniejów tanecznych, **działająca offline z automatyczną synchronizacją** [S17]. Strona listingu przy próbie otwarcia zwróciła 404, więc szczegółów nie potwierdzono.

### 3.7 Kscore (gimnastyka) – weryfikacja A
- **Funkcje:** system webowy (bez instalacji), działa na komputerach oraz tabletach i telefonach iOS/Android. Sędziowie wpisują noty bezpośrednio na tablecie albo przekazują kartki sekretarzowi; zawody można przeprowadzić bez papieru. Wyniki są gotowe zaraz po sędziowaniu i dostępne w osobnym serwisie live. Od 2018 r. rejestracja online, od 2020 r. zawody wirtualne, integracja z systemem USA Gymnastics [S18][S19].
- **Wnioski:** równoległe ścieżki wprowadzania not (sędzia sam / sekretarz) zwiększają odporność. W PoleChamp warto rozważyć po MVP tryb „sekretariat wpisuje notę z kartki” jako awaryjny.

### 3.8 ProScore (gimnastyka) – weryfikacja B
Pakiet do organizacji zawodów gimnastycznych: rejestracja, sesje, wprowadzanie not, przetwarzanie wyników [S20]. Instrukcja USA Gymnastics opisuje publikację na żywo: wyniki bieżącej sesji trafiają do kolejki i są wysyłane do aplikacji kibica w miarę wpisywania [S21].

### 3.9 ISU Judging System (łyżwiarstwo figurowe) – weryfikacja A/B
Panel techniczny (kontroler i specjaliści techniczni) rozpoznaje elementy. Zwykle 9 sędziów (minimum 3) ocenia jakość wykonania (GOE) w skali od −5 do +5 oraz komponenty programu w skali 0,25–10,00 z krokiem 0,25. **Najwyższa i najniższa nota są odrzucane, a z pozostałych liczona jest średnia (średnia obcięta)**. Komponenty mnożone są przez współczynniki, a wynik zaokrąglany do dwóch miejsc po przecinku. Kary za upadek to −1,0. Sędziowie używają ekranów dotykowych z powtórkami wideo [S22]. Strona ISU z opisem systemu nie zwróciła treści przy pobraniu, więc szczegóły pochodzą z Wikipedii (poziom B dla liczb).

### 3.10 WDSF Judging System 2.x / JUDSYS (taniec sportowy) – weryfikacja A
System 2.0 ocenia „konkretne aspekty” występu pary zamiast porównywać pary między sobą. Panel liczy 12 sędziów na zawodach GrandSlam, a minimum 3 na krajowych. Kod JUDSYS udostępniono jako open source [S23]. Strona edukacyjna WDSF linkuje dokumenty z obliczeniami (arkusze AJS), ale nie zawiera samej metody [S24].

### 3.11 Easy Comp (UK) – weryfikacja B
Według zrzutów ekranu: konfiguracja sędziów (nazwiska, litery, panele), przewodniczący bez prawa głosu na wydrukach, wydruk kart sędziowskich, dogrywki (repechage) [S29].

### 3.12 Competit.pl (rejestracja, Polska) – weryfikacja A
Polski system zapisów na zawody sportowe: formularze z dowolnymi polami, kategorie i grupy z limitami i cenami, automatyczne numery startowe, polskie bramki płatności (Tpay, Paynow, Przelewy24, PayPal), kody rabatowe, SMS, eksport do Excela, formularz w 9 językach, bez zakładania konta przez uczestnika. Cennik: 1,99 zł netto za uczestnika (Standard), 2,99 zł (Branding), 0 zł dla darmowych wydarzeń powyżej 50 osób. **Brak sędziowania i wyników** [S25]. Na serwerze Competit hostowane są regulaminy polskich zawodów pole dance (Puchar Polski federacji ADA) [S31], więc polscy organizatorzy pole już z niego korzystają.
- **Wniosek:** w MVP PoleChamp **nie budujemy rejestracji ani płatności**. Zamiast tego po MVP planujemy import listy startowej z CSV/Excel (eksport z Competit lub formularzy) – patrz FR-407.

### 3.13 Varsity Spirit – United Scoring Partners (cheerleading) – weryfikacja A
Od sezonu 2021/22 blisko 60 marek i organizatorów korzysta z jednej, wspólnej karty ocen, a zarejestrowani sędziowie mają szkolenia online z jej użycia [S26]. Nie znaleziono aplikacji tabletowej Varsity („iJudge” – poziom C).
- **Wniosek:** standaryzacja karty ocen ułatwia życie zawodnikom i sędziom. W PoleChamp odpowiada temu **szablon kryteriów i kar per styl** (Pole Sport, Pole Art, Exotic, Doubles), kopiowany do nowej kategorii (FR-301).

### 3.14 Tropy niepotwierdzone (poziom C)
- **„Calypso (WDSF scoring)”** – wyszukiwanie zwróciło jedynie narzędzie *Talypso* do konkursu muzyki calypso na Montserracie (sędziowie na iPadach nie widzą ocen innych sędziów) [S30]. Nie znaleziono oprogramowania „Calypso” do punktacji WDSF. WDSF używa własnego JUDSYS [S23].
- **„iJudge” (cheer)** – nie znaleziono aplikacji o tej nazwie.
- **„Dance Competition Manager”** – nie znaleziono produktu o tej nazwie, wyniki wskazywały inne narzędzia (Easy Comp, DanceComp Genie, Dancebug).
- **„Score Gymnastics”, „FIG Longines”** – nie znaleziono publicznych opisów oprogramowania. Zasady FIG (panele D i E, odrzucanie skrajnych not) opisano w [02-reguly-oceniania-w-pole-sport.md](02-reguly-oceniania-w-pole-sport.md) na podstawie źródeł wtórnych [S32].
- **Pole Theatre** – znaleziono tylko relacje prasowe o kategoriach (Art, Drama, Comedy, Classique), bez oficjalnej karty ocen [S33].
- **Platformy rejestracyjne dedykowane pole** – nie znaleziono. Organizatorzy używają ogólnych formularzy (np. Tally) i linków do wideo [S27].

## 4. Role w badanych systemach

| Rola | Gdzie występuje | Odpowiednik w PoleChamp |
|---|---|---|
| Organizator / dyrektor wydarzenia | wszystkie | **Organizator** (MVP) |
| Tabulator / sekretarz / scorekeeper | DanceComp Genie, CompetitionSuite, Kscore | Organizator (MVP). Rola **Sekretariat** po MVP |
| Sędzia | wszystkie | **Sędzia** (MVP) |
| Sędzia główny (Head Judge / Chairperson) | scoring.dance, POSA, IPSF, Easy Comp | **Sędzia główny** – v1.1 (kary sędziego głównego, zatwierdzanie blokady) |
| Superior Jury / kontrola sędziów | POSA (zawody międzynarodowe) | Statystyki odchyleń sędziów – v2 |
| Marshal / inspicjent / check-in | scoring.dance, DanceComp Genie, iDance | v2 (status „na scenie”, kolejka startu) |
| Konferansjer (MC) | scoring.dance, DanceComp Genie | v2 (widok „teraz / następna”) |
| Zawodnik / studio / trener | DanceComp Genie, scoring.dance | Zawodniczka – w MVP tylko jako dane. Publiczne wyniki – v2 |
| Widz / kibic | LiveJudge (głosowanie), ProScore (aplikacja kibica) | Publiczny widok wyników – v2 |

## 5. Mocne strony warte przeniesienia i błędy do uniknięcia

**Bierzemy (MVP):**
1. Tablet przypisany do turnieju i sędziego, logowanie szybkie i bez haseł (CompetitionSuite, LiveJudge) → **parowanie tabletu + PIN sędziego** ([ADR-005](../01-architecture/adr/ADR-005-uwierzytelnianie-sedziego-pin.md)).
2. Praca bez internetu z późniejszą synchronizacją (scoring.dance, ALL10) → **offline-first na tablecie** ([ADR-004](../01-architecture/adr/ADR-004-offline-first-tablet.md)).
3. Jawna blokada not po rundzie przez organizatora (CompetitionSuite) → **„Zakończ i zablokuj” kategorię** (design).
4. Status urządzeń (zaległe wysyłki, ostatni kontakt) u organizatora (CompetitionSuite) → **lista urządzeń i ostrzeżenie przed blokadą** (FR-505, FR-309).
5. Sędzia nie widzi ocen innych sędziów (Talypso, zasady POSA) → FR-610.
6. Wyniki obliczane przez system, a nie ręcznie (POSA: „wyniki generowane komputerowo”) → serwer liczy wynik oficjalny (FR-612).

**Bierzemy później (v1.1 / v2):**
- Konfigurowalna agregacja (średnia obcięta przy ≥ 5 sędziach) – POSA, ISU, LiveJudge.
- Rola sędziego głównego i kary sędziego głównego – POSA, IPSF.
- Publiczne wyniki na żywo / infoscreen – Kscore, ProScore, scoring.dance.
- Import listy startowej (CSV) z narzędzi rejestracyjnych typu Competit.
- Tryb „sekretariat wpisuje notę z kartki” jako awaryjny (Kscore).
- Komentarze sędziów jako informacja zwrotna dla zawodniczek (PSO: „dwie rzeczy dobrze / dwie do poprawy”) [S8].

**Unikamy:**
- Budowania rejestracji i płatności w MVP – rynek jest obsłużony (Competit, formularze), a to duży zakres prawny i finansowy.
- Odwzorowywania pełnych katalogów elementów (Code of Points IPSF/POSA) – dokumenty są chronione prawem autorskim, a do tego złożone i zmieniane co sezon [S1][S3]. PoleChamp daje **konfigurowalne kryteria**, a nie gotowy katalog.
- Edycji not sędziów przez organizatora „po cichu” – w CompetitionSuite tabulator może zmieniać zablokowane noty [S13]. W PoleChamp korekta wymaga odblokowania kategorii i zostawia ślad w audycie.
- Zależności od stałego internetu w sali (LiveJudge).
- „Fałszywych przycisków”, które wyglądają jak akcja, a są tylko statusem (uwaga z przeglądu designu – [03-analiza-designu.md §6](03-analiza-designu.md#6-uwagi-z-przeglądu-designu-uploads)).

## 6. Luki rynkowe

1. **Brak narzędzia skrojonego pod pole dance**: kryteria ważone (np. Technika ×2), kary liczone wystąpieniami z limitem, style (Pole Sport / Pole Art / Exotic / Doubles), poziomy (Beginner…Elite) i grupy wiekowe (dzieci, juniorki, Masters 40+) [S9][S2].
2. **Brak lekkiego, polskojęzycznego narzędzia** dla małych i średnich organizatorów (studiów), którzy dziś liczą wyniki w arkuszach.
3. **Offline na tablecie** to rzadkość w narzędziach webowych (LiveJudge, Kscore), a hale sportowe mają słabe Wi-Fi.
4. **Przejrzystość wyników**: oficjalne wyniki IPSF pokazują tylko sumę [S6], tymczasem regulaminy POSA przewidują wgląd zawodnika w karty sędziów [S3]. PoleChamp może to dać z audytem.

## 7. Rekomendacje dla PoleChamp (podsumowanie)

| Obszar | MVP | Później | Uzasadnienie |
|---|---|---|---|
| Konfiguracja kategorii | Kryteria ze skalą i wagą, kary z wartością i limitem, szablony per styl | Edytowalne szablony organizatora, rundy (eliminacje/finał) | Design + regulaminy PL [S9] |
| Panel sędziowski | Wszyscy sędziowie turnieju oceniają każdą kategorię | Przypisanie paneli do kategorii, sędzia główny | Prototyp: J = wszyscy sędziowie. POSA: 5–13 sędziów [S2] |
| Agregacja | Średnia arytmetyczna sum sędziów (jak w designie) | Średnia obcięta przy ≥ 5 sędziach | Design. POSA/ISU [S2][S22] |
| Remisy | Wyższa średnia z kryterium „Technika” (1. kryterium), potem mniej kar, potem ex aequo | Konfigurowalna kolejność | Design. POSA: Execution → Artistic → Difficulty [S2] |
| Offline | Pełne ocenianie offline, kolejka, wskaźniki | Urządzenie-serwer lokalny w sali | scoring.dance, ALL10 |
| Wyniki | Ranking na żywo u organizatora, PDF | Publiczny link, infoscreen, CSV | Kscore, ProScore |
| Rejestracja | Ręczne dodawanie zawodniczek | Import CSV | Competit [S25] |
| Prywatność | Minimalny zakres danych, EU, umowa powierzenia | Zgody na publikację wizerunku/nazwiska | RODO art. 8 [S34] |

## 8. Źródła

| ID | Opis | URL | Status pobrania |
|---|---|---|---|
| S1 | IPSF – Pole Sports Code of Points 2017 (kopia nieoficjalna w serwisie pdfroom) | https://pdfroom.com/books/international-pole-sports-federation-pole-sports-championships-code-of-points-2017/qXgenpbR26P | otwarte (fragment) |
| S2 | POSA – Code of Points 2022 Pole Sport (PDF) | https://posaworld.org/wp-content/uploads/2022/01/POSA-Pole-Sport_2022.pdf | otwarte, przeczytane rozdz. 4, 8, 10 |
| S2a | POSA – Code of Points 2025 Pole Sport (strona pobrania) | https://posaworld.org/download/posa-pole-sport-code-of-points-2025 | plik > 10 MB, nie przeczytano |
| S3 | POSA – Pole Art Rules & Regulations (PDF, 2019) | https://www.posaworld.org/wp-content/uploads/2019/02/Pole-Art-Rules_nw.pdf | otwarte, przeczytane |
| S4 | IPSF – ULTRA Pole Championships Rules & Regulations 2022/2023 (PDF hostowany przez American Pole League) | https://www.americanpoleleague.org/_files/ugd/de8bfb_ba90ccf63e5a4673bd6b96b6b0c65f02.pdf | otwarte, przeczytane |
| S5 | IPSF – kursy sędziowskie (What is pole judging, Level 3 Head Judge) | https://www.polesports.org/courses/what-is-pole-judging/ ; https://www.polesports.org/courses/level-3-head-judge/ | otwarte |
| S6 | IPSF – wyniki mistrzostw świata 2023 | https://www.polesports.org/world-pole-aerial/world-pole-results-ranking/results-2023/ | otwarte |
| S7 | Wikipedia – International Pole Sports Federation | https://en.wikipedia.org/wiki/International_Pole_Sports_Federation | fragment wyszukiwania |
| S8 | Shoe Leather Magazine – relacja z PSO Northeast Competition 2021 | https://shoeleathermagazine.com/2022/?p=22 | otwarte |
| S9 | Regulamin zawodów Poledanceholic Rokietnica (dokument Google, wersja 2025) | https://docs.google.com/document/d/1APMjcphe8FNdWLdC7yc1_MBYrgxwgWD2/export?format=pdf | otwarte, przeczytane |
| S10 | scoring.dance – funkcje | https://scoring.dance/features | otwarte |
| S11 | DanceComp Genie – produkty, rejestracja online | https://dancecompgenie.com/Products_Online_Registration.htm | otwarte |
| S12 | DanceComp Genie – zawody wirtualne | https://dancecompgenie.com/Products_Virtual_Competitions.htm | fragment wyszukiwania |
| S13 | CompetitionSuite – Tabulation with the Tablet App | https://help.competitionsuite.com/article/15-tabulation-with-the-tablet-app | otwarte |
| S14 | Capterra – LiveJudge | https://www.capterra.co.uk/software/1085599/LiveJudge | fragment wyszukiwania |
| S15 | GetApp – LiveJudge | https://www.getapp.com/contest-software/a/livejudge | 403, fragment wyszukiwania |
| S16 | mwm.ai – IDANCE计分 | https://mwm.ai/apps/idance/1599993978 | fragment wyszukiwania |
| S17 | App Store – ALL10 Battle App | https://apps.apple.com/mx/app/all10-battle-app/id6749247349 | 404 przy pobraniu, fragment wyszukiwania |
| S18 | Kscore – About | https://kscore.ca/about | otwarte |
| S19 | Kscore – Live results | https://live.kscore.ca/ | fragment wyszukiwania |
| S20 | Capterra – ProScore | https://www.capterra.com/p/172463/ProScore/ | fragment wyszukiwania |
| S21 | USA Gymnastics – instrukcja myUSAGym (publikacja wyników na żywo) | https://members.usagym.org/PDFs/Member%20Services/Sanction/myusagym_instructions.pdf | fragment wyszukiwania |
| S22 | Wikipedia – ISU Judging System | https://en.wikipedia.org/wiki/ISU_Judging_System | otwarte |
| S23 | WDSF – Judging System 2.0 (ogłoszenie) | https://worlddancesport.org/News/WDSF-Judging-System-2.0-1373 | otwarte |
| S24 | WDSF – Judging System 2 (dokumenty edukacyjne) | https://www.worlddancesport.org/Rule/Official/Education/Judging-System-2 | otwarte (lista dokumentów) |
| S25 | Competit.pl – strona główna i cennik | https://competit.pl/ | otwarte |
| S26 | Varsity Spirit – United Scoring Partners | https://varsity.com/?p=4577095 | otwarte |
| S27 | Wyniki wyszukiwania: formularze zgłoszeń na zawody pole (Tally, International Pole Championship) | https://tally.so/r/A7bk6z ; https://en.wikipedia.org/wiki/International_Pole_Championship | fragment wyszukiwania |
| S28 | Gitnux – Top 10 Best Dance Competition Software 2026 (źródło wtórne) | https://gitnux.org/best/dance-competition-software/ | fragment wyszukiwania |
| S29 | Easy Comp – zrzuty ekranu | https://easycompsoftware.co.uk/screenshots.php | fragment wyszukiwania |
| S30 | Discover MNI – Talypso (konkurs calypso, Montserrat) | https://discovermni.com/2019/12/09/15-heading-for-montserrats-calypso-semi-finals/ | fragment wyszukiwania |
| S31 | Competit.pl – regulamin Pucharu Polski ADA (PDF) | https://competit.pl/docs/8957-regulamin.pdf | 404 przy pobraniu, fragment wyszukiwania |
| S32 | USA Gymnastics – Gymnastics 101: scoring; NBC Olympics – jak liczona jest punktacja | https://members.usagym.org/pages/gymnastics101/women/scoring.html ; https://nbcolympics.com/post/8551 | fragment wyszukiwania |
| S33 | Westword – relacja z Pole Theatre USA | https://www.westword.com/arts-culture/pole-theatre-usa-competition-shows-off-the-art-of-a-misunderstood-sport-6708169/ | fragment wyszukiwania |
| S34 | RODO art. 8 (standardyprawa.pl); money.pl – wiek zgody 16 lat w Polsce | https://standardyprawa.pl/akt/188/art/23809 ; https://www.money.pl/gospodarka/wiadomosci/artykul/zgoda-na-przetwarzanie-danych-osobowych,53,0,2404149.html | fragment wyszukiwania |
| S35 | wroclaw.pl – Mistrzostwa Polski Pole Sport (POSA i IPSF w Polsce) | https://www.wroclaw.pl/sport/centrum-kultury-wroclaw-mistrzostwa-polski-pole-sport | fragment wyszukiwania |

**Czego nie udało się zweryfikować:** aktualnego (2025/2026) Code of Points IPSF dla Pole Sports (strona IPSF nie udostępnia go publicznie, a dostępne kopie są nieoficjalne i chronione prawem autorskim), pełnej treści POSA CoP 2025 (plik za duży do pobrania), regulaminu Pucharu Polski ADA (404), cenników DanceComp Genie, scoring.dance i Kscore, działania offline w DanceComp Genie, Kscore i LiveJudge, istnienia narzędzi „Calypso (WDSF)”, „iJudge” i „Dance Competition Manager”.
