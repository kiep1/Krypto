# ChartMentor AI

ChartMentor AI is an English-language trading-education site with image-based chart explanations, public learning guides, an 11-lesson course, Google accounts, a private analysis journal, a lesson Q&A tutor, and optional Stripe Premium billing.

## Local development

- Node.js 20 or newer
- OpenAI API key for chart analysis and tutor responses
- PostgreSQL, Google OAuth credentials, Stripe credentials, and the private Premium content key to enable membership features

Install dependencies with `npm install`, copy `.env.example` to `.env`, fill in the required values, and start with `npm start`. Open `http://localhost:3000`. Without a database and Google OAuth configuration, account, history, tutor, and billing features remain disabled.

Never commit `.env`, database URLs, OAuth credentials, OpenAI keys, Stripe secrets, or the Premium content key. See [MEMBERSHIP-SETUP.md](MEMBERSHIP-SETUP.md) for production setup.

## Membership behavior

- Free accounts receive 3 chart analyses and 5 lesson-tutor questions per UTC day, plus the first 3 structured lessons.
- Premium includes up to 30 chart analyses and 50 tutor questions per UTC day, plus all 11 lessons, for $9.99 USD per month.
- Signed-in analyses are stored with their original screenshot and report. Users can delete individual records or delete their account.
- Premium lesson bodies are encrypted in `premium-lessons.enc`. The decryption key is supplied separately and must be set as `PREMIUM_CONTENT_KEY` in the hosting environment.
- Premium access is granted only after the server verifies Stripe webhook events. A payment-link visit alone does not unlock content.

## Safety and limits

The analyzer does not use live prices or execute trades. Reports and lessons are educational, may be wrong, and are not personalized investment advice. Uploaded screenshots and tutor questions are sent to OpenAI for processing. Read the site's [privacy and data page](https://www.candletutor.com/privacy) before enabling account storage.
