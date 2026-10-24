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
    else cb(new Error('Upload a PNG, JPG, or WEBP file.'));
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
    if (err) return res.status(400).json({ error: err.message || 'Could not upload the file.' });
    try {
      if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI is not configured. Add OPENAI_API_KEY in the Render environment settings.' });
      if (!req.file) return res.status(400).json({ error: 'Upload a chart image.' });
      const instrument = String(req.body.instrument || 'Not provided').slice(0, 100);
      const timeframe = String(req.body.timeframe || 'Not provided').slice(0, 50);
      const question = String(req.body.question || '').slice(0, 1200);
      const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const prompt = `You are ChartMentor AI, an educational technical analysis assistant. Respond in English. Analyze only information visible in the uploaded image. Do not invent prices, indicators, timeframes, or patterns. If the chart is unreadable or does not support a scenario, choose WAIT. BUY and SELL are possible educational scenarios only, never instructions to trade.

Instrument: ${instrument}
Timeframe: ${timeframe}
User question: ${question || 'None'}

Return data matching the JSON schema. signal: BUY for a possible bullish scenario, SELL for a bearish scenario, WAIT when there is no reliable edge or the image is insufficient. score rates the quality/completeness of evidence from 0-100; it is NEVER the probability of profit. risk rates interpretive uncertainty, not market risk calculated from data. The entry, stop_loss, take_profit_1, take_profit_2, and reward_risk fields must contain a short level/description or exactly "Cannot be reliably determined from this image". Never guess prices. Give specific levels only when the scale and levels are legible. If there is no basis for levels, do not force them. Do not present this as a current market signal; you do not have access to live market quotes.

In rationale, explain the scenario in 2-4 sentences. invalidation describes what would weaken or invalidate the interpretation. Write analysis as a clear, detailed English explanation with headings: What the chart shows; Trend and structure; Possible patterns; Support and resistance; Bullish scenario; Bearish scenario; A lesson for beginners; Image limitations; A review question. Clearly distinguish observations from hypotheses. State that this is educational material, not investment advice.`;
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
      catch { return res.status(502).json({ error: 'AI returned an invalid analysis format. Please try again.' }); }
      if (!['BUY', 'SELL', 'WAIT'].includes(result.signal)) result.signal = 'WAIT';
      if (!Number.isInteger(result.score)) result.score = 0;
      res.json({ ...result, analysis: result.analysis || 'No detailed analysis provided.' });
    } catch (e) {
      console.error('Analysis request failed:', e?.status || '', e?.message || 'unknown error');
      if (e?.status === 401) return res.status(502).json({ error: 'The API key was rejected. Check OPENAI_API_KEY in the Render settings.' });
      if (e?.status === 429) return res.status(429).json({ error: 'API limit reached. Check your OpenAI API billing and limits.' });
      if (e?.status === 400) return res.status(400).json({ error: 'Could not process the image. Try uploading a clearer PNG, JPG, or WEBP file.' });
      res.status(500).json({ error: 'A problem occurred during analysis. Please try again shortly.' });
    }
  });
});

app.use((err, _req, res, _next) => {
  console.error('Request error:', err.message);
  res.status(400).json({ error: err.message || 'Invalid request.' });
});

app.listen(PORT, () => console.log(`ChartMentor AI is running on port ${PORT}`));
