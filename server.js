require('dotenv').config();
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '1mb' }));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpeg|webp)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Prześlij plik PNG, JPG lub WEBP.'));
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, aiConfigured: Boolean(process.env.OPENAI_API_KEY) }));

app.post('/api/analyze', (req, res, next) => {
  upload.single('chart')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Nie udało się przesłać pliku.' });
    try {
      if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI nie jest jeszcze skonfigurowana. Dodaj OPENAI_API_KEY w pliku .env na serwerze.' });
      if (!req.file) return res.status(400).json({ error: 'Dodaj zdjęcie wykresu.' });
      const instrument = String(req.body.instrument || 'Nie podano').slice(0, 100);
      const timeframe = String(req.body.timeframe || 'Nie podano').slice(0, 50);
      const question = String(req.body.question || '').slice(0, 1200);
      const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const prompt = `Jesteś ChartMentor AI — nauczycielem analizy technicznej i edukacji inwestycyjnej, nie doradcą finansowym. Odpowiadaj po polsku, jasno i ostrożnie. Analizuj wyłącznie to, co rzeczywiście da się odczytać z obrazu. Nie wymyślaj cen, interwałów, wskaźników ani formacji. Gdy obraz jest nieczytelny, powiedz to. Odróżniaj obserwacje od hipotez. Nie obiecuj zysków i nie wydawaj kategorycznych poleceń kupna/sprzedaży. Wyjaśnij niepewność i ryzyko.\n\nInstrument podany przez użytkownika: ${instrument}\nInterwał podany przez użytkownika: ${timeframe}\nDodatkowe pytanie: ${question || 'Brak'}\n\nPrzygotuj odpowiedź w tych sekcjach:\n1. **Co widać na wykresie** — trend/struktura, tylko jeśli możliwe do oceny.\n2. **Możliwe formacje** — nazwa, przesłanki i poziom pewności; jeśli brak wiarygodnej formacji, napisz to.\n3. **Potencjalne wsparcia i opory** — opisowo; podawaj konkretne ceny tylko wtedy, gdy są czytelne.\n4. **Możliwe scenariusze** — warunki, które mogłyby potwierdzić lub osłabić każdą interpretację; bez prognozowania pewnego wyniku.\n5. **Lekcja dla początkującego** — wytłumacz jedną lub dwie ważne koncepcje.\n6. **Czego nie da się ustalić z samego zdjęcia** — np. dokładne dane OHLC, wolumen, aktualność danych.\n7. **Pytanie kontrolne** — jedno pytanie, które pomoże użytkownikowi się uczyć.\nNa końcu dodaj krótką informację, że to materiał edukacyjny, nie rekomendacja inwestycyjna.`;
      const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: [{ role: 'user', content: [
          { type: 'input_text', text: prompt },
          { type: 'input_image', image_url: dataUrl, detail: 'high' }
        ] }],
        max_output_tokens: 1400
      });
      res.json({ analysis: response.output_text || 'Nie udało się wygenerować analizy. Spróbuj ponownie.' });
    } catch (e) {
      console.error('Analysis request failed:', e?.status || '', e?.message || 'unknown error');
      if (e?.status === 401) return res.status(502).json({ error: 'Klucz API został odrzucony. Sprawdź konfigurację OPENAI_API_KEY.' });
      if (e?.status === 429) return res.status(429).json({ error: 'Limit API został osiągnięty. Sprawdź limity i rozliczenia projektu API.' });
      res.status(500).json({ error: 'Wystąpił problem podczas analizy. Spróbuj ponownie za chwilę.' });
    }
  });
});

app.use((err, _req, res, _next) => {
  console.error('Request error:', err.message);
  res.status(400).json({ error: err.message || 'Nieprawidłowe żądanie.' });
});

app.listen(PORT, () => console.log(`ChartMentor AI działa na http://localhost:${PORT}`));
