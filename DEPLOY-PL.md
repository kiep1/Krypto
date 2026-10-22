# Publikacja ChartMentor AI (Render)

## Zanim zaczniesz
- Unieważnij klucz API, który wkleiłeś do czatu, i utwórz nowy w panelu OpenAI.
- Nie umieszczaj klucza w plikach projektu ani w repozytorium GitHub.
- Konto API musi mieć skonfigurowane rozliczenia i dostępny limit.

## Kroki
1. Zaloguj się lub załóż konto GitHub.
2. Utwórz nowe repozytorium, np. `chartmentor-ai`. Na początek możesz ustawić je jako Private.
3. Wgraj zawartość folderu `chartmentor-ai` do repozytorium. Nie wgrywaj pliku `.env` ani folderu `node_modules`.
4. Zaloguj się do Render i wybierz New + → Blueprint.
5. Połącz konto GitHub i wybierz repozytorium `chartmentor-ai`.
6. Render wykryje `render.yaml`. Przy zmiennej `OPENAI_API_KEY` kliknij ustawienie wartości i wklej NOWY klucz API bez cudzysłowów. Zapisz i wdroż.
7. Po zakończeniu otwórz adres `https://...onrender.com` podany przez Render.
8. Sprawdź `https://...onrender.com/api/health`. Oczekiwany wynik: `{"ok":true,"aiConfigured":true}`.
9. Prześlij testowe zdjęcie wykresu na stronie i sprawdź odpowiedź.

## Ważne
- Render Free może usypiać usługę po okresie bezczynności; pierwsze otwarcie może potrwać dłużej.
- Sprawdź aktualne warunki i limity darmowego hostingu w Render.
- Ustaw limit wydatków/alerty w OpenAI API. Darmowy hosting nie oznacza darmowych zapytań do modelu.
- To prototyp edukacyjny. Nie traktuj odpowiedzi jako porady inwestycyjnej.
