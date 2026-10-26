require('dotenv').config();
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const path = require('path');
const fs = require('node:fs');
const { LESSON_BY_SLUG } = require('./lessons');
const membership = require('./membership');

const app = express();
const PORT = process.env.PORT || 3000;
app.disable('x-powered-by');
membership.registerWebhook(app);
membership.configureAuthentication(app);
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use('/api/', rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false }));
app.use('/api/', (_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });

// Keep the public route allowlist explicit so server code and environment files stay private.
const pageRoutes = new Map([
  ['/', 'index.html'],
  ['/about', 'about.html'],
  ['/how-it-works', 'how-it-works.html'],
  ['/learn', 'learn.html'],
  ['/lessons', 'lessons.html'],
  ['/account', 'account.html'],
  ['/journal', 'journal.html'],
  ['/privacy', 'privacy.html'],
  ['/learn/technical-analysis', 'guides/technical-analysis.html'],
  ['/learn/risk-management', 'guides/risk-management.html'],
  ['/learn/support-and-resistance', 'guides/support-and-resistance.html'],
  ['/learn/chart-patterns', 'guides/chart-patterns.html'],
  ['/faq', 'faq.html'],
  ['/pricing', 'pricing.html'],
  ['/premium', 'premium.html']
]);
app.use((req, res, next) => {
  const normalizedPath = req.path.replace(/\/+$/, '') || '/';
  if (normalizedPath !== req.path && pageRoutes.has(normalizedPath)) {
    return res.redirect(301, normalizedPath + req.originalUrl.slice(req.path.length));
  }
  next();
});
app.get('/index.html', (_req, res) => res.redirect(301, '/'));
app.get([...pageRoutes.keys()], (req, res, next) => {
  const route = req.path.replace(/\/+$/, '') || '/';
  const file = pageRoutes.get(route);
  if (!file) return next();
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.sendFile(path.join(__dirname, file), (err) => { if (err) next(err); });
});
app.get('/styles.css', (_req, res) => res.sendFile(path.join(__dirname, 'styles.css'), { maxAge: '1d' }));
app.get('/app.js', (_req, res) => res.sendFile(path.join(__dirname, 'app.js'), { maxAge: '1d' }));
app.get('/member.js', (_req, res) => res.sendFile(path.join(__dirname, 'member.js'), { maxAge: '1d' }));
app.get('/lessons-page.js', (_req, res) => res.sendFile(path.join(__dirname, 'lessons-page.js'), { maxAge: '1d' }));
app.get('/lesson-page.js', (_req, res) => res.sendFile(path.join(__dirname, 'lesson-page.js'), { maxAge: '1d' }));
app.get('/account.js', (_req, res) => res.sendFile(path.join(__dirname, 'account.js'), { maxAge: '1d' }));
app.get('/journal.js', (_req, res) => res.sendFile(path.join(__dirname, 'journal.js'), { maxAge: '1d' }));
app.get('/favicon.svg', (_req, res) => res.sendFile(path.join(__dirname, 'favicon.svg'), { maxAge: '7d' }));
app.get('/robots.txt', (_req, res) => res.type('text/plain').sendFile(path.join(__dirname, 'robots.txt')));
app.get('/sitemap.xml', (_req, res) => res.type('application/xml').sendFile(path.join(__dirname, 'sitemap.xml')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpeg|webp)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Upload a PNG, JPG, or WEBP file.'));
  }
});

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  aiConfigured: Boolean(process.env.OPENAI_API_KEY),
  accountsEnabled: membership.isEnabled(),
  paymentsEnabled: membership.hasPayments(),
  databaseReady: membership.isDatabaseReady()
}));

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function renderLessonMarkdown(markdown) {
  const blocks = String(markdown || '').trim().split(/\n{2,}/);
  return blocks.map((block) => {
    const lines = block.split('\n');
    const heading = lines[0].match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = Math.min(4, heading[1].length + 1);
      return `<h${level}>${escapeHtml(heading[2])}</h${level}>`;
    }
    if (lines.every((line) => /^\d+\.\s/.test(line))) return `<ol>${lines.map((line) => `<li>${escapeHtml(line.replace(/^\d+\.\s/, ''))}</li>`).join('')}</ol>`;
    if (lines.every((line) => /^-\s/.test(line))) return `<ul>${lines.map((line) => `<li>${escapeHtml(line.replace(/^-\s/, ''))}</li>`).join('')}</ul>`;
    return `<p>${lines.map(escapeHtml).join('<br>')}</p>`;
  }).join('\n');
}

function injectTemplate(template, values) {
  return template.replace(/\{\{([a-zA-Z]+)\}\}/g, (_match, key) => values[key] ?? '');
}

app.get('/lessons/:slug', async (req, res, next) => {
  const lesson = LESSON_BY_SLUG.get(req.params.slug);
  if (!lesson) return next();
  try {
    let visibleLesson = lesson;
    const activePremium = membership.premiumEnabled(req.user);
    const locked = lesson.access === 'premium' && !activePremium;
    const memberContentUnavailable = lesson.access === 'premium' && activePremium && !membership.getPrivateLesson(lesson.slug);
    if (lesson.access === 'premium' && activePremium && !memberContentUnavailable) {
      visibleLesson = membership.getPrivateLesson(lesson.slug);
    }
    const body = memberContentUnavailable
      ? '<div class="lesson-lock"><p class="page-label">PREMIUM CONTENT</p><h2>Lesson content is temporarily unavailable</h2><p>Please contact support before continuing your subscription.</p></div>'
      : locked
      ? `<div class="lesson-lock"><p class="page-label">PREMIUM LESSON</p><h2>Continue this lesson with Premium</h2><p>${escapeHtml(lesson.summary)}</p><a class="button primary" href="/pricing">See Premium access</a></div>`
      : renderLessonMarkdown(visibleLesson.content);
    const tutor = locked || memberContentUnavailable ? '' : `<section class="tutor-panel"><p class="page-label">LESSON TUTOR</p><h2>Ask a question about this lesson</h2><p>Get an explanation of the lesson concepts. The tutor does not give personal trading advice.</p><form id="tutor-form"><label class="field-label" for="tutor-question">Your question</label><textarea id="tutor-question" rows="3" maxlength="1200" required placeholder="Ask about a term or idea from this lesson"></textarea><button class="button secondary" type="submit">Ask the lesson tutor</button></form><p id="tutor-status" aria-live="polite"></p><div id="tutor-answer" class="analysis-body"></div></section>`;
    const template = fs.readFileSync(path.join(__dirname, 'lesson.html'), 'utf8');
    const canonical = `https://www.candletutor.com/lessons/${lesson.slug}`;
    const page = injectTemplate(template, {
      title: escapeHtml(`${lesson.title} | ChartMentor AI`),
      description: escapeHtml(lesson.summary),
      canonical,
      lessonTitle: escapeHtml(lesson.title),
      lessonSlug: lesson.slug,
      summary: escapeHtml(lesson.summary),
      lessonBody: body,
      tutor,
      schema: JSON.stringify({ '@context': 'https://schema.org', '@type': 'LearningResource', name: lesson.title, description: lesson.summary, inLanguage: 'en', isAccessibleForFree: lesson.access === 'free', url: canonical, provider: { '@type': 'Organization', name: 'ChartMentor AI', url: 'https://www.candletutor.com/' } }).replace(/</g, '\\u003c')
    });
    res.setHeader('Cache-Control', lesson.access === 'premium' ? 'private, no-store' : 'public, max-age=0, must-revalidate');
    res.type('html').send(page);
  } catch (error) { next(error); }
});

const resultSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    signal: { type: 'string', enum: ['BUY', 'SELL', 'WAIT'] },
    score: { type: 'integer', minimum: 0, maximum: 100 },
    risk: { type: 'string', enum: ['LOW', 'MODERATE', 'HIGH', 'UNKNOWN'] },
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
    let reservation = null;
    try {
      membership.assertSameOrigin(req);
      reservation = await membership.reserveAnalysis(req);
      if (!process.env.OPENAI_API_KEY) throw Object.assign(new Error('AI is not configured. Add OPENAI_API_KEY in the Render environment settings.'), { status: 503 });
      if (!req.file) throw Object.assign(new Error('Upload a chart image.'), { status: 400 });
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
      catch { throw Object.assign(new Error('AI returned an invalid analysis format. Please try again.'), { status: 502 }); }
      if (!['BUY', 'SELL', 'WAIT'].includes(result.signal)) result.signal = 'WAIT';
      if (!Number.isInteger(result.score)) result.score = 0;
      const normalizedResult = { ...result, analysis: result.analysis || 'No detailed analysis provided.' };
      const usage = reservation ? { used: reservation.used, limit: reservation.limit, remaining: Math.max(0, reservation.limit - reservation.used), resetsAt: '00:00 UTC' } : null;
      reservation = null;
      res.setHeader('Cache-Control', 'private, no-store');
      res.json({ ...normalizedResult, usage });
    } catch (e) {
      if (reservation) await membership.releaseAnalysis(reservation);
      console.error('Analysis request failed:', e?.status || '', e?.message || 'unknown error');
      if (e?.code === 'AUTH_REQUIRED' || e?.code === 'DAILY_LIMIT' || e?.code === 'FEATURES_UNAVAILABLE') return res.status(e.status).json({ error: e.message, code: e.code });
      if (e?.status === 403) return res.status(403).json({ error: e.message });
      if (e?.status === 503) return res.status(503).json({ error: e.message });
      if (e?.status === 401) return res.status(502).json({ error: 'The API key was rejected. Check OPENAI_API_KEY in the Render settings.' });
      if (e?.status === 429) return res.status(429).json({ error: 'API limit reached. Check your OpenAI API billing and limits.' });
      if (e?.status === 400) return res.status(400).json({ error: 'Could not process the image. Try uploading a clearer PNG, JPG, or WEBP file.' });
      if (e?.status === 502) return res.status(502).json({ error: e.message });
      res.status(500).json({ error: 'A problem occurred during analysis. Please try again shortly.' });
    }
  });
});

membership.registerRoutes(app);
app.get('/auth/google', (_req, res) => res.status(503).send('Google sign-in is being configured.'));
app.get('/auth/google/callback', (_req, res) => res.status(503).send('Google sign-in is being configured.'));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found.' });
  res.status(404).sendFile(path.join(__dirname, '404.html'), (err) => { if (err) next(err); });
});

app.use((err, _req, res, _next) => {
  console.error('Request error:', err.message);
  res.status(400).json({ error: err.message || 'Invalid request.' });
});

membership.initializeDatabase()
  .then(() => app.listen(PORT, () => console.log(`ChartMentor AI is running on port ${PORT}`)))
  .catch((error) => {
    console.error('Database initialization failed; member features remain disabled:', error.message);
    app.listen(PORT, () => console.log(`ChartMentor AI is running on port ${PORT} without member features`));
  });
