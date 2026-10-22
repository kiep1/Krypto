# ChartMentor AI — MVP

Responsive Polish-language web app for educational chart analysis. Includes a landing page, chart upload/preview, optional instrument/timeframe/question fields, loading/error states, and a server-side OpenAI vision API route.

## Requirements
- Node.js 18+
- An OpenAI API key with API billing configured

## Run locally
1. Open a terminal in this folder.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env`.
4. Put a **newly created/rotated** API key in `.env` as `OPENAI_API_KEY=...`.
5. Start: `npm start`
6. Open `http://localhost:3000`.

Never put the API key in `public/`, frontend JavaScript, source control, or a mobile/browser client. The browser calls `/api/analyze`; the server calls OpenAI. Set API project spend limits and monitor usage before sharing the site publicly.

## What this MVP does / doesn't do
- Does: ask a vision-capable model to interpret a chart image and produce an educational explanation in Polish.
- Does not: fetch live market data, calculate technical indicators from OHLC data, have user accounts, save analysis history, or process payments. The demo chart on the landing page is illustrative only.
- AI output can be wrong. This is an educational prototype, not investment advice.

## Deployment
Deploy as a Node.js web service on a hosting provider that supports environment variables. Configure `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in the provider's secret/environment settings. Do not upload `.env`.
