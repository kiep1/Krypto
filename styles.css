require('dotenv').config();
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false }));

// Expose only the files the browser needs, not server.js, .env, or package files.
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/styles.css', (_req, res) => res.sendFile(path.join(__dirname, 'styles.css')));
app.get('/app.js', (_req, res) => res.sendFile(path.join(__dirname, 'app.js')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpeg|webp)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('PrzeÅlij plik PNG, JPG lub WEBP.'));
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, aiConfigured: Boolean(process.env.OPENAI_API_KEY) }));

const resultSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    signal: { type: 'string', enum: ['BUY', 'SELL', 'WAIT'] },
    score: { type: 'integer', minimum: 0, maximum: 100 },
    risk: { type: 'string', enum: ['NISKIE', 'UMIARKOWANE', 'WYSOKIE', 'NIEZNANE'] },
    risk_reason: { type: 'string' },
    entry: { type: 'string' },
    stop_loss: { type: 'string' },
    take_profit_1: { type: 'string' },
    take_profit_2: { type: 'string' },
    reward_risk: { type: 'string' },
    rationale: { type: 'string' },
    invalidation: { type: 'string' },
    analysis: { type: 'string' }
  },
  required: ['signal','score','risk','risk_reason','entry','stop_loss','take_profit_1','take_profit_2','reward_risk','rationale','invalidation','analysis']
};

app.post('/api/analyze', (req, res) => {
  upload.single('chart')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Nie udaÅo siÄ przesÅaÄ pliku.' });
    try {
      if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI nie jest skonfigurowana. Dodaj OPENAI_API_KEY w ustawieniach Årodowiska Render.' });
      if (!req.file) return res.status(400).json({ error: 'Dodaj zdjÄcie wykresu.' });
      const instrument = String(req.body.instrument || 'Nie podano').slice(0, 100);
      const timeframe = String(req.body.timeframe || 'Nie podano').slice(0, 50);
      const question = String(req.body.question || '').slice(0, 1200);
      const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const prompt = `JesteÅ ChartMentor AI, edukacyjnym asystentem analizy technicznej. Odpowiadaj po polsku. Analizuj tylko informacje widoczne na przesÅanym obrazie. Nie wymyÅlaj cen, wskaÅºnikÃ³w, interwaÅÃ³w ani formacji. JeÅli wykres jest nieczytelny lub nie daje podstaw do scenariusza, wybierz WAIT. BUY i SELL oznaczajÄ wyÅÄcznie moÅ¼liwy scenariusz edukacyjny, nie polecenie zawarcia transakcji.

Instrument: ${instrument}
InterwaÅ: ${timeframe}
Pytanie uÅ¼ytkownika: ${question || 'Brak'}

ZwrÃ³Ä dane zgodne ze schematem JSON. signal: BUY dla moÅ¼liwego scenariusza wzrostowego, SELL dla spadkowego, WAIT gdy brak wiarygodnej przewagi lub obraz jest niewystarczajÄcy. score to jakoÅÄ/kompletnoÅÄ przesÅanek w skali 0-100, NIGDY prawdopodobieÅstwo zysku. risk to ocena ryzyka interpretacji, nie ryzyka rynkowego wyliczonego z danych. Pola entry, stop_loss, take_profit_1, take_profit_2 i reward_risk majÄ zawieraÄ krÃ³tkie poziomy/opis albo dokÅadnie âNie da siÄ wiarygodnie okreÅliÄ z tego obrazuâ. Nigdy nie zgaduj cen. Konkretne poziomy podawaj tylko gdy skala i poziomy sÄ czytelne. JeÅli nie ma podstaw do okreÅlenia poziomÃ³w, nie twÃ³rz ich na siÅÄ. Nie przedstawiaj tego jako aktualnego sygnaÅu rynkowego â nie masz dostÄpu do bieÅ¼Äcych notowaÅ.

W rationale uzasadnij scenariusz w 2-4 zdaniach. invalidation opisuje, co osÅabiÅoby/zanegowaÅo interpretacjÄ. analysis to szczegÃ³Åowa, czytelna analiza w jÄzyku polskim z nagÅÃ³wkami: Co widaÄ na wykresie; Trend i struktura; MoÅ¼liwe formacje; Wsparcia i opory; Scenariusz wzrostowy; Scenariusz spadkowy; Lekcja dla poczÄtkujÄcego; Ograniczenia obrazu; Pytanie kontrolne. WyraÅºnie odrÃ³Å¼niaj obserwacje od hipotez. Dodaj, Å¼e to materiaÅ edukacyjny, a nie rekomendacja inwestycyjna.`;
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: [{ role: 'user', content: [
          { type: 'input_text', text: prompt },
          { type: 'input_image', image_url: dataUrl, detail: 'high' }
        ] }],
        text: { format: { type: 'json_schema', name: 'chartmentor_analysis', strict: true, schema: resultSchema } },
        max_output_tokens: 2200
      });
      let result;
      try { result = JSON.parse(response.output_text || '{}'); }
      catch { return res.status(502).json({ error: 'AI zwrÃ³ciÅa nieprawidÅowy format analizy. SprÃ³buj ponownie.' }); }
      if (!['BUY', 'SELL', 'WAIT'].includes(result.signal)) result.signal = 'WAIT';
      if (!Number.isInteger(result.score)) result.score = 0;
      res.json({ ...result, analysis: result.analysis || 'Brak szczegÃ³Åowej analizy.' });
    } catch (e) {
      console.error('Analysis request failed:', e?.status || '', e?.message || 'unknown error');
      if (e?.status === 401) return res.status(502).json({ error: 'Klucz API zostaÅ odrzucony. SprawdÅº OPENAI_API_KEY w ustawieniach Render.' });
      if (e?.status === 429) return res.status(429).json({ error: 'Limit API zostaÅ osiÄgniÄty. SprawdÅº rozliczenia i limity OpenAI API.' });
      if (e?.status === 400) return res.status(400).json({ error: 'Nie udaÅo siÄ przetworzyÄ obrazu. SprÃ³buj przesÅaÄ wyraÅºniejszy plik PNG, JPG lub WEBP.' });
      res.status(500).json({ error: 'WystÄpiÅ problem podczas analizy. SprÃ³buj ponownie za chwilÄ.' });
    }
  });
});

app.use((err, _req, res, _next) => {
  console.error('Request error:', err.message);
  res.status(400).json({ error: err.message || 'NieprawidÅowe Å¼Ädanie.' });
});

app.listen(PORT, () => console.log(`ChartMentor AI dziaÅa na porcie ${PORT}`));
