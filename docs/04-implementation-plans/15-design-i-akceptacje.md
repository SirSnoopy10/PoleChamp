# EP-15 – Design i akceptacje

> Dokument: `04-implementation-plans/15-design-i-akceptacje.md` · Tech Lead (Agent 2) · 23.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md)

Praca projektanta: akceptacja ekranów i odstępstw poza designem (Q-08, w tym propozycje TL: nakładka orientacji, pigułka „Nierozegrana”, ostrzeżenia zakończenia turnieju, ponowne użycie tabletu), zasoby graficzne i zatwierdzenie wzorców regresji wizualnej (NFR-210). IMP-650 powinien odbyć się w pierwszych 2 tygodniach projektu – blokuje DoR ekranów poza designem.

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 4 | 42 h | MOB 12 · DESIGN 30 |


## Zadania

### IMP-650 – Akceptacja ekranów poza designem (Q-08)
- **Epik / obszar:** EP-15 Design i akceptacje | **Rola:** DESIGN
- **Cel:** Projektant i PO akceptują (lub poprawiają) wszystkie ekrany i elementy zaproponowane poza designem, zanim zespół je zaimplementuje.
- **Zakres:** Przegląd SCR-SYS-01, SCR-ORG-13…22, SCR-JDG-06…10, nakładki orientacji, pigułki „Nierozegrana”, ostrzeżeń SCR-ORG-04, stanu „Turniej zakończony” w SCR-JDG-01, jasnego PDF i karty QR, pomocniczej skali odstępów; makiety w narzędziu projektanta; **Poza zakresem:** –
- **Zależności:** brak
- **Odwołania:** Q-08, TL-23, TL-33, TL-47, TL-48, SCR-ORG-13, SCR-JDG-06, [TC-DESIGN-021](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-021)
- **Kroki:**
  1. Przygotuj makiety w narzędziu projektanta dla SCR-SYS-01, SCR-ORG-13…22 i SCR-JDG-06…10 na podstawie specyfikacji 05/06 w stylu Nocturne.
  2. Dodaj makiety elementów: nakładka orientacji (TL-23), pigułka „Nierozegrana” (TL-33), ostrzeżenia SCR-ORG-04 (TL-48), stan „Turniej zakończony” w SCR-JDG-01 (TL-47), pigułka synchronizacji, jasny PDF, karta QR, nowe teksty toastów.
  3. Przeprowadź warsztat 2 h z PO i Tech Leadem: decyzje akceptuj / popraw / odrzuć dla każdego ekranu (Q-08).
  4. Zapisz decyzje i poprawki jako listę zmian z odwołaniami do SCR i tekstów i18n dla IMP-651.
  5. Przekaż decyzje i pliki zespołowi (link w zadaniu); zaktualizuj specyfikację ekranów, jeśli zmienia się tekst lub układ.
- **Definition of Done:**
  - [ ] Lista decyzji i zmian; TC-DESIGN-021 (część projektanta)
- **Szacunek:** 16 h (XL) | **Ryzyko:** średnie

### IMP-651 – Wdrożenie poprawek projektanta do ekranów poza designem
- **Epik / obszar:** EP-15 Design i akceptacje | **Rola:** MOB
- **Cel:** Ekrany spoza designu wyglądają i działają tak, jak zaakceptował projektant, a regresja wizualna ma zaktualizowane wzorce.
- **Zakres:** Poprawki wynikające z IMP-650 w komponentach i ekranach (bufor); **Poza zakresem:** –
- **Zależności:** [IMP-650](#imp-650--akceptacja-ekranów-poza-designem-q-08), [IMP-278](07-mobile-ekrany-organizatora.md#imp-278--tryb-offline-organizatora-na-wszystkich-ekranach), [IMP-318](08-mobile-ekrany-sedziego.md#imp-318--scr-jdg-10--urządzenie-odłączone-i-eksport-niewysłanych)
- **Odwołania:** Q-08, NFR-210, [TC-DESIGN-021](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-021), [TC-DESIGN-022](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-022)
- **Kroki:**
  1. Wprowadź poprawki z listy IMP-650 w komponentach bazowych (`src/ui/**`) i tokenach, jeśli dotyczą wielu ekranów.
  2. Wprowadź poprawki w ekranach (`features/auth`, `features/judges`, `features/devices`, `features/account`, `features/rejected`, `features/pairing`, `features/sync`, `features/judge/RevokedScreen.tsx`).
  3. Zaktualizuj teksty i18n zmienione przez projektanta w `packages/i18n/locales/pl/*` i `binding-texts.json` (z aktualizacją specyfikacji przez PM).
  4. Zaktualizuj przypadki DevCatalog i wzorce regresji wizualnej zmienionych ekranów (z akceptacją projektanta – IMP-653).
  5. Dopisz lub uruchom przypadki TC-DESIGN-021, TC-DESIGN-022 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-651: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-DESIGN-021, TC-DESIGN-022 zielone
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 12 h (L) | **Ryzyko:** średnie

### IMP-652 – Ikona aplikacji, splash statyczny, materiały do sklepów
- **Epik / obszar:** EP-15 Design i akceptacje | **Rola:** DESIGN
- **Cel:** Aplikacja ma docelową ikonę, natywny ekran startowy i materiały graficzne do sklepów zgodne z marką PoleChamp.
- **Zakres:** Ikona (iOS/Android adaptacyjna), statyczny ekran startowy natywny (przed JS), zrzuty sklepów (telefon, tablet); **Poza zakresem:** –
- **Zależności:** brak
- **Odwołania:** ADR-001
- **Kroki:**
  1. Zaprojektuj ikonę aplikacji (iOS 1024×1024 bez przezroczystości, Android adaptacyjna: warstwa pierwszoplanowa i tło, wersja monochromatyczna Android 13+).
  2. Przygotuj statyczny natywny ekran startowy (tło `bg`, logo `trophy`) spójny z pierwszą klatką animowanego splasha.
  3. Przygotuj grafiki sklepów (feature graphic Google Play 1024×500, tła zrzutów) zgodne z Nocturne.
  4. Dostarcz pliki do `apps/mobile/assets/` i konfigurację `app.config.ts` (`icon`, `adaptiveIcon`, `splash`).
  5. Przekaż decyzje i pliki zespołowi (link w zadaniu); zaktualizuj specyfikację ekranów, jeśli zmienia się tekst lub układ.
- **Definition of Done:**
  - [ ] Zasoby w repozytorium, akceptacja PO
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-653 – Akceptacja wzorców regresji wizualnej
- **Epik / obszar:** EP-15 Design i akceptacje | **Rola:** DESIGN
- **Cel:** Wzorce regresji wizualnej są zatwierdzone przez projektanta, więc kolejne różnice w zrzutach oznaczają realne zmiany do decyzji.
- **Zakres:** Przegląd zrzutów z IMP-459 vs prototyp (odchylenia ≤ 2 dp), zatwierdzenie wzorców; **Poza zakresem:** –
- **Zależności:** [IMP-459](11-qa-i-automatyzacja-testow.md#imp-459--regresja-wizualna-zrzuty--odiff)
- **Odwołania:** NFR-210, [TC-DESIGN-016](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-016)…020
- **Kroki:**
  1. Przejrzyj zrzuty z pipeline IMP-459 (DevCatalog i ekrany SCR, telefon i tablet) obok prototypu `design/PoleChamp v2.dc.html`.
  2. Oznacz odchylenia powyżej 2 dp, różnice kolorów i typografii jako defekty z odwołaniem do zrzutu i komponentu.
  3. Zatwierdź wzorce bez odchyleń (etykieta `visual-approved` w PR wzorców) i zapisz listę wyjątków zaakceptowanych świadomie.
  4. Ustal z QA rytm przeglądu nowych wzorców (przy każdej zmianie UI ekranów z designu).
  5. Przekaż decyzje i pliki zespołowi (link w zadaniu); zaktualizuj specyfikację ekranów, jeśli zmienia się tekst lub układ.
- **Definition of Done:**
  - [ ] Wzorce zatwierdzone; TC-DESIGN-016…020 bazowe
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

